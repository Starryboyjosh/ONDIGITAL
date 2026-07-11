package store

import (
	"fmt"
	"strings"
	"time"
)

// SeedReport summarizes what was loaded for demos.
type SeedReport struct {
	Forced     bool `json:"forced"`
	Categories int  `json:"categories"`
	Suppliers  int  `json:"suppliers"`
	Products   int  `json:"products"`
	Sales      int  `json:"sales"`
	Expenses   int  `json:"expenses"`
	LowStock   int  `json:"low_stock"`
}

// SeedDemo loads a full Honduras-style demo dataset for Vito / school demos.
// If force is false and products already exist, it returns an error without writing.
// If force is true, transactional demo tables are cleared first (settings kept, then company overwritten).
func (s *Store) SeedDemo(force bool) (SeedReport, error) {
	var n int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM products`).Scan(&n); err != nil {
		return SeedReport{}, err
	}
	if n > 0 && !force {
		return SeedReport{}, fmt.Errorf("ya hay %d productos; usa -seed-demo-force para reemplazar con datos de demo", n)
	}

	if force {
		if err := s.clearDemoTables(); err != nil {
			return SeedReport{}, err
		}
	}

	// Empresa demo (HN)
	_ = s.SetSettings(map[string]string{
		"company_name":       "Abarrotes El Progreso",
		"company_rtn":        "08019001234567",
		"company_address":    "Barrio El Centro, Tegucigalpa, F.M.",
		"company_phone":      "+504 2222-3344",
		"currency_symbol":    "L",
		"prices_include_isv": "1",
		"isv_rate_default":   "15",
		"demo_seeded":        "1",
	})

	// Categorías
	cats := []struct{ name, prefix string }{
		{"Abarrotes", "ABA"},
		{"Bebidas", "BEB"},
		{"Limpieza", "LIM"},
		{"Snacks", "SNK"},
	}
	catIDs := map[string]int64{}
	for _, c := range cats {
		// Reuse if name exists
		var id int64
		err := s.db.QueryRow(`SELECT id FROM categories WHERE name=?`, c.name).Scan(&id)
		if err != nil {
			created, cerr := s.CreateCategory(Category{Name: c.name, Prefix: c.prefix})
			if cerr != nil {
				return SeedReport{}, cerr
			}
			id = created.ID
		}
		catIDs[c.name] = id
	}

	// Proveedores
	supA, err := s.CreateSupplier(Supplier{
		Name: "Distribuidora del Valle", RTN: "08019009876543",
		ContactName: "María López", Phone: "+504 9876-5432",
		Email: "ventas@valle.hn", Address: "Comayagüela",
	})
	if err != nil {
		return SeedReport{}, err
	}
	supB, err := s.CreateSupplier(Supplier{
		Name: "Importadora Caribe SA", RTN: "05019001112233",
		ContactName: "Carlos Méndez", Phone: "+504 9456-1122",
		Email: "pedidos@caribe.hn", Address: "San Pedro Sula",
	})
	if err != nil {
		return SeedReport{}, err
	}
	idA, idB := supA.ID, supB.ID

	type pdef struct {
		sku, name, cat string
		sup            *int64
		cost, price    float64
		stock, min     float64
		isv            float64
	}
	prods := []pdef{
		// Stock saludable + alto movimiento
		{"ABA-001", "Arroz Premium 5 lb", "Abarrotes", &idA, 45, 68, 80, 20, 15},
		{"ABA-002", "Frijol rojo 2 lb", "Abarrotes", &idA, 28, 42, 60, 15, 15},
		{"ABA-003", "Aceite vegetal 1 L", "Abarrotes", &idA, 38, 55, 45, 12, 15},
		{"ABA-004", "Azúcar blanca 2 lb", "Abarrotes", &idA, 22, 34, 50, 15, 15},
		{"ABA-005", "Sal de mesa 400 g", "Abarrotes", &idA, 8, 14, 70, 20, 15},
		// Bebidas
		{"BEB-001", "Agua purificada 600 ml", "Bebidas", &idB, 5, 12, 120, 30, 15},
		{"BEB-002", "Refresco cola 2 L", "Bebidas", &idB, 22, 35, 40, 12, 15},
		{"BEB-003", "Jugo de naranja 1 L", "Bebidas", &idB, 18, 32, 25, 10, 15},
		// Limpieza
		{"LIM-001", "Detergente en polvo 1 kg", "Limpieza", &idB, 48, 75, 22, 8, 15},
		{"LIM-002", "Cloro 1 L", "Limpieza", &idA, 15, 28, 18, 6, 15},
		{"LIM-003", "Jabón de barra 3-pack", "Limpieza", &idA, 20, 35, 30, 10, 15},
		// Snacks
		{"SNK-001", "Galletas de soda", "Snacks", &idB, 12, 22, 55, 15, 15},
		{"SNK-002", "Churros de maíz", "Snacks", &idB, 8, 15, 40, 12, 15},
		// Stock bajo / por agotarse (para Vito)
		{"ABA-010", "Leche en polvo 400 g", "Abarrotes", &idA, 95, 135, 3, 12, 15},
		{"ABA-011", "Café molido 400 g", "Abarrotes", &idA, 85, 125, 2, 10, 15},
		{"BEB-010", "Leche UHT 1 L", "Bebidas", &idB, 22, 36, 4, 15, 15},
		{"LIM-010", "Papel higiénico 12 rollos", "Limpieza", &idB, 68, 110, 1, 8, 15},
		{"SNK-010", "Chocolate de mesa", "Snacks", &idA, 25, 42, 0, 6, 15},
		// Lento / estancado (poco o nada se vende, stock alto)
		{"ABA-090", "Sardinas en lata (caja 24)", "Abarrotes", &idA, 180, 260, 18, 4, 15},
		{"LIM-090", "Ambientador en aerosol", "Limpieza", &idB, 35, 58, 25, 5, 15},
		{"SNK-090", "Gomitas importadas", "Snacks", &idB, 40, 70, 22, 5, 15},
	}

	prodBySKU := map[string]Product{}
	for _, d := range prods {
		cid := catIDs[d.cat]
		p, err := s.CreateProduct(Product{
			SKU: d.sku, Name: d.name, CategoryID: &cid, SupplierID: d.sup,
			Cost: d.cost, Price: d.price, Stock: d.stock, MinStock: d.min,
			ISVRate: d.isv, Active: true,
			Description: "Producto demo · Abarrotes El Progreso",
		})
		if err != nil {
			return SeedReport{}, fmt.Errorf("producto %s: %w", d.sku, err)
		}
		prodBySKU[d.sku] = p
	}

	// Ventas de los últimos ~25 días (fechas locales backdateadas)
	now := time.Now()
	type salePlan struct {
		daysAgo  int
		customer string
		items    []struct {
			sku string
			qty float64
		}
		pay string
	}
	plans := []salePlan{
		{0, "Cliente mostrador", []struct {
			sku string
			qty float64
		}{{"ABA-001", 2}, {"BEB-001", 6}, {"SNK-001", 3}}, "efectivo"},
		{0, "Ana García", []struct {
			sku string
			qty float64
		}{{"ABA-002", 1}, {"ABA-003", 1}, {"LIM-001", 1}}, "tarjeta"},
		{1, "Cliente mostrador", []struct {
			sku string
			qty float64
		}{{"BEB-002", 4}, {"SNK-002", 5}, {"ABA-004", 2}}, "efectivo"},
		{2, "Pulpería La Esquina", []struct {
			sku string
			qty float64
		}{{"ABA-001", 5}, {"ABA-002", 4}, {"BEB-001", 12}}, "transferencia"},
		{3, "Cliente mostrador", []struct {
			sku string
			qty float64
		}{{"LIM-002", 2}, {"LIM-003", 1}, {"ABA-005", 3}}, "efectivo"},
		{4, "José Martínez", []struct {
			sku string
			qty float64
		}{{"BEB-003", 2}, {"SNK-001", 4}, {"ABA-003", 2}}, "tarjeta"},
		{5, "Cliente mostrador", []struct {
			sku string
			qty float64
		}{{"ABA-001", 1}, {"BEB-002", 2}}, "efectivo"},
		{6, "Comedor Doña Luz", []struct {
			sku string
			qty float64
		}{{"ABA-001", 8}, {"ABA-002", 6}, {"ABA-004", 4}, {"ABA-003", 3}}, "transferencia"},
		{7, "Cliente mostrador", []struct {
			sku string
			qty float64
		}{{"SNK-002", 8}, {"BEB-001", 10}}, "efectivo"},
		{8, "Oficina Contable HN", []struct {
			sku string
			qty float64
		}{{"BEB-001", 24}, {"SNK-001", 12}}, "transferencia"},
		{10, "Cliente mostrador", []struct {
			sku string
			qty float64
		}{{"ABA-003", 3}, {"LIM-001", 2}}, "efectivo"},
		{12, "Pulpería La Esquina", []struct {
			sku string
			qty float64
		}{{"ABA-001", 6}, {"BEB-002", 6}, {"ABA-010", 2}}, "efectivo"},
		{14, "Cliente mostrador", []struct {
			sku string
			qty float64
		}{{"BEB-010", 3}, {"ABA-011", 1}}, "tarjeta"},
		{18, "Ana García", []struct {
			sku string
			qty float64
		}{{"ABA-002", 2}, {"LIM-003", 2}, {"SNK-001", 2}}, "efectivo"},
		{21, "Cliente mostrador", []struct {
			sku string
			qty float64
		}{{"ABA-001", 3}, {"BEB-001", 8}, {"ABA-005", 2}}, "efectivo"},
		{24, "Comedor Doña Luz", []struct {
			sku string
			qty float64
		}{{"ABA-001", 10}, {"ABA-002", 8}, {"ABA-003", 4}}, "transferencia"},
	}

	salesCount := 0
	for _, sp := range plans {
		var items []NewSaleItemInput
		for _, it := range sp.items {
			p, ok := prodBySKU[it.sku]
			if !ok || it.qty <= 0 {
				continue
			}
			// ensure enough stock for seed sale
			if p.Stock < it.qty {
				// bump stock so sale succeeds
				_, _ = s.AdjustStock(p.ID, "entrada", it.qty+5, "Ajuste seed demo")
				p, _ = s.GetProduct(p.ID)
				prodBySKU[it.sku] = p
			}
			items = append(items, NewSaleItemInput{ProductID: p.ID, Qty: it.qty})
		}
		if len(items) == 0 {
			continue
		}
		sale, err := s.CreateSale(NewSaleInput{
			CustomerName:  sp.customer,
			PaymentMethod: sp.pay,
			Notes:         "Venta demo",
			Items:         items,
		})
		if err != nil {
			return SeedReport{}, fmt.Errorf("venta demo: %w", err)
		}
		// Backdate for reports / Vito periods
		day := now.AddDate(0, 0, -sp.daysAgo).Format("2006-01-02")
		if _, err := s.db.Exec(`UPDATE sales SET sale_date=? WHERE id=?`, day+" 12:00:00", sale.ID); err != nil {
			return SeedReport{}, err
		}
		// refresh stock cache
		for _, it := range sp.items {
			if p, ok := prodBySKU[it.sku]; ok {
				np, _ := s.GetProduct(p.ID)
				prodBySKU[it.sku] = np
			}
		}
		salesCount++
	}

	// Re-apply low stock levels for demo questions (sales may have drained or entries added)
	lowTargets := map[string]float64{
		"ABA-010": 3, "ABA-011": 2, "BEB-010": 4, "LIM-010": 1, "SNK-010": 0,
	}
	for sku, stock := range lowTargets {
		p := prodBySKU[sku]
		if p.ID == 0 {
			continue
		}
		cur, err := s.GetProduct(p.ID)
		if err != nil {
			return SeedReport{}, err
		}
		if cur.Stock == stock {
			continue
		}
		if _, err := s.AdjustStock(p.ID, "ajuste", stock, "Ajuste demo · stock bajo para Vito"); err != nil {
			return SeedReport{}, err
		}
	}

	// Gastos del mes
	exps := []Expense{
		{ExpenseDate: now.Format("2006-01-02"), Category: "administrativos", Description: "Energía eléctrica", Amount: 1850},
		{ExpenseDate: now.AddDate(0, 0, -3).Format("2006-01-02"), Category: "ventas", Description: "Publicidad Facebook local", Amount: 450},
		{ExpenseDate: now.AddDate(0, 0, -8).Format("2006-01-02"), Category: "administrativos", Description: "Internet y teléfono", Amount: 890},
		{ExpenseDate: now.AddDate(0, 0, -12).Format("2006-01-02"), Category: "otros", Description: "Mantenimiento de refrigerador", Amount: 1200},
	}
	expCount := 0
	for _, e := range exps {
		if _, err := s.CreateExpense(e); err != nil {
			return SeedReport{}, err
		}
		expCount++
	}

	var low int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM products WHERE active=1 AND stock <= min_stock`).Scan(&low)

	return SeedReport{
		Forced:     force,
		Categories: len(cats),
		Suppliers:  2,
		Products:   len(prods),
		Sales:      salesCount,
		Expenses:   expCount,
		LowStock:   low,
	}, nil
}

func (s *Store) clearDemoTables() error {
	// Order respects FKs (if any) / logical deps
	stmts := []string{
		`DELETE FROM sale_items`,
		`DELETE FROM sales`,
		`DELETE FROM purchase_order_items`,
		`DELETE FROM purchase_orders`,
		`DELETE FROM stock_movements`,
		`DELETE FROM expenses`,
		`DELETE FROM products`,
		`DELETE FROM suppliers`,
		// keep categories except we may add demo ones; clear non-default optional
		`DELETE FROM categories WHERE name != 'General'`,
	}
	for _, q := range stmts {
		if _, err := s.db.Exec(q); err != nil {
			return fmt.Errorf("limpiando demo (%s): %w", q, err)
		}
	}
	return nil
}

// HasDemoSeed reports whether demo settings flag is set.
func (s *Store) HasDemoSeed() bool {
	return strings.TrimSpace(s.settingString("demo_seeded", "")) == "1"
}

func (s *Store) settingString(key, fallback string) string {
	var v string
	err := s.db.QueryRow(`SELECT value FROM settings WHERE key=?`, key).Scan(&v)
	if err != nil || v == "" {
		return fallback
	}
	return v
}
