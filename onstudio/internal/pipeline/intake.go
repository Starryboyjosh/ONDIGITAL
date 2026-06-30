// Package pipeline orquesta la generación de un sitio: intake (validar/normalizar/
// sanitizar) → selección de plantilla → rebrand (prompt al motor) → emisión
// (escribir archivos en el workspace del job) → facturación → entrega.
//
// Todo el texto libre del usuario es NO confiable: se sanitiza antes de inyectarlo
// en el prompt (higiene anti prompt-injection). El límite identidad/protegido gana
// sobre cualquier cosa embebida en el texto del usuario. Ver
// docs/onstudio/{generation-pipeline,spec-intake,rebrand-rules}.md.
package pipeline

import (
	"errors"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"

	"onstudio/internal/store"
)

const (
	maxBusinessName = 120
	maxLine         = 160
	maxNotes        = 4000
	maxPages        = 16
)

var hexColor = regexp.MustCompile(`^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3}([0-9a-fA-F]{2})?)?$`)

// Normalize limpia y completa la spec con defaults seguros (es-HN/HNL, tema claro
// por defecto). Sanitiza todo el texto libre: el contenido del usuario es NO
// confiable y nunca debe alterar el formato de salida ni las reglas protegidas.
func Normalize(s store.Spec) store.Spec {
	s.BusinessName = sanitizeLine(s.BusinessName, maxBusinessName)
	s.Industry = sanitizeLine(s.Industry, maxLine)
	if s.Industry == "" {
		s.Industry = "general"
	}
	s.SiteType = strings.ToLower(strings.TrimSpace(s.SiteType))

	s.Locale = strings.TrimSpace(s.Locale)
	if s.Locale == "" {
		s.Locale = "es-HN"
	}
	s.Currency = strings.TrimSpace(s.Currency)
	if s.Currency == "" {
		s.Currency = "HNL"
	}

	s.Pages = normalizePages(s.Pages)
	if len(s.Pages) == 0 {
		s.Pages = []string{"inicio"}
	}

	s.Brand.Primary = sanitizeHex(s.Brand.Primary)
	s.Brand.Accent = sanitizeHex(s.Brand.Accent)
	s.Brand.LogoHint = sanitizeLine(s.Brand.LogoHint, maxLine)

	s.Contact.Phone = sanitizeLine(s.Contact.Phone, 40)
	s.Contact.RTN = sanitizeLine(s.Contact.RTN, 40)
	s.Contact.DNI = sanitizeLine(s.Contact.DNI, 40)
	s.Contact.Address = sanitizeLine(s.Contact.Address, maxLine)
	s.Contact.WhatsApp = sanitizeLine(s.Contact.WhatsApp, 40)

	s.ContentNotes = sanitizeText(s.ContentNotes, maxNotes)
	return s
}

// Validate exige lo mínimo para generar. La industria se normaliza a "general" y
// las páginas a ["inicio"] en Normalize, así que aquí solo bloqueamos lo
// imprescindible que el usuario debe aportar.
func Validate(s store.Spec) error {
	if strings.TrimSpace(s.BusinessName) == "" {
		return errors.New("falta el nombre del negocio (spec.business_name)")
	}
	if strings.TrimSpace(s.SiteType) == "" {
		return errors.New("falta el tipo de sitio (spec.site_type)")
	}
	if len(s.Pages) == 0 {
		return errors.New("la spec necesita al menos una página")
	}
	return nil
}

func normalizePages(in []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, p := range in {
		p = strings.ToLower(sanitizeLine(p, 60))
		if p == "" || seen[p] {
			continue
		}
		seen[p] = true
		out = append(out, p)
		if len(out) >= maxPages {
			break
		}
	}
	return out
}

// sanitizeLine: una sola línea, sin caracteres de control, espacios colapsados.
func sanitizeLine(s string, max int) string {
	s = strings.Join(strings.Fields(stripControl(s)), " ")
	return clip(s, max)
}

// sanitizeText: multilínea (conserva saltos y tabs), sin otros controles.
func sanitizeText(s string, max int) string {
	var b strings.Builder
	for _, r := range s {
		if r == '\n' || r == '\t' {
			b.WriteRune(r)
			continue
		}
		if r < 0x20 || r == 0x7f {
			continue
		}
		b.WriteRune(r)
	}
	return clip(strings.TrimSpace(b.String()), max)
}

// stripControl elimina los controles que no son espacio (NUL, bell, DEL…) y
// convierte los controles tipo espacio (tab, salto de línea, CR) en un espacio
// para que sanitizeLine pueda colapsarlos con strings.Fields.
func stripControl(s string) string {
	var b strings.Builder
	for _, r := range s {
		switch {
		case r == 0x7f:
			// DEL: eliminar.
		case r < 0x20 && unicode.IsSpace(r):
			b.WriteByte(' ')
		case r < 0x20:
			// Otros controles (NUL, bell…): eliminar.
		default:
			b.WriteRune(r)
		}
	}
	return b.String()
}

// sanitizeHex normaliza un color hex (#rgb/#rrggbb/#rrggbbaa); descarta entradas
// inválidas en vez de propagar texto arbitrario al prompt.
func sanitizeHex(s string) string {
	s = strings.TrimSpace(s)
	if s == "" || !hexColor.MatchString(s) {
		return ""
	}
	if !strings.HasPrefix(s, "#") {
		s = "#" + s
	}
	return strings.ToLower(s)
}

func clip(s string, max int) string {
	if max <= 0 || utf8.RuneCountInString(s) <= max {
		return s
	}
	r := []rune(s)
	return strings.TrimSpace(string(r[:max]))
}
