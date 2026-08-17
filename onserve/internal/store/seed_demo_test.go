package store_test

import (
  "testing"

  "onserve/internal/store"
)

func TestSeedDemo(t *testing.T) {
  st, err := store.Open(t.TempDir())
  if err != nil {
    t.Fatal(err)
  }
  t.Cleanup(func() { _ = st.Close() })

  report, err := st.SeedDemo(false)
  if err != nil {
    t.Fatal(err)
  }
  if report.PaidOrders != 2 || report.OpenOrders != 1 || report.Invoices != 2 || !report.SessionOpen {
    t.Fatalf("seed demasiado corto: %+v", report)
  }

  orders, err := st.ListOrders(store.OrderFilter{Limit: 20})
  if err != nil {
    t.Fatal(err)
  }
  if len(orders) != 3 {
    t.Fatalf("esperaba 3 comandas, obtuve %d", len(orders))
  }

  queue, err := st.KitchenQueue("")
  if err != nil {
    t.Fatal(err)
  }
  if len(queue) == 0 {
    t.Fatal("esperaba una comanda visible en cocina")
  }

  if _, err := st.SeedDemo(false); err == nil {
    t.Fatal("esperaba error al repetir la semilla sin force")
  }

  forced, err := st.SeedDemo(true)
  if err != nil {
    t.Fatal(err)
  }
  if forced.PaidOrders != report.PaidOrders || forced.OpenOrders != report.OpenOrders {
    t.Fatalf("force inconsistente: %+v vs %+v", forced, report)
  }
}
