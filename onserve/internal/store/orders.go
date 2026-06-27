package store

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

const orderCols = `o.id, o.order_number, o.table_id, COALESCE(t.name,''), o.session_id, o.type, o.guests,
  o.waiter, o.status, o.opened_at, o.closed_at, o.customer_name, o.customer_rtn,
  o.subtotal, o.discount, o.discount_net, o.isv, o.tip, o.total, o.cost_total, o.notes, o.created_at`

func scanOrder(row interface{ Scan(...any) error }) (Order, error) {
	var v Order
	err := row.Scan(&v.ID, &v.OrderNumber, &v.TableID, &v.TableName, &v.SessionID, &v.Type, &v.Guests,
		&v.Waiter, &v.Status, &v.OpenedAt, &v.ClosedAt, &v.CustomerName, &v.CustomerRTN,
		&v.Subtotal, &v.Discount, &v.DiscountNet, &v.ISV, &v.Tip, &v.Total, &v.CostTotal, &v.Notes, &v.CreatedAt)
	return v, err
}

type OrderFilter struct {
	Status    string
	TableID   int64
	SessionID int64
	From      string
	To        string
	Limit     int
}

func (s *Store) ListOrders(f OrderFilter) ([]Order, error) {
	where := []string{"1=1"}
	args := []any{}
	if f.Status != "" {
		where = append(where, "o.status = ?")
		args = append(args, f.Status)
	}
	if f.TableID > 0 {
		where = append(where, "o.table_id = ?")
		args = append(args, f.TableID)
	}
	if f.SessionID > 0 {
		where = append(where, "o.session_id = ?")
		args = append(args, f.SessionID)
	}
	if f.From != "" {
		where = append(where, "date(o.opened_at) >= ?")
		args = append(args, f.From)
	}
	if f.To != "" {
		where = append(where, "date(o.opened_at) <= ?")
		args = append(args, f.To)
	}
	limit := f.Limit
	if limit <= 0 {
		limit = 200
	}
	args = append(args, limit)
	rows, err := s.db.Query(`SELECT `+orderCols+` FROM orders o LEFT JOIN dining_tables t ON t.id = o.table_id
	  WHERE `+strings.Join(where, " AND ")+` ORDER BY o.id DESC LIMIT ?`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Order{}
	for rows.Next() {
		v, err := scanOrder(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *Store) GetOrder(id int64) (Order, error) {
	v, err := scanOrder(s.db.QueryRow(`SELECT `+orderCols+` FROM orders o LEFT JOIN dining_tables t ON t.id = o.table_id WHERE o.id=?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return v, ErrNotFound
	}
	if err != nil {
		return v, err
	}
	if v.Items, err = s.loadOrderItems(id); err != nil {
		return v, err
	}
	if v.Payments, err = s.loadOrderPayments(id); err != nil {
		return v, err
	}
	return v, nil
}

func (s *Store) loadOrderItems(orderID int64) ([]OrderItem, error) {
	rows, err := s.db.Query(`SELECT id, order_id, menu_item_id, name, qty, unit_price, isv_rate, unit_cost,
	  course, station, kitchen_status, sent_at, ready_at, served_at, notes, created_at
	  FROM order_items WHERE order_id=? ORDER BY id`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []OrderItem{}
	for rows.Next() {
		var it OrderItem
		if err := rows.Scan(&it.ID, &it.OrderID, &it.MenuItemID, &it.Name, &it.Qty, &it.UnitPrice, &it.ISVRate,
			&it.UnitCost, &it.Course, &it.Station, &it.KitchenStatus, &it.SentAt, &it.ReadyAt, &it.ServedAt,
			&it.Notes, &it.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

func (s *Store) loadOrderPayments(orderID int64) ([]OrderPayment, error) {
	rows, err := s.db.Query(`SELECT id, order_id, method, amount, tip, reference, created_at
	  FROM order_payments WHERE order_id=? ORDER BY id`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []OrderPayment{}
	for rows.Next() {
		var p OrderPayment
		if err := rows.Scan(&p.ID, &p.OrderID, &p.Method, &p.Amount, &p.Tip, &p.Reference, &p.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// OpenOrder abre una comanda nueva. Rechaza una segunda comanda abierta en la misma mesa.
func (s *Store) OpenOrder(in NewOrderInput) (Order, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return Order{}, err
	}
	defer tx.Rollback()

	typ := in.Type
	if in.TableID != nil {
		var active int
		err := tx.QueryRow(`SELECT active FROM dining_tables WHERE id=?`, *in.TableID).Scan(&active)
		if errors.Is(err, sql.ErrNoRows) {
			return Order{}, errors.New("la mesa no existe")
		}
		if err != nil {
			return Order{}, err
		}
		if active != 1 {
			return Order{}, errors.New("la mesa está inactiva")
		}
		var open int
		if err := tx.QueryRow(`SELECT COUNT(*) FROM orders WHERE table_id=? AND status IN ('abierta','por_cobrar')`, *in.TableID).Scan(&open); err != nil {
			return Order{}, err
		}
		if open > 0 {
			return Order{}, errors.New("la mesa ya tiene una comanda abierta")
		}
		if typ == "" {
			typ = "mesa"
		}
	} else if typ == "" {
		typ = "llevar"
	}

	guests := in.Guests
	if guests <= 0 {
		guests = 1
	}
	var nextID int64
	if err := tx.QueryRow(`SELECT COALESCE(MAX(id),0)+1 FROM orders`).Scan(&nextID); err != nil {
		return Order{}, err
	}
	number := fmt.Sprintf("C-%06d", nextID)
	res, err := tx.Exec(`INSERT INTO orders(order_number, table_id, type, guests, waiter) VALUES (?,?,?,?,?)`,
		number, in.TableID, typ, guests, strings.TrimSpace(in.Waiter))
	if err != nil {
		return Order{}, err
	}
	id, _ := res.LastInsertId()
	if in.TableID != nil {
		if _, err := tx.Exec(`UPDATE dining_tables SET reserved=0, reserved_note='' WHERE id=?`, *in.TableID); err != nil {
			return Order{}, err
		}
	}
	if err := tx.Commit(); err != nil {
		return Order{}, err
	}
	return s.GetOrder(id)
}

// orderStatus devuelve el estado de la comanda (con el ejecutor dado: tx o db).
func orderStatus(q interface {
	QueryRow(string, ...any) *sql.Row
}, id int64) (string, error) {
	var status string
	err := q.QueryRow(`SELECT status FROM orders WHERE id=?`, id).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	return status, err
}

func editableStatus(status string) error {
	switch status {
	case "abierta", "por_cobrar":
		return nil
	case "pagada":
		return errors.New("la comanda ya está pagada")
	case "anulada":
		return errors.New("la comanda está anulada")
	default:
		return fmt.Errorf("estado de comanda no editable: %s", status)
	}
}

// AddItem agrega un platillo a la comanda. Si ya existe una línea idéntica sin enviar a
// cocina, suma la cantidad (como un carrito); si no, crea una línea nueva.
func (s *Store) AddItem(orderID int64, in AddItemInput) (Order, error) {
	if in.Qty <= 0 {
		in.Qty = 1
	}
	tx, err := s.db.Begin()
	if err != nil {
		return Order{}, err
	}
	defer tx.Rollback()

	status, err := orderStatus(tx, orderID)
	if err != nil {
		return Order{}, err
	}
	if err := editableStatus(status); err != nil {
		return Order{}, err
	}

	var name, station string
	var price, isvRate, cost float64
	var available, active int
	err = tx.QueryRow(`SELECT i.name, i.price, i.isv_rate, i.cost, i.available, i.active,
	  COALESCE(NULLIF(i.station,''), c.station, 'cocina')
	  FROM menu_items i LEFT JOIN menu_categories c ON c.id = i.category_id WHERE i.id=?`, in.MenuItemID).
		Scan(&name, &price, &isvRate, &cost, &available, &active, &station)
	if errors.Is(err, sql.ErrNoRows) {
		return Order{}, errors.New("el platillo no existe")
	}
	if err != nil {
		return Order{}, err
	}
	if active != 1 {
		return Order{}, fmt.Errorf("el platillo %q está inactivo", name)
	}
	if available != 1 {
		return Order{}, fmt.Errorf("%q no está disponible en este momento", name)
	}
	course := in.Course
	if course == "" {
		course = "fuerte"
	}
	notes := strings.TrimSpace(in.Notes)

	// Fusiona con una línea existente del mismo platillo, no enviada a cocina y con las mismas notas.
	var existingID int64
	err = tx.QueryRow(`SELECT id FROM order_items WHERE order_id=? AND menu_item_id=? AND sent_at='' AND notes=? AND course=? LIMIT 1`,
		orderID, in.MenuItemID, notes, course).Scan(&existingID)
	if err == nil {
		if _, err := tx.Exec(`UPDATE order_items SET qty = qty + ? WHERE id=?`, in.Qty, existingID); err != nil {
			return Order{}, err
		}
	} else if errors.Is(err, sql.ErrNoRows) {
		if _, err := tx.Exec(`INSERT INTO order_items(order_id, menu_item_id, name, qty, unit_price, isv_rate, unit_cost, course, station, notes)
		  VALUES (?,?,?,?,?,?,?,?,?,?)`, orderID, in.MenuItemID, name, in.Qty, round2(price), isvRate, round2(cost), course, station, notes); err != nil {
			return Order{}, err
		}
	} else {
		return Order{}, err
	}

	if err := recompute(tx, orderID); err != nil {
		return Order{}, err
	}
	if err := tx.Commit(); err != nil {
		return Order{}, err
	}
	return s.GetOrder(orderID)
}

// UpdateItem cambia cantidad, curso o notas de una línea. Cantidad 0 elimina la línea.
func (s *Store) UpdateItem(orderID, itemID int64, in UpdateItemInput) (Order, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return Order{}, err
	}
	defer tx.Rollback()

	status, err := orderStatus(tx, orderID)
	if err != nil {
		return Order{}, err
	}
	if err := editableStatus(status); err != nil {
		return Order{}, err
	}
	var exists int
	if err := tx.QueryRow(`SELECT COUNT(*) FROM order_items WHERE id=? AND order_id=?`, itemID, orderID).Scan(&exists); err != nil {
		return Order{}, err
	}
	if exists == 0 {
		return Order{}, ErrNotFound
	}
	if in.Qty != nil {
		if *in.Qty <= 0 {
			if _, err := tx.Exec(`DELETE FROM order_items WHERE id=?`, itemID); err != nil {
				return Order{}, err
			}
		} else if _, err := tx.Exec(`UPDATE order_items SET qty=? WHERE id=?`, *in.Qty, itemID); err != nil {
			return Order{}, err
		}
	}
	if in.Course != nil {
		if _, err := tx.Exec(`UPDATE order_items SET course=? WHERE id=?`, *in.Course, itemID); err != nil {
			return Order{}, err
		}
	}
	if in.Notes != nil {
		if _, err := tx.Exec(`UPDATE order_items SET notes=? WHERE id=?`, strings.TrimSpace(*in.Notes), itemID); err != nil {
			return Order{}, err
		}
	}
	if err := recompute(tx, orderID); err != nil {
		return Order{}, err
	}
	if err := tx.Commit(); err != nil {
		return Order{}, err
	}
	return s.GetOrder(orderID)
}

func (s *Store) RemoveItem(orderID, itemID int64) (Order, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return Order{}, err
	}
	defer tx.Rollback()

	status, err := orderStatus(tx, orderID)
	if err != nil {
		return Order{}, err
	}
	if err := editableStatus(status); err != nil {
		return Order{}, err
	}
	res, err := tx.Exec(`DELETE FROM order_items WHERE id=? AND order_id=?`, itemID, orderID)
	if err != nil {
		return Order{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Order{}, ErrNotFound
	}
	if err := recompute(tx, orderID); err != nil {
		return Order{}, err
	}
	if err := tx.Commit(); err != nil {
		return Order{}, err
	}
	return s.GetOrder(orderID)
}

// Fire envía a cocina las líneas aún no enviadas (marca sent_at). Devuelve la comanda.
func (s *Store) Fire(orderID int64) (Order, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return Order{}, err
	}
	defer tx.Rollback()
	status, err := orderStatus(tx, orderID)
	if err != nil {
		return Order{}, err
	}
	if err := editableStatus(status); err != nil {
		return Order{}, err
	}
	if _, err := tx.Exec(`UPDATE order_items SET sent_at=datetime('now','localtime'), kitchen_status='pendiente'
	  WHERE order_id=? AND sent_at=''`, orderID); err != nil {
		return Order{}, err
	}
	if err := tx.Commit(); err != nil {
		return Order{}, err
	}
	return s.GetOrder(orderID)
}

// RequestBill marca la comanda como "por cobrar" (el cliente pidió la cuenta).
func (s *Store) RequestBill(orderID int64) (Order, error) {
	res, err := s.db.Exec(`UPDATE orders SET status='por_cobrar' WHERE id=? AND status='abierta'`, orderID)
	if err != nil {
		return Order{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		// idempotente: si ya está por_cobrar o en otro estado, devolvemos el actual.
		if _, err := orderStatus(s.db, orderID); err != nil {
			return Order{}, err
		}
	}
	return s.GetOrder(orderID)
}

// txPricesIncludeISV lee la configuración de precios usando la MISMA conexión de la
// transacción. Con SetMaxOpenConns(1), tocar s.db dentro de una tx abierta esperaría
// por una segunda conexión que nunca llega (deadlock); por eso se lee vía tx.
func txPricesIncludeISV(tx *sql.Tx) bool {
	var v string
	_ = tx.QueryRow(`SELECT value FROM settings WHERE key='prices_include_isv'`).Scan(&v)
	return v == "1" || v == "true"
}

// recompute recalcula subtotal (neto), ISV y total de la comanda a partir de sus líneas
// y del descuento ya guardado. La propina NO entra aquí: no es ingreso gravable.
func recompute(tx *sql.Tx, orderID int64) error {
	var discount float64
	if err := tx.QueryRow(`SELECT discount FROM orders WHERE id=?`, orderID).Scan(&discount); err != nil {
		return err
	}
	return recomputeWithDiscount(tx, orderID, discount)
}

func recomputeWithDiscount(tx *sql.Tx, orderID int64, discount float64) error {
	pricesIncludeISV := txPricesIncludeISV(tx)
	rows, err := tx.Query(`SELECT qty, unit_price, isv_rate, unit_cost FROM order_items WHERE order_id=?`, orderID)
	if err != nil {
		return err
	}
	var grossTotal, netSum, costTotal float64
	for rows.Next() {
		var qty, unitPrice, isvRate, unitCost float64
		if err := rows.Scan(&qty, &unitPrice, &isvRate, &unitCost); err != nil {
			rows.Close()
			return err
		}
		rate := isvRate / 100
		var netUnit, grossUnit float64
		if pricesIncludeISV {
			grossUnit = unitPrice
			netUnit = unitPrice / (1 + rate)
		} else {
			netUnit = unitPrice
			grossUnit = unitPrice * (1 + rate)
		}
		grossTotal += grossUnit * qty
		netSum += netUnit * qty
		costTotal += unitCost * qty
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

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

	_, err = tx.Exec(`UPDATE orders SET subtotal=?, discount=?, discount_net=?, isv=?, total=?, cost_total=? WHERE id=?`,
		netTotal, round2(discount), discountNet, isvTotal, total, round2(costTotal), orderID)
	return err
}

// Pay cobra la comanda: aplica descuento, registra los pagos (uno o varios = cuenta
// dividida) y la propina (no gravable), exige una caja abierta y, opcionalmente, emite factura.
func (s *Store) Pay(orderID int64, in PayInput) (Order, error) {
	sessionID, err := s.requireOpenSession()
	if err != nil {
		return Order{}, err
	}
	// Leer settings ANTES de abrir la tx (con MaxOpenConns(1) no se puede tocar s.db dentro).
	var settings map[string]string
	if in.Invoice {
		if settings, err = s.GetSettings(); err != nil {
			return Order{}, err
		}
	}
	tx, err := s.db.Begin()
	if err != nil {
		return Order{}, err
	}
	defer tx.Rollback()

	var status string
	var itemCount int
	if err := tx.QueryRow(`SELECT status, (SELECT COUNT(*) FROM order_items WHERE order_id=o.id) FROM orders o WHERE o.id=?`, orderID).
		Scan(&status, &itemCount); errors.Is(err, sql.ErrNoRows) {
		return Order{}, ErrNotFound
	} else if err != nil {
		return Order{}, err
	}
	switch status {
	case "pagada":
		return Order{}, errors.New("la comanda ya está pagada")
	case "anulada":
		return Order{}, errors.New("la comanda está anulada")
	}
	if itemCount == 0 {
		return Order{}, errors.New("la comanda no tiene platillos")
	}

	if err := recomputeWithDiscount(tx, orderID, in.Discount); err != nil {
		return Order{}, err
	}
	var billTotal float64
	if err := tx.QueryRow(`SELECT total FROM orders WHERE id=?`, orderID).Scan(&billTotal); err != nil {
		return Order{}, err
	}

	payments := in.Payments
	if len(payments) == 0 {
		payments = []PayLineInput{{Method: "efectivo", Amount: billTotal}}
	}
	var paidSum, tipSum float64
	for i, p := range payments {
		if p.Amount < 0 || p.Tip < 0 {
			return Order{}, errors.New("los montos de pago no pueden ser negativos")
		}
		method, err := normalizePaymentMethod(p.Method)
		if err != nil {
			return Order{}, err
		}
		payments[i].Method = method
		paidSum += p.Amount
		tipSum += p.Tip
	}
	if round2(paidSum)+0.009 < billTotal {
		return Order{}, fmt.Errorf("el pago (L %.2f) no cubre el total (L %.2f)", paidSum, billTotal)
	}

	if _, err := tx.Exec(`UPDATE orders SET status='pagada', closed_at=datetime('now','localtime'),
	  tip=?, session_id=?, customer_name=?, customer_rtn=? WHERE id=?`,
		round2(tipSum), sessionID, strings.TrimSpace(in.CustomerName), strings.TrimSpace(in.CustomerRTN), orderID); err != nil {
		return Order{}, err
	}
	for _, p := range payments {
		if _, err := tx.Exec(`INSERT INTO order_payments(order_id, method, amount, tip, reference) VALUES (?,?,?,?,?)`,
			orderID, p.Method, round2(p.Amount), round2(p.Tip), strings.TrimSpace(p.Reference)); err != nil {
			return Order{}, err
		}
	}

	if in.Invoice {
		if err := createInvoiceTx(tx, settings, orderID, strings.TrimSpace(in.CustomerName), strings.TrimSpace(in.CustomerRTN)); err != nil {
			return Order{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return Order{}, err
	}
	return s.GetOrder(orderID)
}

func normalizePaymentMethod(method string) (string, error) {
	m := strings.ToLower(strings.TrimSpace(method))
	if m == "" {
		return "efectivo", nil
	}
	switch m {
	case "efectivo", "tarjeta", "transferencia", "otro":
		return m, nil
	default:
		return "", fmt.Errorf("método de pago inválido: %s", method)
	}
}

// createInvoiceTx guarda el registro fiscal de la comanda (esquema listo para SAR).
// settings se lee fuera de la tx (deadlock-safe con MaxOpenConns(1)).
func createInvoiceTx(tx *sql.Tx, settings map[string]string, orderID int64, buyerName, buyerRTN string) error {
	var subtotal, isv, total float64
	if err := tx.QueryRow(`SELECT subtotal, isv, total FROM orders WHERE id=?`, orderID).Scan(&subtotal, &isv, &total); err != nil {
		return err
	}
	var nextInv int64
	if err := tx.QueryRow(`SELECT COALESCE(MAX(id),0)+1 FROM invoices`).Scan(&nextInv); err != nil {
		return err
	}
	docType := settings["fiscal_doc_type"]
	if docType == "" {
		docType = "factura"
	}
	sequence := fmt.Sprintf("000-001-01-%08d", nextInv)
	_, err := tx.Exec(`INSERT INTO invoices(order_id, doc_type, sequence, cai, buyer_name, buyer_rtn, seller_rtn,
	  subtotal, isv, total, currency) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		orderID, docType, sequence, settings["cai"], buyerName, buyerRTN, settings["company_rtn"],
		subtotal, isv, total, "HNL")
	return err
}

func (s *Store) GetInvoiceByOrder(orderID int64) (Invoice, error) {
	var v Invoice
	err := s.db.QueryRow(`SELECT id, order_id, doc_type, sequence, cai, buyer_name, buyer_rtn, seller_rtn,
	  subtotal, isv, exempt, total, currency, status, issued_at, created_at FROM invoices WHERE order_id=? ORDER BY id DESC LIMIT 1`, orderID).
		Scan(&v.ID, &v.OrderID, &v.DocType, &v.Sequence, &v.CAI, &v.BuyerName, &v.BuyerRTN, &v.SellerRTN,
			&v.Subtotal, &v.ISV, &v.Exempt, &v.Total, &v.Currency, &v.Status, &v.IssuedAt, &v.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return v, ErrNotFound
	}
	return v, err
}

// Void anula una comanda que aún no se ha pagado (libera la mesa).
func (s *Store) Void(orderID int64) (Order, error) {
	status, err := orderStatus(s.db, orderID)
	if err != nil {
		return Order{}, err
	}
	switch status {
	case "pagada":
		return Order{}, errors.New("no se puede anular una comanda ya pagada")
	case "anulada":
		return Order{}, errors.New("la comanda ya está anulada")
	}
	if _, err := s.db.Exec(`UPDATE orders SET status='anulada', closed_at=datetime('now','localtime') WHERE id=?`, orderID); err != nil {
		return Order{}, err
	}
	return s.GetOrder(orderID)
}
