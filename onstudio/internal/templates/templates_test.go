package templates

import (
	"bytes"
	"testing"
	"testing/fstest"
)

// mapFS arma un fs en memoria para una plantilla bajo <id>/...
func mapFS(id string, files map[string]string) fstest.MapFS {
	m := fstest.MapFS{}
	for name, body := range files {
		m[id+"/"+name] = &fstest.MapFile{Data: []byte(body)}
	}
	return m
}

func TestLoadFSProductizesValid(t *testing.T) {
	t.Cleanup(Reset)
	fsys := mapFS("landing-institucional", map[string]string{
		"template.json":  `{"id":"landing-institucional","name":"Landing X","entry":"index.html","stack":"static-html","site_type":["landing"]}`,
		"index.html":     "<!doctype html><title>BASE</title>",
		"css/styles.css": "body{}",
	})

	n, err := LoadFS(fsys)
	if err != nil {
		t.Fatalf("LoadFS error inesperado: %v", err)
	}
	if n != 1 {
		t.Fatalf("esperaba 1 plantilla productizada, got %d", n)
	}

	tpl, ok := Get("landing-institucional")
	if !ok || !tpl.Productized {
		t.Fatalf("la plantilla no quedó productizada: %+v", tpl)
	}
	if tpl.Name != "Landing X" || tpl.Entry != "index.html" {
		t.Errorf("metadata del manifest no aplicada: name=%q entry=%q", tpl.Name, tpl.Entry)
	}
	// El manifest (template.json) NO cuenta como archivo base: solo index.html + css/styles.css.
	if len(tpl.Files) != 2 {
		t.Errorf("esperaba 2 archivos base (sin el manifest), got %d", len(tpl.Files))
	}
	if !hasFile(tpl.Files, "index.html") || !hasFile(tpl.Files, "css/styles.css") {
		t.Errorf("faltan archivos base esperados: %+v", tpl.Files)
	}
}

func TestLoadFSMissingManifestIsNotError(t *testing.T) {
	t.Cleanup(Reset)
	fsys := mapFS("landing-institucional", map[string]string{
		"index.html": "<!doctype html>",
	})
	n, err := LoadFS(fsys)
	if err != nil {
		t.Fatalf("sin manifest no debe ser error: %v", err)
	}
	if n != 0 {
		t.Fatalf("sin manifest no debe productizar, got %d", n)
	}
	if tpl, _ := Get("landing-institucional"); tpl.Productized {
		t.Error("no debería estar productizada sin manifest")
	}
}

func TestLoadFSIDMismatchErrors(t *testing.T) {
	t.Cleanup(Reset)
	fsys := mapFS("landing-institucional", map[string]string{
		"template.json": `{"id":"otra-cosa","entry":"index.html"}`,
		"index.html":    "<!doctype html>",
	})
	n, err := LoadFS(fsys)
	if err == nil {
		t.Fatal("esperaba error por id de manifest que no coincide con la carpeta")
	}
	if n != 0 {
		t.Fatalf("una plantilla inválida no debe productizarse, got %d", n)
	}
}

func TestLoadFSMissingEntryErrors(t *testing.T) {
	t.Cleanup(Reset)
	fsys := mapFS("landing-institucional", map[string]string{
		"template.json": `{"id":"landing-institucional","entry":"no-existe.html"}`,
		"index.html":    "<!doctype html>",
	})
	if _, err := LoadFS(fsys); err == nil {
		t.Fatal("esperaba error porque el archivo de entrada no existe")
	}
}

func TestLoadFSUnknownManifestFieldErrors(t *testing.T) {
	t.Cleanup(Reset)
	fsys := mapFS("landing-institucional", map[string]string{
		"template.json": `{"id":"landing-institucional","entry":"index.html","campo_raro":true}`,
		"index.html":    "<!doctype html>",
	})
	if _, err := LoadFS(fsys); err == nil {
		t.Fatal("esperaba error por campo desconocido en el manifest (DisallowUnknownFields)")
	}
}

func TestLoadFSRejectsOversizeFile(t *testing.T) {
	t.Cleanup(Reset)
	big := string(bytes.Repeat([]byte("a"), maxTemplateFileBytes+1))
	fsys := mapFS("landing-institucional", map[string]string{
		"template.json": `{"id":"landing-institucional","entry":"index.html"}`,
		"index.html":    "<!doctype html>",
		"big.css":       big,
	})
	if _, err := LoadFS(fsys); err == nil {
		t.Fatal("esperaba error por archivo que excede el límite por archivo")
	}
}

func TestLoadFSSkipsHiddenAndManifest(t *testing.T) {
	t.Cleanup(Reset)
	fsys := mapFS("landing-institucional", map[string]string{
		"template.json": `{"id":"landing-institucional","entry":"index.html"}`,
		"index.html":    "<!doctype html>",
		".env":          "API_KEY=should-be-ignored",
	})
	if _, err := LoadFS(fsys); err != nil {
		t.Fatalf("LoadFS error: %v", err)
	}
	tpl, _ := Get("landing-institucional")
	for _, f := range tpl.Files {
		if f.Path == ".env" || f.Path == manifestName {
			t.Errorf("archivo que debía ignorarse llegó a los Files: %q", f.Path)
		}
		if bytes.Contains([]byte(f.Content), []byte("should-be-ignored")) {
			t.Error("contenido de archivo oculto se filtró a los Files")
		}
	}
}

func TestResetClearsProductization(t *testing.T) {
	fsys := mapFS("landing-institucional", map[string]string{
		"template.json": `{"id":"landing-institucional","entry":"index.html"}`,
		"index.html":    "<!doctype html>",
	})
	if _, err := LoadFS(fsys); err != nil {
		t.Fatalf("LoadFS: %v", err)
	}
	Reset()
	if tpl, _ := Get("landing-institucional"); tpl.Productized || len(tpl.Files) != 0 {
		t.Errorf("Reset no limpió la productización: %+v", tpl)
	}
}

// TestShippedTemplatesLoad valida las plantillas REALES del repo (onstudio/templates):
// que su template.json parsee y que el archivo de entrada exista. Es la red de
// seguridad de Phase 6 contra un manifest mal escrito.
func TestShippedTemplatesLoad(t *testing.T) {
	t.Cleanup(Reset)
	n, err := Load("../../templates")
	if err != nil {
		t.Fatalf("las plantillas del repo no cargan: %v", err)
	}
	if n < 2 {
		t.Fatalf("esperaba al menos 2 plantillas productizadas (landing + dashboard), got %d", n)
	}
	for _, id := range []string{"landing-institucional", "saas-dashboard-generic"} {
		tpl, ok := Get(id)
		if !ok || !tpl.Productized {
			t.Errorf("%s debería estar productizada", id)
			continue
		}
		if !hasFile(tpl.Files, tpl.Entry) {
			t.Errorf("%s no incluye su archivo de entrada %q", id, tpl.Entry)
		}
		for _, f := range tpl.Files {
			if bytes.Contains([]byte(f.Content), []byte("sk-ant")) {
				t.Errorf("%s parece contener un secreto en %s", id, f.Path)
			}
		}
	}

	// Pick debe devolver plantillas productizadas tras cargar.
	if tpl, _ := Pick("landing", "alimentos", "panadería"); !tpl.Productized {
		t.Error("Pick(landing) debería devolver una plantilla productizada")
	}
	if tpl, _ := Pick("saas", "software", "dashboard"); !tpl.Productized {
		t.Error("Pick(saas) debería devolver una plantilla productizada")
	}
}
