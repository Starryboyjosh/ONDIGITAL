// Package templates es el catálogo de plantillas Pro de OnStudio y la lógica de
// selección (tipo de sitio + industria → plantilla). Lo consumen tanto la API
// (para listar plantillas) como el pipeline (para construir el prompt de rebrand).
//
// El catálogo `catalog` es la metadata base de diseño (productized=false). En
// Phase 6 una plantilla se materializa en onstudio/templates/<id>/ con su código y
// su template.json; `LoadFS` (las plantillas viajan embebidas en el binario, o un
// directorio vía `Load`) la superpone sobre el catálogo: marca Productized=true,
// adjunta los archivos base (para que el prompt clone-rebrandee sobre código real)
// y deja que el template.json sea la fuente de verdad de la metadata de esa
// plantilla. Si una plantilla no está, el catálogo base sigue sirviendo
// (degradación elegante, sin caída).
package templates

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path"
	"sort"
	"strings"
)

// Template describe una plantilla Pro disponible para el generador.
type Template struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Source        string   `json:"source"`
	Stack         string   `json:"stack"`
	SiteTypes     []string `json:"site_types"`
	Productized   bool     `json:"productized"`
	Entry         string   `json:"entry,omitempty"`
	RebrandPoints []string `json:"rebrand_points,omitempty"`
	Protected     []string `json:"protected,omitempty"`
	Industries    []string `json:"industries,omitempty"`
	Keywords      []string `json:"keywords,omitempty"`

	// Files son los archivos del sitio base; solo se llenan en plantillas
	// productizadas (cargadas de disco). No se serializan en la API (la lista de
	// plantillas se mantiene liviana); el pipeline los usa para el prompt de clonado.
	Files []File `json:"-"`
}

// File es un archivo del sitio base de una plantilla productizada.
type File struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

// catalog refleja onstudio/templates/MANIFEST.md y docs/onstudio/template-catalog.md.
var catalog = []Template{
	{
		ID: "landing-institucional", Name: "Landing institucional",
		Source: "Pagina_Web_Original/", Stack: "static-html",
		SiteTypes:     []string{"landing", "catalog"},
		RebrandPoints: []string{"business_name", "copy", "theme", "colors", "logo", "pages", "contact", "sample_data"},
		Protected:     []string{"estructura responsive", "accesibilidad/contraste", "sin secretos embebidos"},
		Industries:    []string{"servicios", "retail", "alimentos", "salud", "educación", "construcción", "turismo"},
		Keywords:      []string{"landing", "informativo", "catálogo", "contacto", "whatsapp"},
	},
	{
		ID: "dental-saas", Name: "SaaS dental por módulos",
		Source: "credental/", Stack: "static-html",
		SiteTypes:     []string{"saas-clinico"},
		RebrandPoints: []string{"business_name", "copy", "theme", "colors", "logo", "sample_data"},
		Protected:     []string{"flujos de auth demo (no presentar como producción)", "estructura de módulos", "invariantes de expediente"},
		Industries:    []string{"salud", "dental", "clínica", "consultorio"},
		Keywords:      []string{"expediente", "pacientes", "citas", "odontología"},
	},
	{
		ID: "pos-inventory-erp", Name: "POS e inventario (mini-ERP)",
		Source: "onstock/", Stack: "go-embed-sqlite",
		SiteTypes:     []string{"pos", "erp-lite"},
		RebrandPoints: []string{"business_name", "copy", "theme", "colors", "logo", "sample_data"},
		Protected:     []string{"internal/store/*", "costo promedio ponderado", "reversa de stock", "totales de reporte", "ISV/ISR"},
		Industries:    []string{"retail", "tienda", "abarrotería", "inventario", "ventas", "ferretería"},
		Keywords:      []string{"punto de venta", "stock", "proveedores", "caja", "inventario"},
	},
	{
		ID: "restaurant-ops", Name: "Operación de restaurante",
		Source: "onserve/", Stack: "go-embed-sqlite",
		SiteTypes:     []string{"restaurant"},
		RebrandPoints: []string{"business_name", "copy", "theme", "colors", "logo", "sample_data", "menú"},
		Protected:     []string{"internal/store/*", "cálculo de cuentas/caja", "estados de orden cocina-piso"},
		Industries:    []string{"restaurante", "comida", "cafetería", "bar", "comedor"},
		Keywords:      []string{"mesas", "cocina", "comandas", "menú", "caja"},
	},
	{
		ID: "saas-dashboard-generic", Name: "Dashboard SaaS genérico",
		Source: "skill SaaS + house style", Stack: "tbd",
		SiteTypes:     []string{"saas"},
		RebrandPoints: []string{"business_name", "copy", "theme", "colors", "logo", "módulos", "sample_data"},
		Protected:     []string{"separación cliente/servidor", "validación de formularios", "sin secretos embebidos"},
		Industries:    []string{"software", "servicios", "operaciones", "administración"},
		Keywords:      []string{"dashboard", "panel", "módulos", "reportes", "gestión"},
	},
}

// loaded superpone plantillas productizadas (de disco) sobre el catálogo, por id.
// Se llena una sola vez en el arranque (main → Load) antes de servir; los handlers
// solo lo leen. No se muta de forma concurrente.
var loaded = map[string]loadedTemplate{}

type loadedTemplate struct {
	meta  manifest
	files []File
}

// manifest es el contrato de onstudio/templates/<id>/template.json (Phase 6),
// documentado en skills/.../references/template-manifest.md.
type manifest struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Source        string   `json:"source"`
	Stack         string   `json:"stack"`
	SiteType      []string `json:"site_type"`
	Entry         string   `json:"entry"`
	RebrandPoints []string `json:"rebrand_points"`
	Protected     []string `json:"protected"`
	Notes         string   `json:"notes"`
	Match         struct {
		Industries []string `json:"industries"`
		Keywords   []string `json:"keywords"`
	} `json:"match"`
}

// Límites para acotar el costo de tokens del prompt y evitar plantillas infladas.
const (
	manifestName          = "template.json"
	maxTemplateFiles      = 40
	maxTemplateFileBytes  = 256 << 10 // 256 KiB por archivo
	maxTemplateTotalBytes = 1 << 20   // 1 MiB por plantilla
)

// Load productiza desde un directorio en disco. Es azúcar sobre LoadFS con
// os.DirFS(dir); lo usan tests y operadores que mantienen plantillas fuera del
// binario.
func Load(dir string) (int, error) { return LoadFS(os.DirFS(dir)) }

// LoadFS escanea, para cada plantilla del catálogo, <id>/template.json dentro del
// fs dado (el embed del binario en producción; un directorio en tests). Si existe y
// es válida, productiza esa plantilla (archivos + metadata del manifest). Es
// idempotente y de mejor esfuerzo: una plantilla ausente simplemente no se
// productiza; una inválida se omite y se acumula el primer error para reportarlo.
// Devuelve cuántas plantillas quedaron productizadas.
func LoadFS(fsys fs.FS) (int, error) {
	next := map[string]loadedTemplate{}
	var firstErr error
	for _, t := range catalog {
		raw, err := fs.ReadFile(fsys, path.Join(t.ID, manifestName))
		if err != nil {
			continue // sin manifest → no productizada (no es error)
		}
		lt, err := readTemplate(fsys, t.ID, raw)
		if err != nil {
			if firstErr == nil {
				firstErr = fmt.Errorf("plantilla %q: %w", t.ID, err)
			}
			continue
		}
		next[t.ID] = lt
	}
	loaded = next
	return len(next), firstErr
}

// Reset descarga las plantillas productizadas (vuelve al catálogo base). Útil en tests.
func Reset() { loaded = map[string]loadedTemplate{} }

func readTemplate(fsys fs.FS, id string, rawManifest []byte) (loadedTemplate, error) {
	var m manifest
	dec := json.NewDecoder(strings.NewReader(string(rawManifest)))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&m); err != nil {
		return loadedTemplate{}, fmt.Errorf("manifest inválido: %w", err)
	}
	if m.ID != "" && m.ID != id {
		return loadedTemplate{}, fmt.Errorf("el id del manifest (%q) no coincide con la carpeta (%q)", m.ID, id)
	}
	files, err := readDirFiles(fsys, id)
	if err != nil {
		return loadedTemplate{}, err
	}
	if len(files) == 0 {
		return loadedTemplate{}, fmt.Errorf("la plantilla no tiene archivos de sitio")
	}
	entry := m.Entry
	if entry == "" {
		entry = "index.html"
	}
	m.Entry = entry
	if !hasFile(files, entry) {
		return loadedTemplate{}, fmt.Errorf("falta el archivo de entrada %q", entry)
	}
	return loadedTemplate{meta: m, files: files}, nil
}

// readDirFiles recorre el subárbol <dir> dentro de fsys y devuelve sus archivos
// (menos el manifest y ocultos) como contenido en memoria, aplicando los límites.
// Las rutas devueltas son relativas a <dir>, con separador "/".
func readDirFiles(fsys fs.FS, dir string) ([]File, error) {
	var files []File
	total := 0
	err := fs.WalkDir(fsys, dir, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		rel := strings.TrimPrefix(p, dir+"/")
		if rel == manifestName || strings.HasPrefix(rel, ".") || strings.Contains(rel, "/.") {
			return nil // manifest y archivos/carpetas ocultos fuera
		}
		info, err := d.Info()
		if err != nil {
			return err
		}
		if info.Size() > maxTemplateFileBytes {
			return fmt.Errorf("%s excede el máximo de %d bytes por archivo", rel, maxTemplateFileBytes)
		}
		total += int(info.Size())
		if total > maxTemplateTotalBytes {
			return fmt.Errorf("la plantilla excede el máximo de %d bytes en total", maxTemplateTotalBytes)
		}
		if len(files) >= maxTemplateFiles {
			return fmt.Errorf("la plantilla excede el máximo de %d archivos", maxTemplateFiles)
		}
		b, err := fs.ReadFile(fsys, p)
		if err != nil {
			return err
		}
		files = append(files, File{Path: rel, Content: string(b)})
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Slice(files, func(i, j int) bool { return files[i].Path < files[j].Path })
	return files, nil
}

func hasFile(files []File, path string) bool {
	for _, f := range files {
		if f.Path == path {
			return true
		}
	}
	return false
}

// withOverlay aplica la productización de disco (si existe) sobre una entrada del
// catálogo: Productized + Files + la metadata del template.json como fuente de verdad.
func withOverlay(t Template) Template {
	lt, ok := loaded[t.ID]
	if !ok {
		return t
	}
	t.Productized = true
	t.Files = lt.files
	t.Entry = lt.meta.Entry
	if lt.meta.Name != "" {
		t.Name = lt.meta.Name
	}
	if lt.meta.Source != "" {
		t.Source = lt.meta.Source
	}
	if lt.meta.Stack != "" {
		t.Stack = lt.meta.Stack
	}
	if len(lt.meta.SiteType) > 0 {
		t.SiteTypes = lt.meta.SiteType
	}
	if len(lt.meta.RebrandPoints) > 0 {
		t.RebrandPoints = lt.meta.RebrandPoints
	}
	if len(lt.meta.Protected) > 0 {
		t.Protected = lt.meta.Protected
	}
	if len(lt.meta.Match.Industries) > 0 {
		t.Industries = lt.meta.Match.Industries
	}
	if len(lt.meta.Match.Keywords) > 0 {
		t.Keywords = lt.meta.Match.Keywords
	}
	return t
}

// All devuelve una copia del catálogo con la productización de disco aplicada.
func All() []Template {
	out := make([]Template, len(catalog))
	for i, t := range catalog {
		out[i] = withOverlay(t)
	}
	return out
}

// Get busca una plantilla por id (con productización aplicada).
func Get(id string) (Template, bool) {
	for _, t := range catalog {
		if t.ID == id {
			return withOverlay(t), true
		}
	}
	return Template{}, false
}

// Pick elige una plantilla por site_type y la afina por solape de industria /
// keywords con el texto del negocio. Devuelve la plantilla (con productización
// aplicada) y la razón (auditable).
func Pick(siteType, industry, contentNotes string) (Template, string) {
	siteType = strings.ToLower(strings.TrimSpace(siteType))

	var candidates []Template
	for _, t := range catalog {
		for _, st := range t.SiteTypes {
			if st == siteType {
				candidates = append(candidates, t)
				break
			}
		}
	}

	if len(candidates) == 0 {
		switch siteType {
		case "landing", "catalog", "sitio-informativo", "":
			t, _ := Get("landing-institucional")
			return t, fmt.Sprintf("fallback de familia: site_type=%q → landing-institucional", siteType)
		default:
			t, _ := Get("saas-dashboard-generic")
			return t, fmt.Sprintf("fallback global: site_type=%q sin match → saas-dashboard-generic", siteType)
		}
	}

	hay := strings.ToLower(industry + " " + contentNotes)
	best := candidates[0]
	bestScore := -1
	for _, t := range candidates {
		score := 0
		for _, kw := range append(append([]string{}, t.Industries...), t.Keywords...) {
			if kw != "" && strings.Contains(hay, strings.ToLower(kw)) {
				score++
			}
		}
		if score > bestScore {
			bestScore, best = score, t
		}
	}
	return withOverlay(best), fmt.Sprintf("match por site_type=%q (solape industria/keywords=%d)", siteType, bestScore)
}
