package tenant_test

import (
	"testing"

	"ondigital.hn/tenant"
)

func TestParsePlan_AndFlags(t *testing.T) {
	p, err := tenant.ParsePlan("enterprise_ai")
	if err != nil || !p.IncludesVito() || p.PriceUSDMonthly() != 199 {
		t.Fatalf("enterprise: %v %v", p, err)
	}
	b, _ := tenant.ParsePlan("business")
	if b.IncludesVito() || !b.IncludesManagedInfra() {
		t.Fatal("business flags")
	}
	s, _ := tenant.ParsePlan("starter")
	if s.IncludesModuleLibrary() {
		t.Fatal("starter should not include library by default commercial rule")
	}
}

func TestDefaultModules(t *testing.T) {
	m := tenant.DefaultModules(tenant.PlanStarter, "clinica")
	if len(m) != 1 || m[0] != "credental" {
		t.Fatalf("%v", m)
	}
	m = tenant.DefaultModules(tenant.PlanBusiness, "tienda")
	if m[0] != "onstock" {
		t.Fatalf("%v", m)
	}
}

func TestNewID(t *testing.T) {
	id := tenant.NewID("Abarrotes El Progreso")
	if id != "abarrotes-el-progreso" {
		t.Fatalf("%q", id)
	}
}

func TestValidateTenant(t *testing.T) {
	err := tenant.ValidateTenant(tenant.Tenant{ID: "x", Name: "Y", Plan: tenant.PlanStarter})
	if err != nil {
		t.Fatal(err)
	}
	if tenant.ValidateTenant(tenant.Tenant{}) == nil {
		t.Fatal("expected error")
	}
}
