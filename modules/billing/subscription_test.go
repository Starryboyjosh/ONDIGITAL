package billing_test

import (
	"path/filepath"
	"testing"

	"ondigital.hn/billing"
	"ondigital.hn/tenant"
)

func TestLedger_CreateList(t *testing.T) {
	path := filepath.Join(t.TempDir(), "subs.json")
	led, err := billing.OpenLedger(path)
	if err != nil {
		t.Fatal(err)
	}
	tn := tenant.Tenant{
		ID: "demo-tienda", Name: "Abarrotes Demo", Plan: tenant.PlanEnterpriseAI,
		Modules: []string{"onstock"},
	}
	sub, err := led.Create(tn, billing.StatusActive, "demo")
	if err != nil {
		t.Fatal(err)
	}
	if sub.AmountUSD != 199 {
		t.Fatalf("amount %d", sub.AmountUSD)
	}
	led2, err := billing.OpenLedger(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(led2.List()) != 1 {
		t.Fatalf("list %d", len(led2.List()))
	}
	if led2.MonthlyRecurringUSD() != 199 {
		t.Fatalf("mrr %d", led2.MonthlyRecurringUSD())
	}
}
