package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"onstudio/internal/config"
	"onstudio/internal/store"
)

// newBillingTestAPI devuelve el handler y el store para poder registrar uso
// directamente (sin motor real: la factura se prueba con datos sembrados).
func newBillingTestAPI(t *testing.T) (http.Handler, *store.Store) {
	t.Helper()
	st, err := store.Open(t.TempDir())
	if err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	t.Cleanup(func() { st.Close() })
	if err := st.SeedPricing([]store.PriceRule{
		{Provider: "anthropic", Model: "claude-sonnet-4-5", InputPerMTok: 3, OutputPerMTok: 15, Margin: 3},
	}); err != nil {
		t.Fatalf("SeedPricing: %v", err)
	}
	cfg := config.Default()
	cfg.AllowedModels = []config.Model{{Provider: "anthropic", Model: "claude-sonnet-4-5"}}
	return New(st, cfg, "test").Router(emptyFS{}), st
}

func TestGetBillingEnrichedAfterUsage(t *testing.T) {
	h, st := newBillingTestAPI(t)

	job, err := st.CreateJob("anthropic", "claude-sonnet-4-5", "landing-institucional",
		store.Spec{BusinessName: "X", SiteType: "landing"})
	if err != nil {
		t.Fatalf("CreateJob: %v", err)
	}
	if _, err := st.RecordUsage(store.Usage{
		JobID:            job.ID,
		InputTokens:      1000,
		OutputTokens:     500,
		CacheReadTokens:  200,
		CacheWriteTokens: 100,
		ProviderCost:     0.030001, // round4 → 0.03
		Price:            0.090003, // round4 → 0.09
		Currency:         "USD",
	}); err != nil {
		t.Fatalf("RecordUsage: %v", err)
	}

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/jobs/"+job.ID+"/billing", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("billing status=%d: %s", rec.Code, rec.Body.String())
	}
	var b store.Billing
	if err := json.Unmarshal(rec.Body.Bytes(), &b); err != nil {
		t.Fatalf("decode billing: %v", err)
	}

	if !b.Captured {
		t.Fatal("captured debería ser true tras registrar uso")
	}
	if b.InputTokens != 1000 || b.OutputTokens != 500 {
		t.Errorf("tokens io = %d/%d, want 1000/500", b.InputTokens, b.OutputTokens)
	}
	if b.CacheReadTokens != 200 || b.CacheWriteTokens != 100 {
		t.Errorf("cache tokens = %d/%d, want 200/100", b.CacheReadTokens, b.CacheWriteTokens)
	}
	if b.Margin != 3 {
		t.Errorf("margin = %v, want 3 (de la regla de precios)", b.Margin)
	}
	if b.ProviderCost != 0.03 {
		t.Errorf("provider_cost_usd = %v, want 0.03 (round4)", b.ProviderCost)
	}
	if b.PriceUSD != 0.09 {
		t.Errorf("price_usd = %v, want 0.09 (round4)", b.PriceUSD)
	}
	if want := round2(0.090003 * config.Default().Pricing.HNLRate); b.PriceHNL != want {
		t.Errorf("price_hnl = %v, want %v", b.PriceHNL, want)
	}
	if b.Currency != "USD" {
		t.Errorf("currency = %q, want USD", b.Currency)
	}
}

// Sin regla de precios sembrada, el margen cae al default de la config.
func TestGetBillingMarginFallsBackToDefault(t *testing.T) {
	st, err := store.Open(t.TempDir())
	if err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	t.Cleanup(func() { st.Close() })
	cfg := config.Default() // DefaultMargin 2.0, sin reglas sembradas
	h := New(st, cfg, "test").Router(emptyFS{})

	job, err := st.CreateJob("anthropic", "claude-sonnet-4-5", "landing-institucional",
		store.Spec{BusinessName: "X", SiteType: "landing"})
	if err != nil {
		t.Fatalf("CreateJob: %v", err)
	}
	if _, err := st.RecordUsage(store.Usage{JobID: job.ID, ProviderCost: 0.05, Price: 0.10, Currency: "USD"}); err != nil {
		t.Fatalf("RecordUsage: %v", err)
	}

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/jobs/"+job.ID+"/billing", nil))
	var b store.Billing
	if err := json.Unmarshal(rec.Body.Bytes(), &b); err != nil {
		t.Fatalf("decode billing: %v", err)
	}
	if b.Margin != 2.0 {
		t.Errorf("margin = %v, want 2.0 (default de config)", b.Margin)
	}
}
