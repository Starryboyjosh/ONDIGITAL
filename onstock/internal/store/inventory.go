package store

import (
	"errors"
	"fmt"
	"strings"
)

type MovementFilter struct {
	ProductID int64
	Type      string
	From      string // YYYY-MM-DD
	To        string
	Limit     int
}

func (s *Store) ListMovements(f MovementFilter) ([]StockMovement, error) {
	where := []string{"1=1"}
	args := []any{}
	if f.ProductID > 0 {
		where = append(where, "m.product_id=?")
		args = append(args, f.ProductID)
	}
	if f.Type != "" {
		where = append(where, "m.type=?")
		args = append(args, f.Type)
	}
	if f.From != "" {
		where = append(where, "date(m.created_at) >= ?")
		args = append(args, f.From)
	}
	if f.To != "" {
		where = append(where, "date(m.created_at) <= ?")
		args = append(args, f.To)
	}
	limit := f.Limit
	if limit <= 0 {
		limit = 500
	}
	args = append(args, limit)
	rows, err := s.db.Query(`SELECT m.id, m.product_id, p.name, p.sku, m.type, m.qty, m.unit_cost, m.reference, m.notes, m.created_at
	  FROM stock_movements m JOIN products p ON p.id = m.product_id
	  WHERE `+strings.Join(where, " AND ")+`
	  ORDER BY m.id DESC LIMIT ?`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []StockMovement{}
	for rows.Next() {
		var m StockMovement
		if err := rows.Scan(&m.ID, &m.ProductID, &m.ProductName, &m.ProductSKU, &m.Type, &m.Qty,
			&m.UnitCost, &m.Reference, &m.Notes, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// AdjustStock registra un movimiento manual de inventario.
//   - tipo "entrada": suma qty al stock (qty > 0)
//   - tipo "salida":  resta qty del stock (qty > 0; merma, daño, uso interno)
//   - tipo "ajuste":  fija el stock al valor contado qty (>= 0); registra la diferencia
func (s *Store) AdjustStock(productID int64, movType string, qty float64, notes string) (Product, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return Product{}, err
	}
	defer tx.Rollback()

	var stock, cost float64
	err = tx.QueryRow(`SELECT stock, cost FROM products WHERE id=?`, productID).Scan(&stock, &cost)
	if err != nil {
		return Product{}, ErrNotFound
	}

	var delta float64
	switch movType {
	case "entrada":
		if qty <= 0 {
			return Product{}, errors.New("la cantidad debe ser mayor que cero")
		}
		delta = qty
	case "salida":
		if qty <= 0 {
			return Product{}, errors.New("la cantidad debe ser mayor que cero")
		}
		delta = -qty
	case "ajuste":
		if qty < 0 {
			return Product{}, errors.New("el stock contado no puede ser negativo")
		}
		delta = qty - stock
		if delta == 0 {
			return Product{}, errors.New("el stock contado es igual al actual; no hay nada que ajustar")
		}
	default:
		return Product{}, fmt.Errorf("tipo de movimiento inválido: %q", movType)
	}

	if _, err := tx.Exec(`UPDATE products SET stock = stock + ?, updated_at=datetime('now','localtime') WHERE id=?`, delta, productID); err != nil {
		return Product{}, err
	}
	if _, err := tx.Exec(`INSERT INTO stock_movements (product_id, type, qty, unit_cost, reference, notes)
	  VALUES (?,?,?,?,?,?)`, productID, movType, delta, cost, "Movimiento manual", notes); err != nil {
		return Product{}, err
	}
	if err := tx.Commit(); err != nil {
		return Product{}, err
	}
	return s.GetProduct(productID)
}

// InventoryValue devuelve el valor total del inventario activo (stock × costo).
func (s *Store) InventoryValue() (float64, error) {
	var v float64
	err := s.db.QueryRow(`SELECT COALESCE(SUM(stock*cost),0) FROM products WHERE active=1`).Scan(&v)
	return round2(v), err
}
