package pipeline

import (
	"strings"
	"testing"

	"onstudio/internal/store"
)

func TestNormalizeDefaults(t *testing.T) {
	got := Normalize(store.Spec{BusinessName: "Panadería", SiteType: "Landing"})
	if got.Locale != "es-HN" {
		t.Errorf("locale = %q, want es-HN", got.Locale)
	}
	if got.Currency != "HNL" {
		t.Errorf("currency = %q, want HNL", got.Currency)
	}
	if got.Industry != "general" {
		t.Errorf("industry = %q, want general", got.Industry)
	}
	if got.SiteType != "landing" {
		t.Errorf("site_type = %q, want landing (lowercased)", got.SiteType)
	}
	if len(got.Pages) != 1 || got.Pages[0] != "inicio" {
		t.Errorf("pages = %v, want [inicio]", got.Pages)
	}
}

func TestNormalizeStripsControlChars(t *testing.T) {
	got := Normalize(store.Spec{
		BusinessName: "Pan\x00adería\tLa\nEspiga",
		SiteType:     "landing",
	})
	if got.BusinessName != "Panadería La Espiga" {
		t.Errorf("business_name = %q, want collapsed single line", got.BusinessName)
	}
}

func TestNormalizePagesDedupeAndLower(t *testing.T) {
	got := Normalize(store.Spec{
		BusinessName: "X", SiteType: "landing",
		Pages: []string{"Inicio", "inicio", "  ", "Productos", "PRODUCTOS"},
	})
	want := []string{"inicio", "productos"}
	if strings.Join(got.Pages, ",") != strings.Join(want, ",") {
		t.Errorf("pages = %v, want %v", got.Pages, want)
	}
}

func TestNormalizeHexColors(t *testing.T) {
	got := Normalize(store.Spec{
		BusinessName: "X", SiteType: "landing",
		Brand: store.Brand{Primary: "ff0000", Accent: "no-es-color"},
	})
	if got.Brand.Primary != "#ff0000" {
		t.Errorf("primary = %q, want #ff0000", got.Brand.Primary)
	}
	if got.Brand.Accent != "" {
		t.Errorf("accent = %q, want empty (invalid discarded)", got.Brand.Accent)
	}
}

func TestNormalizeNotesKeepNewlinesDropControl(t *testing.T) {
	got := Normalize(store.Spec{
		BusinessName: "X", SiteType: "landing",
		ContentNotes: "Línea 1\nLínea 2\x07 con bell",
	})
	if !strings.Contains(got.ContentNotes, "Línea 1\nLínea 2") {
		t.Errorf("notes lost newline: %q", got.ContentNotes)
	}
	if strings.ContainsRune(got.ContentNotes, '\x07') {
		t.Errorf("notes kept control char: %q", got.ContentNotes)
	}
}

func TestValidate(t *testing.T) {
	if err := Validate(Normalize(store.Spec{BusinessName: "X", SiteType: "landing"})); err != nil {
		t.Errorf("valid spec rejected: %v", err)
	}
	if err := Validate(store.Spec{SiteType: "landing", Pages: []string{"inicio"}}); err == nil {
		t.Error("missing business_name should fail")
	}
	if err := Validate(store.Spec{BusinessName: "X", Pages: []string{"inicio"}}); err == nil {
		t.Error("missing site_type should fail")
	}
}
