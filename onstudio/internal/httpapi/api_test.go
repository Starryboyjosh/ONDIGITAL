package httpapi

import (
	"encoding/json"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"onstudio/internal/config"
	"onstudio/internal/store"
)

// emptyFS satisface fs.FS sin archivos (la SPA no se prueba aquí).
type emptyFS struct{}

func (emptyFS) Open(string) (fs.File, error) { return nil, fs.ErrNotExist }

func newTestAPI(t *testing.T) http.Handler {
	t.Helper()
	st, err := store.Open(t.TempDir())
	if err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	t.Cleanup(func() { st.Close() })
	cfg := config.Default()
	cfg.AllowedModels = []config.Model{{Provider: "anthropic", Model: "claude-sonnet-4-5", Label: "Claude Sonnet 4.5"}}
	return New(st, cfg, "test").Router(emptyFS{})
}

func TestHealthOKAndNoSecretLeak(t *testing.T) {
	h := newTestAPI(t)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("health status=%d", rec.Code)
	}
	body := rec.Body.String()
	if !strings.Contains(body, `"status":"ok"`) {
		t.Fatalf("health body inesperado: %s", body)
	}
	for _, leak := range []string{"API_KEY", "apiKey", "sk-ant", "secret", "password"} {
		if strings.Contains(body, leak) {
			t.Fatalf("health expone posible secreto (%q): %s", leak, body)
		}
	}
}

func TestModelsFromConfig(t *testing.T) {
	h := newTestAPI(t)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/models", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("models status=%d", rec.Code)
	}
	var models []config.Model
	if err := json.Unmarshal(rec.Body.Bytes(), &models); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(models) != 1 || models[0].Model != "claude-sonnet-4-5" {
		t.Fatalf("models inesperado: %+v", models)
	}
}

func TestCreateJobRejectsModelNotAllowed(t *testing.T) {
	h := newTestAPI(t)
	rec := httptest.NewRecorder()
	body := `{"spec":{"business_name":"Panadería La Espiga","site_type":"landing"},"provider":"openai","model":"ghost"}`
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/jobs", strings.NewReader(body)))
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("esperaba 422, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestCreateJobRejectsMissingSpec(t *testing.T) {
	h := newTestAPI(t)
	rec := httptest.NewRecorder()
	body := `{"spec":{"business_name":""},"provider":"anthropic","model":"claude-sonnet-4-5"}`
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/jobs", strings.NewReader(body)))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("esperaba 400, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestCreateJobOKThenFetchAndBilling(t *testing.T) {
	h := newTestAPI(t)

	rec := httptest.NewRecorder()
	body := `{"spec":{"business_name":"Panadería La Espiga","site_type":"landing","locale":"es-HN"},"provider":"anthropic","model":"claude-sonnet-4-5"}`
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/jobs", strings.NewReader(body)))
	if rec.Code != http.StatusCreated {
		t.Fatalf("esperaba 201, got %d: %s", rec.Code, rec.Body.String())
	}
	var created struct {
		Job store.Job `json:"job"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if created.Job.ID == "" || created.Job.Status != "queued" || created.Job.TemplateID != "landing-institucional" {
		t.Fatalf("job inesperado: %+v", created.Job)
	}

	recGet := httptest.NewRecorder()
	h.ServeHTTP(recGet, httptest.NewRequest(http.MethodGet, "/api/jobs/"+created.Job.ID, nil))
	if recGet.Code != http.StatusOK {
		t.Fatalf("getJob status=%d", recGet.Code)
	}

	recBill := httptest.NewRecorder()
	h.ServeHTTP(recBill, httptest.NewRequest(http.MethodGet, "/api/jobs/"+created.Job.ID+"/billing", nil))
	if recBill.Code != http.StatusOK {
		t.Fatalf("billing status=%d", recBill.Code)
	}
	var bill store.Billing
	if err := json.Unmarshal(recBill.Body.Bytes(), &bill); err != nil {
		t.Fatalf("decode billing: %v", err)
	}
	if bill.Captured || bill.PriceUSD != 0 {
		t.Fatalf("sin uso, billing debería ir en cero/captured=false: %+v", bill)
	}
}

func TestGetJobNotFound(t *testing.T) {
	h := newTestAPI(t)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/jobs/j_nope", nil))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("esperaba 404, got %d", rec.Code)
	}
}
