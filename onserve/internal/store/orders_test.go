package store

import (
	"math"
	"testing"
)

func newTestStore(t *testing.T) *Store {
	t.Helper()
	st, err := Open(t.TempDir())
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { st.Close() })
	return st
}

func firstTableID(t *testing.T, st *Store) int64 {
	t.Helper()
	tables, err := st.ListTables()
	if err != nil || len(tables) == 0 {
		t.Fatalf("ListTables: %v (n=%d)", err, len(tables))
	}
	return tables[0].ID
}

func firstZoneID(t *testing.T, st *Store) int64 {
	t.Helper()
	zones, err := st.ListZones()
	if err != nil || len(zones) == 0 {
		t.Fatalf("ListZones: %v (n=%d)", err, len(zones))
	}
	return zones[0].ID
}

func tableByID(t *testing.T, st *Store, id int64) Table {
	t.Helper()
	tables, err := st.ListTables()
	if err != nil {
		t.Fatalf("ListTables: %v", err)
	}
	for _, tb := range tables {
		if tb.ID == id {
			return tb
		}
	}
	t.Fatalf("table %d not found", id)
	return Table{}
}

func itemIDByName(t *testing.T, st *Store, name string) int64 {
	t.Helper()
	items, err := st.ListMenuItems(MenuItemFilter{Query: name})
	if err != nil || len(items) == 0 {
		t.Fatalf("menu item %q not found: %v", name, err)
	}
	return items[0].ID
}

func approx(a, b float64) bool { return math.Abs(a-b) < 0.005 }

// openOrderWithBaleadas abre una comanda en M1 con 2 Baleadas (precio 70, ISV 15% incluido).
func openOrderWithBaleadas(t *testing.T, st *Store) Order {
	t.Helper()
	tid := firstTableID(t, st)
	ord, err := st.OpenOrder(NewOrderInput{TableID: &tid, Guests: 2})
	if err != nil {
		t.Fatalf("OpenOrder: %v", err)
	}
	ord, err = st.AddItem(ord.ID, AddItemInput{MenuItemID: itemIDByName(t, st, "Baleadas"), Qty: 2})
	if err != nil {
		t.Fatalf("AddItem: %v", err)
	}
	return ord
}

func TestISVIncludedMath(t *testing.T) {
	st := newTestStore(t)
	ord := openOrderWithBaleadas(t, st)
	// 2 × 70 = 140 con ISV incluido → neto 121.74, ISV 18.26, total 140.00
	if !approx(ord.Total, 140) {
		t.Errorf("total = %.2f, quiero 140.00", ord.Total)
	}
	if !approx(ord.Subtotal, 121.74) {
		t.Errorf("subtotal (neto) = %.2f, quiero 121.74", ord.Subtotal)
	}
	if !approx(ord.ISV, 18.26) {
		t.Errorf("ISV = %.2f, quiero 18.26", ord.ISV)
	}
	if !approx(round2(ord.Subtotal+ord.ISV), ord.Total) {
		t.Errorf("invariante neto+ISV=total roto: %.2f + %.2f != %.2f", ord.Subtotal, ord.ISV, ord.Total)
	}
}

func TestTipIsNotTaxableRevenue(t *testing.T) {
	st := newTestStore(t)
	ord := openOrderWithBaleadas(t, st)
	if _, err := st.OpenSession(OpenSessionInput{OpeningCash: 1000}); err != nil {
		t.Fatalf("OpenSession: %v", err)
	}
	paid, err := st.Pay(ord.ID, PayInput{Payments: []PayLineInput{
		{Method: "efectivo", Amount: 100, Tip: 15},
		{Method: "tarjeta", Amount: 40},
	}})
	if err != nil {
		t.Fatalf("Pay: %v", err)
	}
	if paid.Status != "pagada" {
		t.Errorf("status = %q, quiero pagada", paid.Status)
	}
	// La propina se registra aparte y NO cambia el total gravable ni el ISV.
	if !approx(paid.Total, 140) {
		t.Errorf("total gravable = %.2f, quiero 140.00 (la propina no debe sumarse)", paid.Total)
	}
	if !approx(paid.ISV, 18.26) {
		t.Errorf("ISV = %.2f, quiero 18.26 (la propina no genera ISV)", paid.ISV)
	}
	if !approx(paid.Tip, 15) {
		t.Errorf("propina = %.2f, quiero 15.00", paid.Tip)
	}
}

func TestSplitPaymentsMustCoverTotal(t *testing.T) {
	st := newTestStore(t)
	ord := openOrderWithBaleadas(t, st)
	if _, err := st.OpenSession(OpenSessionInput{OpeningCash: 0}); err != nil {
		t.Fatalf("OpenSession: %v", err)
	}
	// Pagos que no cubren el total (130 < 140) deben fallar.
	_, err := st.Pay(ord.ID, PayInput{Payments: []PayLineInput{
		{Method: "efectivo", Amount: 70},
		{Method: "tarjeta", Amount: 60},
	}})
	if err == nil {
		t.Fatal("se esperaba error: el pago no cubre el total")
	}
	// Pagos divididos que suman el total deben pasar.
	paid, err := st.Pay(ord.ID, PayInput{Payments: []PayLineInput{
		{Method: "efectivo", Amount: 70},
		{Method: "tarjeta", Amount: 70},
	}})
	if err != nil {
		t.Fatalf("Pay dividido: %v", err)
	}
	if len(paid.Payments) != 2 {
		t.Errorf("pagos = %d, quiero 2 (cuenta dividida)", len(paid.Payments))
	}
}

func TestInvalidPaymentMethodRejected(t *testing.T) {
	st := newTestStore(t)
	ord := openOrderWithBaleadas(t, st)
	if _, err := st.OpenSession(OpenSessionInput{}); err != nil {
		t.Fatalf("OpenSession: %v", err)
	}
	if _, err := st.Pay(ord.ID, PayInput{Payments: []PayLineInput{
		{Method: "cripto", Amount: ord.Total},
	}}); err == nil {
		t.Fatal("se esperaba error por método de pago inválido")
	}
}

func TestProportionalDiscount(t *testing.T) {
	st := newTestStore(t)
	ord := openOrderWithBaleadas(t, st)
	if _, err := st.OpenSession(OpenSessionInput{OpeningCash: 0}); err != nil {
		t.Fatalf("OpenSession: %v", err)
	}
	paid, err := st.Pay(ord.ID, PayInput{Discount: 40}) // 140 - 40 = 100
	if err != nil {
		t.Fatalf("Pay: %v", err)
	}
	if !approx(paid.Total, 100) {
		t.Errorf("total con descuento = %.2f, quiero 100.00", paid.Total)
	}
	if !approx(paid.Subtotal, 86.96) {
		t.Errorf("neto con descuento = %.2f, quiero 86.96", paid.Subtotal)
	}
	if !approx(paid.ISV, 13.04) {
		t.Errorf("ISV con descuento = %.2f, quiero 13.04", paid.ISV)
	}
	if !approx(round2(paid.Subtotal+paid.ISV), paid.Total) {
		t.Errorf("invariante neto+ISV=total roto tras descuento")
	}
}

func TestPayRequiresOpenSession(t *testing.T) {
	st := newTestStore(t)
	ord := openOrderWithBaleadas(t, st)
	if _, err := st.Pay(ord.ID, PayInput{}); err == nil {
		t.Fatal("se esperaba error: no hay sesión de caja abierta")
	}
}

func TestDoubleOpenTableRejected(t *testing.T) {
	st := newTestStore(t)
	tid := firstTableID(t, st)
	if _, err := st.OpenOrder(NewOrderInput{TableID: &tid}); err != nil {
		t.Fatalf("primera apertura: %v", err)
	}
	if _, err := st.OpenOrder(NewOrderInput{TableID: &tid}); err == nil {
		t.Fatal("se esperaba error al abrir una segunda comanda en la misma mesa")
	}
}

func TestOpenOrderClearsReservationAndInactiveTableRejected(t *testing.T) {
	st := newTestStore(t)
	tid := firstTableID(t, st)
	if _, err := st.SetTableReserved(tid, true, "8:00 pm"); err != nil {
		t.Fatalf("SetTableReserved: %v", err)
	}
	ord, err := st.OpenOrder(NewOrderInput{TableID: &tid})
	if err != nil {
		t.Fatalf("OpenOrder: %v", err)
	}
	if _, err := st.Void(ord.ID); err != nil {
		t.Fatalf("Void: %v", err)
	}
	if tableByID(t, st, tid).Reserved {
		t.Fatal("la reserva debía limpiarse al abrir la comanda")
	}

	tb := tableByID(t, st, tid)
	tb.Active = false
	if _, err := st.UpdateTable(tid, tb); err != nil {
		t.Fatalf("UpdateTable inactive: %v", err)
	}
	if _, err := st.OpenOrder(NewOrderInput{TableID: &tid}); err == nil {
		t.Fatal("se esperaba error al abrir una mesa inactiva")
	}
}

func TestReserveAndDeleteBlockedWithOpenOrder(t *testing.T) {
	st := newTestStore(t)
	tid := firstTableID(t, st)
	if _, err := st.OpenOrder(NewOrderInput{TableID: &tid}); err != nil {
		t.Fatalf("OpenOrder: %v", err)
	}
	if _, err := st.SetTableReserved(tid, true, "ocupada"); err == nil {
		t.Fatal("se esperaba error al reservar una mesa con comanda abierta")
	}
	if err := st.DeleteTable(tid); err == nil {
		t.Fatal("se esperaba error al eliminar una mesa con comanda abierta")
	}
	if err := st.DeleteZone(firstZoneID(t, st)); err == nil {
		t.Fatal("se esperaba error al eliminar una zona con comanda abierta")
	}
}

func TestVoidFreesTableAndBlocksAfterPaid(t *testing.T) {
	st := newTestStore(t)
	tid := firstTableID(t, st)
	ord, err := st.OpenOrder(NewOrderInput{TableID: &tid})
	if err != nil {
		t.Fatalf("OpenOrder: %v", err)
	}
	if _, err := st.AddItem(ord.ID, AddItemInput{MenuItemID: itemIDByName(t, st, "Café"), Qty: 1}); err != nil {
		t.Fatalf("AddItem: %v", err)
	}
	voided, err := st.Void(ord.ID)
	if err != nil {
		t.Fatalf("Void: %v", err)
	}
	if voided.Status != "anulada" {
		t.Errorf("status = %q, quiero anulada", voided.Status)
	}

	// La mesa quedó libre tras anular: abrir una comanda nueva en M1 debe funcionar
	// (si siguiera "ocupada", openOrderWithBaleadas fallaría). La usamos para el caso pagado.
	if _, err := st.OpenSession(OpenSessionInput{}); err != nil {
		t.Fatalf("OpenSession: %v", err)
	}
	ord2 := openOrderWithBaleadas(t, st)
	if _, err := st.Pay(ord2.ID, PayInput{}); err != nil {
		t.Fatalf("Pay: %v", err)
	}
	// Una comanda pagada no se puede anular.
	if _, err := st.Void(ord2.ID); err == nil {
		t.Fatal("se esperaba error al anular una comanda pagada")
	}
}

func TestKitchenFlow(t *testing.T) {
	st := newTestStore(t)
	ord := openOrderWithBaleadas(t, st)
	if _, err := st.AdvanceItem(ord.Items[0].ID, "listo"); err == nil {
		t.Fatal("se esperaba error al avanzar cocina antes de enviar")
	}
	// Antes de enviar a cocina no hay tickets.
	if q, _ := st.KitchenQueue(""); len(q) != 0 {
		t.Errorf("cola de cocina = %d antes de enviar, quiero 0", len(q))
	}
	if _, err := st.Fire(ord.ID); err != nil {
		t.Fatalf("Fire: %v", err)
	}
	q, err := st.KitchenQueue("")
	if err != nil || len(q) != 1 {
		t.Fatalf("cola de cocina tras enviar = %d (err %v), quiero 1", len(q), err)
	}
	if _, err := st.AdvanceItem(q[0].ItemID, "servido"); err != nil {
		t.Fatalf("AdvanceItem: %v", err)
	}
	if q2, _ := st.KitchenQueue(""); len(q2) != 0 {
		t.Errorf("cola de cocina tras servir = %d, quiero 0", len(q2))
	}
}

func TestCloseSessionRejectsOpenOrders(t *testing.T) {
	st := newTestStore(t)
	tid := firstTableID(t, st)
	if _, err := st.OpenSession(OpenSessionInput{OpeningCash: 100}); err != nil {
		t.Fatalf("OpenSession: %v", err)
	}
	ord, err := st.OpenOrder(NewOrderInput{TableID: &tid})
	if err != nil {
		t.Fatalf("OpenOrder: %v", err)
	}
	if _, err := st.CloseSession(CloseSessionInput{ClosingCash: 100}); err == nil {
		t.Fatal("se esperaba error al cerrar caja con comanda abierta")
	}
	if _, err := st.Void(ord.ID); err != nil {
		t.Fatalf("Void: %v", err)
	}
	if _, err := st.CloseSession(CloseSessionInput{ClosingCash: 100}); err != nil {
		t.Fatalf("CloseSession tras anular: %v", err)
	}
}
