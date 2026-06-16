package store

import (
	"fmt"
	"time"
)

// IncomeStatement es el Estado de Resultados (formato Honduras).
// Todos los montos de ventas son NETOS de ISV (el ISV no es ingreso de la empresa).
type IncomeStatement struct {
	From string `json:"from"`
	To   string `json:"to"`

	VentasBrutas float64 `json:"ventas_brutas"`
	Descuentos   float64 `json:"descuentos"`
	VentasNetas  float64 `json:"ventas_netas"`

	CostoVentas   float64 `json:"costo_ventas"`
	UtilidadBruta float64 `json:"utilidad_bruta"`

	GastosVentas         float64 `json:"gastos_ventas"`
	GastosAdministrativos float64 `json:"gastos_administrativos"`
	GastosOperativos     float64 `json:"gastos_operativos"`
	UtilidadOperativa    float64 `json:"utilidad_operativa"`

	GastosFinancieros float64 `json:"gastos_financieros"`
	OtrosGastos       float64 `json:"otros_gastos"`

	UtilidadAntesISR float64 `json:"utilidad_antes_isr"`
	ISRRate          float64 `json:"isr_rate"`
	ISR              float64 `json:"isr"`
	UtilidadNeta     float64 `json:"utilidad_neta"`

	ISVCobrado  float64 `json:"isv_cobrado"`
	NumVentas   int     `json:"num_ventas"`
	MargenBruto float64 `json:"margen_bruto"`
	MargenNeto  float64 `json:"margen_neto"`
}

func (s *Store) IncomeStatement(from, to string) (IncomeStatement, error) {
	st := IncomeStatement{From: from, To: to, ISRRate: s.settingFloat("isr_rate", 25)}

	err := s.db.QueryRow(`SELECT
	    COALESCE(SUM(subtotal + discount_net),0),
	    COALESCE(SUM(discount_net),0),
	    COALESCE(SUM(subtotal),0),
	    COALESCE(SUM(cost_total),0),
	    COALESCE(SUM(isv),0),
	    COUNT(*)
	  FROM sales WHERE status='completada' AND date(sale_date) BETWEEN ? AND ?`, from, to).
		Scan(&st.VentasBrutas, &st.Descuentos, &st.VentasNetas, &st.CostoVentas, &st.ISVCobrado, &st.NumVentas)
	if err != nil {
		return st, err
	}

	rows, err := s.db.Query(`SELECT category, COALESCE(SUM(amount),0) FROM expenses
	  WHERE expense_date BETWEEN ? AND ? GROUP BY category`, from, to)
	if err != nil {
		return st, err
	}
	defer rows.Close()
	for rows.Next() {
		var cat string
		var amt float64
		if err := rows.Scan(&cat, &amt); err != nil {
			return st, err
		}
		switch cat {
		case "ventas":
			st.GastosVentas = amt
		case "administrativos":
			st.GastosAdministrativos = amt
		case "financieros":
			st.GastosFinancieros = amt
		default:
			st.OtrosGastos += amt
		}
	}
	if err := rows.Err(); err != nil {
		return st, err
	}

	st.UtilidadBruta = st.VentasNetas - st.CostoVentas
	st.GastosOperativos = st.GastosVentas + st.GastosAdministrativos
	st.UtilidadOperativa = st.UtilidadBruta - st.GastosOperativos
	st.UtilidadAntesISR = st.UtilidadOperativa - st.GastosFinancieros - st.OtrosGastos
	if st.UtilidadAntesISR > 0 {
		st.ISR = round2(st.UtilidadAntesISR * st.ISRRate / 100)
	}
	st.UtilidadNeta = round2(st.UtilidadAntesISR - st.ISR)
	if st.VentasNetas > 0 {
		st.MargenBruto = round2(st.UtilidadBruta / st.VentasNetas * 100)
		st.MargenNeto = round2(st.UtilidadNeta / st.VentasNetas * 100)
	}
	for _, p := range []*float64{&st.VentasBrutas, &st.Descuentos, &st.VentasNetas, &st.CostoVentas,
		&st.UtilidadBruta, &st.GastosOperativos, &st.UtilidadOperativa, &st.UtilidadAntesISR, &st.ISVCobrado} {
		*p = round2(*p)
	}
	return st, nil
}

type TopProduct struct {
	ProductID int64   `json:"product_id"`
	Name      string  `json:"name"`
	SKU       string  `json:"sku"`
	Qty       float64 `json:"qty"`
	Revenue   float64 `json:"revenue"` // neto de ISV
	Profit    float64 `json:"profit"`
}

func (s *Store) TopProducts(from, to string, limit int) ([]TopProduct, error) {
	if limit <= 0 {
		limit = 10
	}
	rows, err := s.db.Query(`SELECT i.product_id, p.name, p.sku,
	    SUM(i.qty), SUM(i.qty*i.unit_price), SUM(i.qty*(i.unit_price-i.unit_cost))
	  FROM sale_items i
	  JOIN sales v ON v.id=i.sale_id AND v.status='completada' AND date(v.sale_date) BETWEEN ? AND ?
	  JOIN products p ON p.id=i.product_id
	  GROUP BY i.product_id ORDER BY SUM(i.qty*i.unit_price) DESC LIMIT ?`, from, to, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []TopProduct{}
	for rows.Next() {
		var t TopProduct
		if err := rows.Scan(&t.ProductID, &t.Name, &t.SKU, &t.Qty, &t.Revenue, &t.Profit); err != nil {
			return nil, err
		}
		t.Revenue = round2(t.Revenue)
		t.Profit = round2(t.Profit)
		out = append(out, t)
	}
	return out, rows.Err()
}

type MonthPoint struct {
	Month   string  `json:"month"` // YYYY-MM
	Label   string  `json:"label"` // ene 25
	Ventas  float64 `json:"ventas"`
	Utilidad float64 `json:"utilidad"`
}

var monthNamesES = [...]string{"ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"}

// SalesSeries devuelve ventas netas y utilidad bruta por mes para los últimos n meses.
func (s *Store) SalesSeries(n int) ([]MonthPoint, error) {
	now := time.Now()
	points := make([]MonthPoint, 0, n)
	byMonth := map[string]*MonthPoint{}
	for i := n - 1; i >= 0; i-- {
		t := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local).AddDate(0, -i, 0)
		key := t.Format("2006-01")
		points = append(points, MonthPoint{Month: key, Label: fmt.Sprintf("%s %02d", monthNamesES[t.Month()-1], t.Year()%100)})
		byMonth[key] = &points[len(points)-1]
	}
	start := points[0].Month + "-01"
	rows, err := s.db.Query(`SELECT strftime('%Y-%m', sale_date), COALESCE(SUM(subtotal),0), COALESCE(SUM(subtotal-cost_total),0)
	  FROM sales WHERE status='completada' AND date(sale_date) >= ?
	  GROUP BY strftime('%Y-%m', sale_date)`, start)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var key string
		var v, u float64
		if err := rows.Scan(&key, &v, &u); err != nil {
			return nil, err
		}
		if p, ok := byMonth[key]; ok {
			p.Ventas = round2(v)
			p.Utilidad = round2(u)
		}
	}
	return points, rows.Err()
}

type Dashboard struct {
	Month           string       `json:"month"`
	VentasMes       float64      `json:"ventas_mes"`
	UtilidadBrutaMes float64     `json:"utilidad_bruta_mes"`
	GastosMes       float64      `json:"gastos_mes"`
	NumVentasMes    int          `json:"num_ventas_mes"`
	TicketPromedio  float64      `json:"ticket_promedio"`
	ISVCobradoMes   float64      `json:"isv_cobrado_mes"`
	ValorInventario float64      `json:"valor_inventario"`
	ProductosActivos int         `json:"productos_activos"`
	LowStockCount   int          `json:"low_stock_count"`
	Series          []MonthPoint `json:"series"`
	TopProducts     []TopProduct `json:"top_products"`
	LowStock        []Product    `json:"low_stock"`
	RecentSales     []Sale       `json:"recent_sales"`
}

func (s *Store) Dashboard() (Dashboard, error) {
	now := time.Now()
	first := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local).Format("2006-01-02")
	today := now.Format("2006-01-02")
	d := Dashboard{Month: now.Format("2006-01")}

	err := s.db.QueryRow(`SELECT COALESCE(SUM(subtotal),0), COALESCE(SUM(subtotal-cost_total),0),
	    COALESCE(SUM(isv),0), COUNT(*)
	  FROM sales WHERE status='completada' AND date(sale_date) BETWEEN ? AND ?`, first, today).
		Scan(&d.VentasMes, &d.UtilidadBrutaMes, &d.ISVCobradoMes, &d.NumVentasMes)
	if err != nil {
		return d, err
	}
	if d.NumVentasMes > 0 {
		d.TicketPromedio = round2(d.VentasMes / float64(d.NumVentasMes))
	}
	d.VentasMes = round2(d.VentasMes)
	d.UtilidadBrutaMes = round2(d.UtilidadBrutaMes)
	d.ISVCobradoMes = round2(d.ISVCobradoMes)

	if err := s.db.QueryRow(`SELECT COALESCE(SUM(amount),0) FROM expenses WHERE expense_date BETWEEN ? AND ?`, first, today).Scan(&d.GastosMes); err != nil {
		return d, err
	}
	d.GastosMes = round2(d.GastosMes)

	if d.ValorInventario, err = s.InventoryValue(); err != nil {
		return d, err
	}
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM products WHERE active=1`).Scan(&d.ProductosActivos); err != nil {
		return d, err
	}
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM products WHERE active=1 AND stock <= min_stock`).Scan(&d.LowStockCount); err != nil {
		return d, err
	}
	if d.Series, err = s.SalesSeries(12); err != nil {
		return d, err
	}
	if d.TopProducts, err = s.TopProducts(first, today, 5); err != nil {
		return d, err
	}
	if d.LowStock, err = s.ListProducts(ProductFilter{LowStock: true}); err != nil {
		return d, err
	}
	if len(d.LowStock) > 8 {
		d.LowStock = d.LowStock[:8]
	}
	if d.RecentSales, err = s.ListSales(SaleFilter{Limit: 8}); err != nil {
		return d, err
	}
	return d, nil
}

// MonthlySummary agrupa todo lo necesario para el "resumen del mes".
type MonthlySummary struct {
	Year             int             `json:"year"`
	Month            int             `json:"month"`
	Statement        IncomeStatement `json:"statement"`
	TicketPromedio   float64         `json:"ticket_promedio"`
	ComprasRecibidas float64         `json:"compras_recibidas"`
	NumCompras       int             `json:"num_compras"`
	TopProducts      []TopProduct    `json:"top_products"`
	ValorInventario  float64         `json:"valor_inventario"`
}

func (s *Store) MonthlySummary(year, month int) (MonthlySummary, error) {
	first := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
	last := first.AddDate(0, 1, -1)
	from, to := first.Format("2006-01-02"), last.Format("2006-01-02")

	ms := MonthlySummary{Year: year, Month: month}
	var err error
	if ms.Statement, err = s.IncomeStatement(from, to); err != nil {
		return ms, err
	}
	if ms.Statement.NumVentas > 0 {
		ms.TicketPromedio = round2(ms.Statement.VentasNetas / float64(ms.Statement.NumVentas))
	}
	err = s.db.QueryRow(`SELECT COUNT(*), COALESCE(SUM((SELECT SUM(qty*unit_cost) FROM purchase_order_items WHERE po_id=o.id)),0)
	  FROM purchase_orders o WHERE o.status='recibida' AND o.received_date BETWEEN ? AND ?`, from, to).
		Scan(&ms.NumCompras, &ms.ComprasRecibidas)
	if err != nil {
		return ms, err
	}
	ms.ComprasRecibidas = round2(ms.ComprasRecibidas)
	if ms.TopProducts, err = s.TopProducts(from, to, 10); err != nil {
		return ms, err
	}
	if ms.ValorInventario, err = s.InventoryValue(); err != nil {
		return ms, err
	}
	return ms, nil
}

// SalesReportRows: filas para exportar ventas de un período.
func (s *Store) SalesReportRows(from, to string) ([]Sale, error) {
	return s.ListSales(SaleFilter{From: from, To: to, Limit: 100000})
}
