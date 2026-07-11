// Package tenant defines ONDIGITAL commercial plans, roles, and tenant metadata.
// Used by hosts (OnStock) and ops docs/scripts for provisioning.
package tenant

import (
	"fmt"
	"strings"
	"time"
)

// Plan is a commercial accompaniment plan (modelo-negocio).
type Plan string

const (
	PlanStarter       Plan = "starter"        // $99 — app only, client infra
	PlanBusiness      Plan = "business"       // $149 — + managed infra + module library
	PlanEnterpriseAI  Plan = "enterprise_ai"  // $199 — + Vito
)

// Role is a suite user role (not ONDIGITAL staff).
type Role string

const (
	RoleAdmin    Role = "admin"    // full tenant admin
	RoleManager  Role = "gerente"  // ops + reports
	RoleStaff    Role = "empleado" // day-to-day
	RoleViewer   Role = "viewer"   // read-only
)

// Tenant is one client organization (isolation boundary).
type Tenant struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	RTN       string    `json:"rtn,omitempty"`
	Plan      Plan      `json:"plan"`
	Modules   []string  `json:"modules"` // e.g. onstock, credental
	Locale    string    `json:"locale"`
	Currency  string    `json:"currency"`
	CreatedAt time.Time `json:"created_at,omitempty"`
	Notes     string    `json:"notes,omitempty"`
}

// ParsePlan normalizes plan strings.
func ParsePlan(s string) (Plan, error) {
	p := Plan(strings.ToLower(strings.TrimSpace(s)))
	switch p {
	case PlanStarter, PlanBusiness, PlanEnterpriseAI:
		return p, nil
	case "enterprise", "ai", "enterprise-ai":
		return PlanEnterpriseAI, nil
	case "":
		return PlanStarter, nil
	default:
		return "", fmt.Errorf("tenant: plan desconocido %q (starter|business|enterprise_ai)", s)
	}
}

// IncludesVito reports whether the plan includes the Vito assistant.
func (p Plan) IncludesVito() bool {
	return p == PlanEnterpriseAI
}

// IncludesManagedInfra is true for Business and Enterprise AI.
func (p Plan) IncludesManagedInfra() bool {
	return p == PlanBusiness || p == PlanEnterpriseAI
}

// IncludesModuleLibrary is true for Business and Enterprise AI.
func (p Plan) IncludesModuleLibrary() bool {
	return p == PlanBusiness || p == PlanEnterpriseAI
}

// LabelES is the commercial Spanish name.
func (p Plan) LabelES() string {
	switch p {
	case PlanStarter:
		return "Starter"
	case PlanBusiness:
		return "Business"
	case PlanEnterpriseAI:
		return "Enterprise AI"
	default:
		return string(p)
	}
}

// PriceUSDMonthly is the list price from modelo-negocio (informational).
func (p Plan) PriceUSDMonthly() int {
	switch p {
	case PlanStarter:
		return 99
	case PlanBusiness:
		return 149
	case PlanEnterpriseAI:
		return 199
	default:
		return 0
	}
}

// DefaultModules suggests modules for an industry + plan.
// industry: "tienda" | "clinica" | "otro"
func DefaultModules(plan Plan, industry string) []string {
	industry = strings.ToLower(strings.TrimSpace(industry))
	var mods []string
	switch industry {
	case "clinica", "dental", "odontologia", "odontología":
		mods = []string{"credental"}
	case "tienda", "retail", "inventario", "abarrotes":
		mods = []string{"onstock"}
	default:
		// generic: both available in library under Business+
		if plan.IncludesModuleLibrary() {
			mods = []string{"onstock", "credental"}
		} else {
			mods = []string{"onstock"}
		}
	}
	return mods
}

// ValidateTenant checks required fields.
func ValidateTenant(t Tenant) error {
	if strings.TrimSpace(t.ID) == "" {
		return fmt.Errorf("tenant: id es obligatorio")
	}
	if strings.TrimSpace(t.Name) == "" {
		return fmt.Errorf("tenant: name es obligatorio")
	}
	if _, err := ParsePlan(string(t.Plan)); err != nil {
		return err
	}
	return nil
}

// NewID builds a simple slug id from name (ops can override).
func NewID(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		} else if r == ' ' || r == '-' || r == '_' {
			b.WriteByte('-')
		}
	}
	out := strings.Trim(b.String(), "-")
	for strings.Contains(out, "--") {
		out = strings.ReplaceAll(out, "--", "-")
	}
	if out == "" {
		out = "cliente"
	}
	return out
}

// RolePermissions is a coarse matrix for documentation and future enforcement.
func RolePermissions(r Role) []string {
	switch r {
	case RoleAdmin:
		return []string{"todo"}
	case RoleManager:
		return []string{"leer", "escribir", "reportes", "usuarios"}
	case RoleStaff:
		return []string{"leer", "escribir"}
	case RoleViewer:
		return []string{"leer"}
	default:
		return []string{"leer"}
	}
}
