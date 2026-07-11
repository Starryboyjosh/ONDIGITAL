package store

import (
	"strings"
	"time"

	"ondigital.hn/tenant"
)

// TenantFromSettings builds a tenant.Tenant from OnStock settings.
func (s *Store) TenantFromSettings() (tenant.Tenant, error) {
	m, err := s.GetSettings()
	if err != nil {
		return tenant.Tenant{}, err
	}
	plan, _ := tenant.ParsePlan(m["plan"])
	id := strings.TrimSpace(m["tenant_id"])
	name := strings.TrimSpace(m["company_name"])
	if id == "" && name != "" {
		id = tenant.NewID(name)
	}
	if id == "" {
		id = "local"
	}
	mods := []string{"onstock"}
	if v := strings.TrimSpace(m["modules"]); v != "" {
		parts := strings.Split(v, ",")
		mods = mods[:0]
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p != "" {
				mods = append(mods, p)
			}
		}
	}
	return tenant.Tenant{
		ID:       id,
		Name:     name,
		RTN:      m["company_rtn"],
		Plan:     plan,
		Modules:  mods,
		Locale:   firstNonEmpty(m["locale"], "es-HN"),
		Currency: firstNonEmpty(m["currency_symbol"], "L"),
	}, nil
}

// EnsureTenantDefaults writes tenant_id/plan if missing.
func (s *Store) EnsureTenantDefaults() error {
	m, err := s.GetSettings()
	if err != nil {
		return err
	}
	patch := map[string]string{}
	if strings.TrimSpace(m["tenant_id"]) == "" {
		name := firstNonEmpty(m["company_name"], "Mi Empresa")
		patch["tenant_id"] = tenant.NewID(name)
	}
	if strings.TrimSpace(m["plan"]) == "" {
		patch["plan"] = string(tenant.PlanStarter)
	}
	if strings.TrimSpace(m["modules"]) == "" {
		patch["modules"] = "onstock"
	}
	if strings.TrimSpace(m["locale"]) == "" {
		patch["locale"] = "es-HN"
	}
	if len(patch) == 0 {
		return nil
	}
	return s.SetSettings(patch)
}

// SetPlan updates commercial plan and modules suggestion for Vito flag consumers.
func (s *Store) SetPlan(plan tenant.Plan) error {
	p, err := tenant.ParsePlan(string(plan))
	if err != nil {
		return err
	}
	return s.SetSettings(map[string]string{
		"plan": string(p),
		// modules left as-is unless empty
	})
}

// TenantPublic is the JSON shape for GET /api/tenant (no secrets).
type TenantPublic struct {
	Tenant        tenant.Tenant `json:"tenant"`
	PlanLabel     string        `json:"plan_label"`
	PriceUSD      int           `json:"price_usd_monthly"`
	VitoIncluded  bool          `json:"vito_included"`
	ManagedInfra  bool          `json:"managed_infra_included"`
	ModuleLibrary bool          `json:"module_library_included"`
	AsOf          string        `json:"as_of"`
}

// PublicTenantView builds API payload.
func (s *Store) PublicTenantView() (TenantPublic, error) {
	if err := s.EnsureTenantDefaults(); err != nil {
		return TenantPublic{}, err
	}
	t, err := s.TenantFromSettings()
	if err != nil {
		return TenantPublic{}, err
	}
	return TenantPublic{
		Tenant:        t,
		PlanLabel:     t.Plan.LabelES(),
		PriceUSD:      t.Plan.PriceUSDMonthly(),
		VitoIncluded:  t.Plan.IncludesVito(),
		ManagedInfra:  t.Plan.IncludesManagedInfra(),
		ModuleLibrary: t.Plan.IncludesModuleLibrary(),
		AsOf:          time.Now().Format(time.RFC3339),
	}, nil
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}
