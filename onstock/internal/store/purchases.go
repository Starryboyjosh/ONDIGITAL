package store

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

type POFilter struct {
	Query      string
	SupplierID int64
	Status     string
	From       string
	To         string
	Limit      int
}

func (s *Store) ListPurchaseOrders(f POFilter) ([]PurchaseOrder, error) {
	where := []string{"1=1"}
	args := []any{}
	if f.Query != "" {
		q := "%" + f.Query + "%"
		where = append(where, "(o.po_number LIKE ? OR s.name LIKE ?)")
		args = append(args, q, q)
	}
	if f.SupplierID > 0 {
		where = append(where, "o.supplier_id=?")
		args = append(args, f.SupplierID)
	}
	if f.Status != "" {
		where = append(where, "o.status=?")
		args = append(args, f.Status)
	}
	if f.From != "" {
		where = append(where, "o.order_date >= ?")
		args = append(args, f.From)
	}
	if f.To != "" {
		where = append(where, "o.order_date <= ?")
		args = append(args, f.To)
	}
	limit := f.Limit
	if limit <= 0 {
		limit = 500
	}
	args = append(args, limit)
	rows, err := s.db.Query(`SELECT o.id, o.po_number, o.supplier_id, s.name, o.status, o.order_date,
	  o.expected_date, o.received_date, o.notes, o.created_at,
	  COALESCE((SELECT SUM(qty*unit_cost) FROM purchase_order_items WHERE po_id=o.id),0)
	  FROM purchase_orders o JOIN suppliers s ON s.id=o.supplier_id
	  WHERE `+strings.Join(where, " AND ")+` ORDER BY o.id DESC LIMIT ?`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PurchaseOrder{}
	for rows.Next() {
		var o PurchaseOrder
		if err := rows.Scan(&o.ID, &o.PONumber, &o.SupplierID, &o.SupplierName, &o.Status, &o.OrderDate,
			&o.ExpectedDate, &o.ReceivedDate, &o.Notes, &o.CreatedAt, &o.Total); err != nil {
			return nil, err
		}
		o.Total = round2(o.Total)
		out = append(out, o)
	}
	return out, rows.Err()
}

func (s *Store) GetPurchaseOrder(id int64) (PurchaseOrder, error) {
	var o PurchaseOrder
	err := s.db.QueryRow(`SELECT o.id, o.po_number, o.supplier_id, s.name, o.status, o.order_date,
	  o.expected_date, o.received_date, o.notes, o.created_at
	  FROM purchase_orders o JOIN suppliers s ON s.id=o.supplier_id WHERE o.id=?`, id).
		Scan(&o.ID, &o.PONumber, &o.SupplierID, &o.SupplierName, &o.Status, &o.OrderDate,
			&o.ExpectedDate, &o.ReceivedDate, &o.Notes, &o.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return o, ErrNotFound
	}
	if err != nil {
		return o, err
	}
	rows, err := s.db.Query(`SELECT i.id, i.product_id, p.name, p.sku, i.qty, i.unit_cost
	  FROM purchase_order_items i JOIN products p ON p.id=i.product_id WHERE i.po_id=? ORDER BY i.id`, id)
	if err != nil {
		return o, err
	}
	defer rows.Close()
	for rows.Next() {
		var it PurchaseOrderItem
		if err := rows.Scan(&it.ID, &it.ProductID, &it.ProductName, &it.ProductSKU, &it.Qty, &it.UnitCost); err != nil {
			return o, err
		}
		o.Total += it.Qty * it.UnitCost
		o.Items = append(o.Items, it)
	}
	o.Total = round2(o.Total)
	return o, rows.Err()
}

func (s *Store) CreatePurchaseOrder(in NewPOInput) (PurchaseOrder, error) {
	if in.SupplierID == 0 {
		return PurchaseOrder{}, errors.New("selecciona un proveedor")
	}
	if len(in.Items) == 0 {
		return PurchaseOrder{}, errors.New("la orden no tiene productos")
	}
	tx, err := s.db.Begin()
	if err != nil {
		return PurchaseOrder{}, err
	}
	defer tx.Rollback()

	var nextID int64
	if err := tx.QueryRow(`SELECT COALESCE(MAX(id),0)+1 FROM purchase_orders`).Scan(&nextID); err != nil {
		return PurchaseOrder{}, err
	}
	poNumber := fmt.Sprintf("OC-%05d", nextID)

	orderDate := in.OrderDate
	if orderDate == "" {
		orderDate = "" // el DEFAULT del esquema pone la fecha local
	}
	var res sql.Result
	if orderDate != "" {
		res, err = tx.Exec(`INSERT INTO purchase_orders (po_number, supplier_id, order_date, expected_date, notes)
		  VALUES (?,?,?,?,?)`, poNumber, in.SupplierID, orderDate, in.ExpectedDate, in.Notes)
	} else {
		res, err = tx.Exec(`INSERT INTO purchase_orders (po_number, supplier_id, expected_date, notes)
		  VALUES (?,?,?,?)`, poNumber, in.SupplierID, in.ExpectedDate, in.Notes)
	}
	if err != nil {
		return PurchaseOrder{}, err
	}
	poID, _ := res.LastInsertId()
	if err := insertPOItems(tx, poID, in.Items); err != nil {
		return PurchaseOrder{}, err
	}
	if err := tx.Commit(); err != nil {
		return PurchaseOrder{}, err
	}
	return s.GetPurchaseOrder(poID)
}

func insertPOItems(tx *sql.Tx, poID int64, items []NewPOItemIn) error {
	for _, it := range items {
		if it.Qty <= 0 {
			return errors.New("las cantidades deben ser mayores que cero")
		}
		if it.UnitCost < 0 {
			return errors.New("el costo no puede ser negativo")
		}
		var exists int
		if err := tx.QueryRow(`SELECT COUNT(*) FROM products WHERE id=?`, it.ProductID).Scan(&exists); err != nil {
			return err
		}
		if exists == 0 {
			return fmt.Errorf("producto %d no existe", it.ProductID)
		}
		if _, err := tx.Exec(`INSERT INTO purchase_order_items (po_id, product_id, qty, unit_cost)
		  VALUES (?,?,?,?)`, poID, it.ProductID, it.Qty, it.UnitCost); err != nil {
			return err
		}
	}
	return nil
}

// UpdatePurchaseOrder reemplaza cabecera e ítems; solo permitido en borrador o enviada.
func (s *Store) UpdatePurchaseOrder(id int64, in NewPOInput) (PurchaseOrder, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return PurchaseOrder{}, err
	}
	defer tx.Rollback()

	var status string
	err = tx.QueryRow(`SELECT status FROM purchase_orders WHERE id=?`, id).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		return PurchaseOrder{}, ErrNotFound
	}
	if err != nil {
		return PurchaseOrder{}, err
	}
	if status != "borrador" && status != "enviada" {
		return PurchaseOrder{}, fmt.Errorf("no se puede editar una orden %s", status)
	}
	if _, err := tx.Exec(`UPDATE purchase_orders SET supplier_id=?, order_date=?, expected_date=?, notes=? WHERE id=?`,
		in.SupplierID, in.OrderDate, in.ExpectedDate, in.Notes, id); err != nil {
		return PurchaseOrder{}, err
	}
	if _, err := tx.Exec(`DELETE FROM purchase_order_items WHERE po_id=?`, id); err != nil {
		return PurchaseOrder{}, err
	}
	if err := insertPOItems(tx, id, in.Items); err != nil {
		return PurchaseOrder{}, err
	}
	if err := tx.Commit(); err != nil {
		return PurchaseOrder{}, err
	}
	return s.GetPurchaseOrder(id)
}

// SetPOStatus cambia el estado. Al pasar a "recibida": suma stock, recalcula el costo
// promedio ponderado de cada producto y registra los movimientos.
func (s *Store) SetPOStatus(id int64, newStatus string) (PurchaseOrder, error) {
	valid := map[string]bool{"borrador": true, "enviada": true, "recibida": true, "cancelada": true}
	if !valid[newStatus] {
		return PurchaseOrder{}, fmt.Errorf("estado inválido: %q", newStatus)
	}
	tx, err := s.db.Begin()
	if err != nil {
		return PurchaseOrder{}, err
	}
	defer tx.Rollback()

	var status, poNumber string
	err = tx.QueryRow(`SELECT status, po_number FROM purchase_orders WHERE id=?`, id).Scan(&status, &poNumber)
	if errors.Is(err, sql.ErrNoRows) {
		return PurchaseOrder{}, ErrNotFound
	}
	if err != nil {
		return PurchaseOrder{}, err
	}
	if status == "recibida" {
		return PurchaseOrder{}, errors.New("la orden ya fue recibida; su inventario ya está aplicado")
	}
	if status == "cancelada" && newStatus != "borrador" {
		return PurchaseOrder{}, errors.New("una orden cancelada solo puede reabrirse como borrador")
	}

	if newStatus == "recibida" {
		rows, err := tx.Query(`SELECT product_id, qty, unit_cost FROM purchase_order_items WHERE po_id=?`, id)
		if err != nil {
			return PurchaseOrder{}, err
		}
		type itm struct {
			pid       int64
			qty, cost float64
		}
		var items []itm
		for rows.Next() {
			var it itm
			if err := rows.Scan(&it.pid, &it.qty, &it.cost); err != nil {
				rows.Close()
				return PurchaseOrder{}, err
			}
			items = append(items, it)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return PurchaseOrder{}, err
		}
		if len(items) == 0 {
			return PurchaseOrder{}, errors.New("la orden no tiene productos")
		}
		for _, it := range items {
			var stock, cost float64
			if err := tx.QueryRow(`SELECT stock, cost FROM products WHERE id=?`, it.pid).Scan(&stock, &cost); err != nil {
				return PurchaseOrder{}, err
			}
			// Costo promedio ponderado (solo el stock positivo existente pondera).
			newCost := it.cost
			if stock > 0 && stock+it.qty > 0 {
				newCost = (stock*cost + it.qty*it.cost) / (stock + it.qty)
			}
			if _, err := tx.Exec(`UPDATE products SET stock=stock+?, cost=?, updated_at=datetime('now','localtime') WHERE id=?`,
				it.qty, round2(newCost), it.pid); err != nil {
				return PurchaseOrder{}, err
			}
			if _, err := tx.Exec(`INSERT INTO stock_movements (product_id, type, qty, unit_cost, reference)
			  VALUES (?,?,?,?,?)`, it.pid, "compra", it.qty, it.cost, poNumber); err != nil {
				return PurchaseOrder{}, err
			}
		}
		if _, err := tx.Exec(`UPDATE purchase_orders SET status='recibida', received_date=date('now','localtime') WHERE id=?`, id); err != nil {
			return PurchaseOrder{}, err
		}
	} else {
		if _, err := tx.Exec(`UPDATE purchase_orders SET status=? WHERE id=?`, newStatus, id); err != nil {
			return PurchaseOrder{}, err
		}
	}
	if err := tx.Commit(); err != nil {
		return PurchaseOrder{}, err
	}
	return s.GetPurchaseOrder(id)
}

func (s *Store) DeletePurchaseOrder(id int64) error {
	var status string
	err := s.db.QueryRow(`SELECT status FROM purchase_orders WHERE id=?`, id).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if status == "recibida" {
		return errors.New("no se puede eliminar una orden recibida (su inventario ya está aplicado)")
	}
	_, err = s.db.Exec(`DELETE FROM purchase_orders WHERE id=?`, id)
	return err
}
