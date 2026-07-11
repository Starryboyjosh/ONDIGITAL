package vitohost_test

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"ondigital.hn/vito"
	"onstock/internal/store"
	"onstock/internal/vitohost"
)

func TestTools_ListLowStockAndAsk(t *testing.T) {
	st := openTestStore(t)
	seedLowStock(t, st)

	reg := vito.NewRegistry()
	if err := vitohost.RegisterOnStockTools(reg, st); err != nil {
		t.Fatal(err)
	}
	svc, err := vito.New(vito.Config{Enabled: true}, vito.NewMockProvider(), reg)
	if err != nil {
		t.Fatal(err)
	}

	res, err := svc.Ask(context.Background(), vito.AskRequest{
		Message: "¿qué productos están por agotarse?",
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.Reply == "" {
		t.Fatal("empty reply")
	}
	if !strings.Contains(res.Reply, "Guantes") && !strings.Contains(strings.ToLower(res.Reply), "agot") {
		// Should mention product name from DB
		if !strings.Contains(res.Reply, "Nitrilo") {
			t.Fatalf("expected product data in reply: %q", res.Reply)
		}
	}
	if len(res.Citations) == 0 {
		t.Fatal("expected citations")
	}
	if res.Citations[0].Source != "onstock.products.low_stock" {
		t.Fatalf("citation = %+v", res.Citations[0])
	}
	for _, ban := range []string{"claude", "openai", "opencode", "chatgpt"} {
		if strings.Contains(strings.ToLower(res.Reply), ban) {
			t.Fatalf("vendor leak %s", ban)
		}
	}
}

func TestTools_CreateRestockPO_PendingThenConfirm(t *testing.T) {
	st := openTestStore(t)
	seedLowStock(t, st)

	reg := vito.NewRegistry()
	if err := vitohost.RegisterOnStockTools(reg, st); err != nil {
		t.Fatal(err)
	}
	svc, err := vito.New(vito.Config{Enabled: true}, vito.NewMockProvider(), reg)
	if err != nil {
		t.Fatal(err)
	}

	ask, err := svc.Ask(context.Background(), vito.AskRequest{
		Message: "Genera la orden de compra de lo que falta",
	})
	if err != nil {
		t.Fatal(err)
	}
	if ask.PendingAction == nil {
		t.Fatalf("expected pending action, got reply %q", ask.Reply)
	}
	if ask.PendingAction.ToolName != "create_restock_po" {
		t.Fatalf("tool = %s", ask.PendingAction.ToolName)
	}

	// Not created yet
	pos, err := st.ListPurchaseOrders(store.POFilter{})
	if err != nil {
		t.Fatal(err)
	}
	if len(pos) != 0 {
		t.Fatalf("PO should not exist before confirm, got %d", len(pos))
	}

	confirmed, err := svc.ConfirmAction(context.Background(), ask.PendingAction.ToolName, ask.PendingAction.Arguments)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(confirmed.Reply, "OC-") && !strings.Contains(strings.ToLower(confirmed.Reply), "orden") {
		t.Fatalf("confirm reply = %q", confirmed.Reply)
	}
	pos, err = st.ListPurchaseOrders(store.POFilter{})
	if err != nil {
		t.Fatal(err)
	}
	if len(pos) != 1 {
		t.Fatalf("expected 1 PO, got %d", len(pos))
	}
}

func TestTools_SalesSummary(t *testing.T) {
	st := openTestStore(t)
	reg := vito.NewRegistry()
	if err := vitohost.RegisterOnStockTools(reg, st); err != nil {
		t.Fatal(err)
	}
	res, err := reg.Run(context.Background(), vito.ToolCall{
		ID: "1", Name: "sales_summary",
		Arguments: map[string]any{"period": "7d"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !res.OK {
		t.Fatalf("not ok: %s", res.Error)
	}
	var payload map[string]any
	if err := json.Unmarshal([]byte(res.Content), &payload); err != nil {
		t.Fatal(err)
	}
	if payload["summary"] == nil {
		t.Fatal("missing summary")
	}
}

func openTestStore(t *testing.T) *store.Store {
	t.Helper()
	st, err := store.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = st.Close() })
	return st
}

func seedLowStock(t *testing.T, st *store.Store) {
	t.Helper()
	sp, err := st.CreateSupplier(store.Supplier{Name: "Distribuidora Demo", Active: true})
	if err != nil {
		t.Fatal(err)
	}
	sid := sp.ID
	p, err := st.CreateProduct(store.Product{
		SKU: "GLO-M", Name: "Guantes Nitrilo M", Cost: 10, Price: 25,
		Stock: 2, MinStock: 10, SupplierID: &sid, Active: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if p.ID == 0 {
		t.Fatal("product id 0")
	}
	_, err = st.CreateProduct(store.Product{
		SKU: "GAS-E", Name: "Gasas estériles", Cost: 5, Price: 12,
		Stock: 0, MinStock: 5, SupplierID: &sid, Active: true,
	})
	if err != nil {
		t.Fatal(err)
	}
}
