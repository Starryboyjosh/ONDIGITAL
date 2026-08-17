package store

import (
  "errors"
  "fmt"
)

// SeedReport resume los datos sintéticos cargados para una demostración.
type SeedReport struct {
  Forced       bool `json:"forced"`
  Zones        int  `json:"zones"`
  Tables       int  `json:"tables"`
  MenuItems    int  `json:"menu_items"`
  PaidOrders   int  `json:"paid_orders"`
  OpenOrders   int  `json:"open_orders"`
  Invoices     int  `json:"invoices"`
  SessionOpen  bool `json:"session_open"`
}

// SeedDemo prepara un restaurante sintético con actividad visible en salón,
// cocina y caja. No se ejecuta automáticamente: se invoca con -seed-demo.
func (s *Store) SeedDemo(force bool) (report SeedReport, err error) {
  var existingOrders int
  if err := s.db.QueryRow(`SELECT COUNT(*) FROM orders`).Scan(&existingOrders); err != nil {
    return SeedReport{}, err
  }
  var seeded string
  _ = s.db.QueryRow(`SELECT value FROM settings WHERE key='demo_seeded'`).Scan(&seeded)
	if !force && (existingOrders > 0 || seeded == "1") {
		return SeedReport{}, errors.New("ya hay datos de demo; usa -seed-demo-force para reemplazarlos")
	}

	previousSettings, err := s.GetSettings()
	if err != nil {
		return SeedReport{}, err
	}
	if !force {
		if _, sessionErr := s.CurrentSession(); sessionErr == nil {
			return SeedReport{}, errors.New("ya hay una sesión de caja abierta")
		} else if !errors.Is(sessionErr, ErrNotFound) {
			return SeedReport{}, sessionErr
		}
	}

	zones, err := s.ListZones()
  if err != nil {
    return SeedReport{}, err
  }
  tables, err := s.ListTables()
  if err != nil {
    return SeedReport{}, err
  }
  menuItems, err := s.ListMenuItems(MenuItemFilter{OnlyActive: true})
  if err != nil {
    return SeedReport{}, err
  }
	if len(zones) == 0 || len(tables) < 3 || len(menuItems) == 0 {
		return SeedReport{}, errors.New("el salón o el menú demo no están inicializados")
  }

  tableByName := map[string]Table{}
  for _, table := range tables {
    tableByName[table.Name] = table
  }
  itemByCode := map[string]MenuItem{}
	for _, item := range menuItems {
		itemByCode[item.Code] = item
	}
	for _, tableName := range []string{"M1", "M2", "M3"} {
		if _, ok := tableByName[tableName]; !ok {
			return SeedReport{}, fmt.Errorf("mesa demo no encontrada: %s", tableName)
		}
	}
	for _, itemCode := range []string{"ENT-01", "BEB-01", "FUE-01", "BEB-02", "POS-01", "FUE-02", "BEB-03"} {
		if _, ok := itemByCode[itemCode]; !ok {
			return SeedReport{}, fmt.Errorf("platillo demo no encontrado: %s", itemCode)
		}
	}

	settingsChanged := false
	transactionsStarted := false
	defer func() {
		if err == nil || !settingsChanged {
			return
		}
		if transactionsStarted {
			_ = s.clearDemoTransactions()
		}
		_ = s.restoreSettings(previousSettings)
	}()

	if force {
		if err = s.clearDemoTransactions(); err != nil {
			return SeedReport{}, err
		}
	}
	if err = s.SetSettings(map[string]string{
		"company_name":       "Café Valle HN",
		"company_rtn":        "0801-0000-000001",
		"company_address":    "Barrio El Centro, Tegucigalpa, F.M.",
		"company_phone":      "+504 9999-0101",
		"currency_symbol":    "L",
		"isv_rate_default":   "15",
		"isr_rate":           "25",
		"prices_include_isv": "1",
		"tip_suggest_rate":   "10",
		"demo_seeded":        "1",
	}); err != nil {
		return SeedReport{}, err
	}
	settingsChanged = true

	session, err := s.OpenSession(OpenSessionInput{OpenedBy: "María López (demo)", OpeningCash: 1500})
	if err != nil {
		return SeedReport{}, err
	}
	transactionsStarted = true

  type line struct {
    code string
    qty  float64
  }
  createOrder := func(tableName, customer string, lines []line) (Order, error) {
    table, ok := tableByName[tableName]
    if !ok {
      return Order{}, fmt.Errorf("mesa demo no encontrada: %s", tableName)
    }
    tableID := table.ID
    order, err := s.OpenOrder(NewOrderInput{
      TableID: &tableID,
      Type:    "mesa",
      Guests:  table.Seats,
      Waiter:  "Carlos (demo)",
    })
    if err != nil {
      return Order{}, err
    }
    for _, line := range lines {
      item, ok := itemByCode[line.code]
      if !ok {
        return Order{}, fmt.Errorf("platillo demo no encontrado: %s", line.code)
      }
      order, err = s.AddItem(order.ID, AddItemInput{MenuItemID: item.ID, Qty: line.qty, Course: "fuerte"})
      if err != nil {
        return Order{}, err
      }
    }
    order, err = s.Fire(order.ID)
    if err != nil {
      return Order{}, err
    }
    if customer != "" {
      order, err = s.RequestBill(order.ID)
      if err != nil {
        return Order{}, err
      }
      _, err = s.Pay(order.ID, PayInput{
        CustomerName: customer,
        CustomerRTN:  "0801-0000-000002",
        Invoice:      true,
        Payments:     []PayLineInput{{Method: "efectivo", Amount: order.Total, Tip: 25}},
      })
      if err != nil {
        return Order{}, err
      }
      return s.GetOrder(order.ID)
    }
    return order, nil
  }

  _, err = createOrder("M1", "Cliente demo", []line{{"ENT-01", 2}, {"BEB-01", 2}})
  if err != nil {
    return SeedReport{}, fmt.Errorf("comanda demo 1: %w", err)
  }

  second, err := createOrder("M2", "Ana García (demo)", []line{{"FUE-01", 1}, {"BEB-02", 2}, {"POS-01", 1}})
  if err != nil {
    return SeedReport{}, fmt.Errorf("comanda demo 2: %w", err)
  }
  // Reemplaza el pago único de la segunda comanda por dos métodos para que
  // la pantalla de caja tenga un caso de cuenta dividida reproducible.
  if err := s.replaceDemoPayment(second.ID); err != nil {
    return SeedReport{}, err
  }

  if _, err := createOrder("M3", "", []line{{"FUE-02", 1}, {"BEB-03", 1}}); err != nil {
    return SeedReport{}, fmt.Errorf("comanda abierta demo: %w", err)
  }

  var invoices int
  if err := s.db.QueryRow(`SELECT COUNT(*) FROM invoices`).Scan(&invoices); err != nil {
    return SeedReport{}, err
  }
  var openOrders int
  if err := s.db.QueryRow(`SELECT COUNT(*) FROM orders WHERE status IN ('abierta','por_cobrar')`).Scan(&openOrders); err != nil {
    return SeedReport{}, err
  }

  return SeedReport{
    Forced:      force,
    Zones:       len(zones),
    Tables:      len(tables),
    MenuItems:   len(menuItems),
    PaidOrders:  2,
    OpenOrders:  openOrders,
    Invoices:    invoices,
    SessionOpen: session.Status == "abierta",
  }, nil
}

func (s *Store) replaceDemoPayment(orderID int64) error {
  order, err := s.GetOrder(orderID)
  if err != nil {
    return err
  }
  if _, err := s.db.Exec(`DELETE FROM order_payments WHERE order_id=?`, orderID); err != nil {
    return err
  }
  if _, err := s.db.Exec(`UPDATE orders SET tip=0 WHERE id=?`, orderID); err != nil {
    return err
  }
  first := round2(order.Total / 2)
  second := round2(order.Total - first)
  _, err = s.db.Exec(`INSERT INTO order_payments(order_id, method, amount, tip, reference) VALUES (?,?,?,?,?)`,
    orderID, "tarjeta", first, 0, "demo-tarjeta")
  if err != nil {
    return err
  }
  _, err = s.db.Exec(`INSERT INTO order_payments(order_id, method, amount, tip, reference) VALUES (?,?,?,?,?)`,
    orderID, "transferencia", second, 0, "demo-transferencia")
  return err
}

func (s *Store) clearDemoTransactions() error {
  tx, err := s.db.Begin()
  if err != nil {
    return err
  }
  defer tx.Rollback()
  for _, statement := range []string{
    `DELETE FROM order_payments`,
    `DELETE FROM order_items`,
    `DELETE FROM invoices`,
    `DELETE FROM orders`,
    `DELETE FROM register_sessions`,
    `UPDATE dining_tables SET reserved=0, reserved_note=''`,
  } {
    if _, err := tx.Exec(statement); err != nil {
      return fmt.Errorf("limpiando demo (%s): %w", statement, err)
    }
  }
	return tx.Commit()
}

func (s *Store) restoreSettings(values map[string]string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`DELETE FROM settings`); err != nil {
		return err
	}
	for key, value := range values {
		if _, err := tx.Exec(`INSERT INTO settings(key,value) VALUES(?,?)`, key, value); err != nil {
			return err
		}
	}
	return tx.Commit()
}
