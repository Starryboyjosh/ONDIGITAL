package store

import (
	"database/sql"
	"errors"
	"strings"
)

// KitchenQueue devuelve las líneas enviadas a cocina que siguen en preparación
// (pendiente / en_preparacion / listo), opcionalmente filtradas por estación.
func (s *Store) KitchenQueue(station string) ([]KitchenTicket, error) {
	where := []string{"i.sent_at != ''", "i.kitchen_status IN ('pendiente','en_preparacion','listo')",
		"o.status IN ('abierta','por_cobrar')"}
	args := []any{}
	if station != "" {
		where = append(where, "i.station = ?")
		args = append(args, station)
	}
	rows, err := s.db.Query(`SELECT i.id, i.order_id, o.order_number, COALESCE(t.name,''), i.name, i.qty,
	  i.course, i.station, i.kitchen_status, i.notes, i.sent_at,
	  CAST((julianday('now','localtime') - julianday(i.sent_at)) * 24 * 60 AS INTEGER)
	  FROM order_items i
	  JOIN orders o ON o.id = i.order_id
	  LEFT JOIN dining_tables t ON t.id = o.table_id
	  WHERE `+strings.Join(where, " AND ")+`
	  ORDER BY i.sent_at, i.id`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []KitchenTicket{}
	for rows.Next() {
		var k KitchenTicket
		if err := rows.Scan(&k.ItemID, &k.OrderID, &k.OrderNumber, &k.TableName, &k.Name, &k.Qty,
			&k.Course, &k.Station, &k.Status, &k.Notes, &k.SentAt, &k.WaitMinutes); err != nil {
			return nil, err
		}
		out = append(out, k)
	}
	return out, rows.Err()
}

var kitchenStatuses = map[string]bool{
	"pendiente": true, "en_preparacion": true, "listo": true, "servido": true, "cancelado": true,
}

// AdvanceItem cambia el estado de cocina de una línea y registra los tiempos.
func (s *Store) AdvanceItem(itemID int64, status string) (OrderItem, error) {
	if !kitchenStatuses[status] {
		return OrderItem{}, errors.New("estado de cocina inválido")
	}
	var sentAt, orderStatus string
	err := s.db.QueryRow(`SELECT i.sent_at, o.status
	  FROM order_items i JOIN orders o ON o.id = i.order_id
	  WHERE i.id=?`, itemID).Scan(&sentAt, &orderStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return OrderItem{}, ErrNotFound
	}
	if err != nil {
		return OrderItem{}, err
	}
	if sentAt == "" {
		return OrderItem{}, errors.New("el platillo aún no fue enviado a cocina")
	}
	if orderStatus != "abierta" && orderStatus != "por_cobrar" {
		return OrderItem{}, errors.New("la comanda ya no acepta cambios de cocina")
	}
	set := "kitchen_status=?"
	switch status {
	case "listo":
		set += ", ready_at=datetime('now','localtime')"
	case "servido":
		set += ", served_at=datetime('now','localtime')"
	}
	res, err := s.db.Exec(`UPDATE order_items SET `+set+` WHERE id=?`, status, itemID)
	if err != nil {
		return OrderItem{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return OrderItem{}, ErrNotFound
	}
	items, err := s.loadOrderItemByID(itemID)
	if err != nil {
		return OrderItem{}, err
	}
	return items, nil
}

func (s *Store) loadOrderItemByID(itemID int64) (OrderItem, error) {
	var it OrderItem
	err := s.db.QueryRow(`SELECT id, order_id, menu_item_id, name, qty, unit_price, isv_rate, unit_cost,
	  course, station, kitchen_status, sent_at, ready_at, served_at, notes, created_at
	  FROM order_items WHERE id=?`, itemID).
		Scan(&it.ID, &it.OrderID, &it.MenuItemID, &it.Name, &it.Qty, &it.UnitPrice, &it.ISVRate,
			&it.UnitCost, &it.Course, &it.Station, &it.KitchenStatus, &it.SentAt, &it.ReadyAt, &it.ServedAt,
			&it.Notes, &it.CreatedAt)
	return it, err
}
