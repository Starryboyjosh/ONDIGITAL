package httpapi

// Template describe una plantilla Pro disponible para el generador. En Phase 1
// es un catálogo de diseño (productized=false); en Phase 6 cada plantilla se
// materializa en onstudio/templates/<id>/ con su template.json y código real.
type Template struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Source      string   `json:"source"`
	Stack       string   `json:"stack"`
	SiteTypes   []string `json:"site_types"`
	Productized bool     `json:"productized"`
}

// catalog refleja onstudio/templates/MANIFEST.md y docs/onstudio/template-catalog.md.
var catalog = []Template{
	{ID: "landing-institucional", Name: "Landing institucional", Source: "Pagina_Web_Original/", Stack: "static-html", SiteTypes: []string{"landing", "catalog"}},
	{ID: "dental-saas", Name: "SaaS dental por módulos", Source: "credental/", Stack: "static-html", SiteTypes: []string{"saas-clinico"}},
	{ID: "pos-inventory-erp", Name: "POS e inventario (mini-ERP)", Source: "onstock/", Stack: "go-embed-sqlite", SiteTypes: []string{"pos", "erp-lite"}},
	{ID: "restaurant-ops", Name: "Operación de restaurante", Source: "onserve/", Stack: "go-embed-sqlite", SiteTypes: []string{"restaurant"}},
	{ID: "saas-dashboard-generic", Name: "Dashboard SaaS genérico", Source: "skill SaaS + house style", Stack: "tbd", SiteTypes: []string{"saas"}},
}

// pickTemplate elige una plantilla por site_type. Si no hay coincidencia, cae al
// fallback documentado (landing para sitios de contenido, saas genérico para apps).
func pickTemplate(siteType string) string {
	for _, t := range catalog {
		for _, st := range t.SiteTypes {
			if st == siteType {
				return t.ID
			}
		}
	}
	switch siteType {
	case "landing", "catalog", "sitio-informativo":
		return "landing-institucional"
	default:
		return "saas-dashboard-generic"
	}
}
