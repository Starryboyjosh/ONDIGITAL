package store

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

type SaleFilter struct {
	Query  string
	From   string // YYYY-MM-DD
	To     string
	Status string
	Limit  int
}

func (s *Store) ListSales(f SaleFilter) ([]Sale, error) {
	where := []string{"1=1"}
	args := []any{}
	if f.Query != "" {
		q := "%" + f.Query + "%"
		where = append(where, "(sale_number LIKE ? OR customer_name LIKE ? OR customer_rtn LIKE ?)")
		args = append(args, q, q, q)
	}
	if f.From != "" {
		where = append(where, "date(sale_date) >= ?")
		args = append(args, f.From)
	}
	if f.To != "" {
		where = append(where, "date(sale_date) <= ?")
		args = append(args, f.To)
	}
	if f.Status != "" {
		where = append(where, "status=?")
		args = append(args, f.Status)
	}
	limit := f.Limit
	if limit <= 0 {
		limit = 500
	}
	args = append(args, limit)
	rows, err := s.db.Query(`SELECT id, sale_number, customer_name, customer_rtn, sale_date, subtotal,
	  discount, discount_net, isv, total, cost_total, payment_method, status, notes, created_at
	  FROM sales WHERE `+strings.Join(where, " AND ")+`
	  ORDER BY sale_date DESC, id DESC LIMIT ?`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Sale{}
	for rows.Next() {
		v, err := scanSale(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func scanSale(row interface{ Scan(...any) error }) (Sale, error) {
	var v Sale
	err := row.Scan(&v.ID, &v.SaleNumber, &v.CustomerName, &v.CustomerRTN, &v.SaleDate, &v.Subtotal,
		&v.Discount, &v.DiscountNet, &v.ISV, &v.Total, &v.CostTotal, &v.PaymentMethod, &v.Status, &v.Notes, &v.CreatedAt)
	return v, err
}

func (s *Store) GetSale(id int64) (Sale, error) {
	v, err := scanSale(s.db.QueryRow(`SELECT id, sale_number, customer_name, customer_rtn, sale_date, subtotal,
	  discount, discount_net, isv, total, cost_total, payment_method, status, notes, created_at FROM sales WHERE id=?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return v, ErrNotFound
	}
	if err != nil {
		return v, err
	}
	rows, err := s.db.Query(`SELECT i.id, i.product_id, p.name, p.sku, i.qty, i.unit_price, i.unit_cost, i.isv_rate
	  FROM sale_items i JOIN products p ON p.id = i.product_id WHERE i.sale_id=? ORDER BY i.id`, id)
	if err != nil {
		return v, err
	}
	defer rows.Close()
	for rows.Next() {
		var it SaleItem
		if err := rows.Scan(&it.ID, &it.ProductID, &it.ProductName, &it.ProductSKU, &it.Qty, &it.UnitPrice, &it.UnitCost, &it.ISVRate); err != nil {
			return v, err
		}
		v.Items = append(v.Items, it)
	}
	return v, rows.Err()
}

// CreateSale registra una venta completa: calcula ISV, descuenta stock y guarda el costo (COGS).
func (s *Store) CreateSale(in NewSaleInput) (Sale, error) {
	if len(in.Items) == 0 {
		return Sale{}, errors.New("la venta no tiene productos")
	}
	pricesIncludeISV := s.settingBool("prices_include_isv")
	allowNegative := s.settingBool("allow_negative_stock")

	tx, err := s.db.Begin()
	if err != nil {
		return Sale{}, err
	}
	defer tx.Rollback()

	type line struct {
		productID int64
		name      string
		qty       float64
		netUnit   float64
		net       float64
		gross     float64
		isvRate   float64
		unitCost  float64
	}
	var lines []line
	var grossTotal, netSum, costTotal float64

	for _, it := range in.Items {
		if it.Qty <= 0 {
			return Sale{}, errors.New("las cantidades deben ser mayores que cero")
		}
		var name string
		var price, cost, isvRate, stock float64
		var active int
		err := tx.QueryRow(`SELECT name, price, cost, isv_rate, stock, active FROM products WHERE id=?`, it.ProductID).
			Scan(&name, &price, &cost, &isvRate, &stock, &active)
		if errors.Is(err, sql.ErrNoRows) {
			return Sale{}, fmt.Errorf("producto %d no existe", it.ProductID)
		}
		if err != nil {
			return Sale{}, err
		}
		if active != 1 {
			return Sale{}, fmt.Errorf("el producto %q está inactivo", name)
		}
		if !allowNegative && stock < it.Qty {
			return Sale{}, fmt.Errorf("stock insuficiente de %q (disponible: %g)", name, stock)
		}
		unit := price
		if it.UnitPrice != nil {
			unit = *it.UnitPrice
		}
		if unit < 0 {
			return Sale{}, errors.New("precio inválido")
		}
		var netUnit, grossUnit float64
		if pricesIncludeISV {
			grossUnit = unit
			netUnit = unit / (1 + isvRate/100)
		} else {
			netUnit = unit
			grossUnit = unit * (1 + isvRate/100)
		}
		l := line{
			productID: it.ProductID, name: name, qty: it.Qty,
			netUnit: netUnit, net: netUnit * it.Qty, gross: grossUnit * it.Qty,
			isvRate: isvRate, unitCost: cost,
		}
		lines = append(lines, l)
		grossTotal += l.gross
		netSum += l.net
		costTotal += cost * it.Qty
	}

	discount := in.Discount
	if discount < 0 {
		discount = 0
	}
	if discount > grossTotal {
		discount = grossTotal
	}
	factor := 1.0
	if grossTotal > 0 {
		factor = (grossTotal - discount) / grossTotal
	}
	netTotal := round2(netSum * factor)
	total := round2(grossTotal - discount)
	isvTotal := round2(total - netTotal)
	discountNet := round2(netSum - netSum*factor)

	var nextID int64
	if err := tx.QueryRow(`SELECT COALESCE(MAX(id),0)+1 FROM sales`).Scan(&nextID); err != nil {
		return Sale{}, err
	}
	saleNumber := fmt.Sprintf("V-%06d", nextID)

	payment := in.PaymentMethod
	if payment == "" {
		payment = "efectivo"
	}
	res, err := tx.Exec(`INSERT INTO sales
	  (sale_number, customer_name, customer_rtn, subtotal, discount, discount_net, isv, total, cost_total, payment_method, notes)
	  VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		saleNumber, strings.TrimSpace(in.CustomerName), strings.TrimSpace(in.CustomerRTN),
		netTotal, round2(discount), discountNet, isvTotal, total, round2(costTotal), payment, in.Notes)
	if err != nil {
		return Sale{}, err
	}
	saleID, _ := res.LastInsertId()

	for _, l := range lines {
		if _, err := tx.Exec(`INSERT INTO sale_items (sale_id, product_id, qty, unit_price, unit_cost, isv_rate)
		  VALUES (?,?,?,?,?,?)`, saleID, l.productID, l.qty, round2(l.netUnit), l.unitCost, l.isvRate); err != nil {
			return Sale{}, err
		}
		if _, err := tx.Exec(`UPDATE products SET stock = stock - ?, updated_at=datetime('now','localtime') WHERE id=?`, l.qty, l.productID); err != nil {
			return Sale{}, err
		}
		if _, err := tx.Exec(`INSERT INTO stock_movements (product_id, type, qty, unit_cost, reference)
		  VALUES (?,?,?,?,?)`, l.productID, "venta", -l.qty, l.unitCost, saleNumber); err != nil {
			return Sale{}, err
		}
	}
	if err := tx.Commit(); err != nil {
		return Sale{}, err
	}
	return s.GetSale(saleID)
}

// VoidSale anula una venta: repone el stock y la excluye de los reportes.
func (s *Store) VoidSale(id int64) (Sale, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return Sale{}, err
	}
	defer tx.Rollback()

	var status, saleNumber string
	err = tx.QueryRow(`SELECT status, sale_number FROM sales WHERE id=?`, id).Scan(&status, &saleNumber)
	if errors.Is(err, sql.ErrNoRows) {
		return Sale{}, ErrNotFound
	}
	if err != nil {
		return Sale{}, err
	}
	if status == "anulada" {
		return Sale{}, errors.New("la venta ya está anulada")
	}

	rows, err := tx.Query(`SELECT product_id, qty, unit_cost FROM sale_items WHERE sale_id=?`, id)
	if err != nil {
		return Sale{}, err
	}
	type itm struct {
		pid  int64
		qty  float64
		cost float64
	}
	var items []itm
	for rows.Next() {
		var it itm
		if err := rows.Scan(&it.pid, &it.qty, &it.cost); err != nil {
			rows.Close()
			return Sale{}, err
		}
		items = append(items, it)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return Sale{}, err
	}

	for _, it := range items {
		if _, err := tx.Exec(`UPDATE products SET stock = stock + ?, updated_at=datetime('now','localtime') WHERE id=?`, it.qty, it.pid); err != nil {
			return Sale{}, err
		}
		if _, err := tx.Exec(`INSERT INTO stock_movements (product_id, type, qty, unit_cost, reference)
		  VALUES (?,?,?,?,?)`, it.pid, "anulacion", it.qty, it.cost, saleNumber); err != nil {
			return Sale{}, err
		}
	}
	if _, err := tx.Exec(`UPDATE sales SET status='anulada' WHERE id=?`, id); err != nil {
		return Sale{}, err
	}
	if err := tx.Commit(); err != nil {
		return Sale{}, err
	}
	return s.GetSale(id)
}
