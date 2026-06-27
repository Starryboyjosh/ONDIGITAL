package store

// Dashboard arma el resumen operativo del día (ventas, mesas, cocina, top platillos).
func (s *Store) Dashboard() (Dashboard, error) {
	var d Dashboard

	if _, err := s.CurrentSession(); err == nil {
		d.SessionOpen = true
	}

	_ = s.db.QueryRow(`SELECT COALESCE(SUM(total),0), COUNT(*), COALESCE(SUM(tip),0)
	  FROM orders WHERE status='pagada' AND date(closed_at)=date('now','localtime')`).
		Scan(&d.SalesToday, &d.OrdersToday, &d.TipsToday)
	d.SalesToday = round2(d.SalesToday)
	d.TipsToday = round2(d.TipsToday)
	if d.OrdersToday > 0 {
		d.AvgTicket = round2(d.SalesToday / float64(d.OrdersToday))
	}

	_ = s.db.QueryRow(`SELECT COUNT(*) FROM orders WHERE status IN ('abierta','por_cobrar')`).Scan(&d.OpenOrders)
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM dining_tables WHERE active=1`).Scan(&d.TablesTotal)
	_ = s.db.QueryRow(`SELECT COUNT(DISTINCT table_id) FROM orders WHERE status IN ('abierta','por_cobrar') AND table_id IS NOT NULL`).Scan(&d.TablesBusy)
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM order_items WHERE sent_at!='' AND kitchen_status IN ('pendiente','en_preparacion','listo')`).Scan(&d.KitchenOpen)

	top, err := s.topItemsToday(8)
	if err != nil {
		return d, err
	}
	d.TopItems = top

	recent, err := s.ListOrders(OrderFilter{Status: "pagada", Limit: 8})
	if err != nil {
		return d, err
	}
	d.RecentOrders = recent
	return d, nil
}

func (s *Store) topItemsToday(limit int) ([]TopItem, error) {
	rows, err := s.db.Query(`SELECT i.name, SUM(i.qty), SUM(i.qty * i.unit_price)
	  FROM order_items i JOIN orders o ON o.id = i.order_id
	  WHERE o.status='pagada' AND date(o.closed_at)=date('now','localtime')
	  GROUP BY i.name ORDER BY SUM(i.qty) DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []TopItem{}
	for rows.Next() {
		var t TopItem
		if err := rows.Scan(&t.Name, &t.Qty, &t.Total); err != nil {
			return nil, err
		}
		t.Total = round2(t.Total)
		out = append(out, t)
	}
	return out, rows.Err()
}
