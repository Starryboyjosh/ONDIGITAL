package store

import (
	"errors"
	"testing"
)

func newTestStore(t *testing.T) *Store {
	t.Helper()
	st, err := Open(t.TempDir())
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { st.Close() })
	return st
}

func TestJobLifecycle(t *testing.T) {
	st := newTestStore(t)
	spec := Spec{BusinessName: "Panadería La Espiga", SiteType: "landing", Locale: "es-HN"}
	j, err := st.CreateJob("anthropic", "claude-sonnet-4-5", "landing-institucional", spec)
	if err != nil {
		t.Fatalf("CreateJob: %v", err)
	}
	if j.ID == "" || j.Status != "queued" {
		t.Fatalf("job inesperado: %+v", j)
	}
	got, err := st.GetJob(j.ID)
	if err != nil {
		t.Fatalf("GetJob: %v", err)
	}
	if got.Provider != "anthropic" || got.Model != "claude-sonnet-4-5" || got.TemplateID != "landing-institucional" {
		t.Fatalf("job mal guardado: %+v", got)
	}
	if err := st.SetJobStatus(j.ID, "running"); err != nil {
		t.Fatalf("SetJobStatus: %v", err)
	}
	list, err := st.ListJobs()
	if err != nil || len(list) != 1 {
		t.Fatalf("ListJobs: %v len=%d", err, len(list))
	}
	if list[0].Status != "running" {
		t.Fatalf("estado no persistió: %+v", list[0])
	}
}

func TestGetJobNotFound(t *testing.T) {
	st := newTestStore(t)
	if _, err := st.GetJob("j_inexistente"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("esperaba ErrNotFound, got %v", err)
	}
}

func TestUsageAndPricing(t *testing.T) {
	st := newTestStore(t)
	if err := st.SeedPricing([]PriceRule{{Provider: "anthropic", Model: "claude-sonnet-4-5", InputPerMTok: 3, OutputPerMTok: 15, Margin: 2}}); err != nil {
		t.Fatalf("SeedPricing: %v", err)
	}
	r, ok, err := st.GetPrice("anthropic", "claude-sonnet-4-5")
	if err != nil || !ok || r.Margin != 2 {
		t.Fatalf("GetPrice: err=%v ok=%v r=%+v", err, ok, r)
	}

	j, err := st.CreateJob("anthropic", "claude-sonnet-4-5", "", Spec{BusinessName: "X"})
	if err != nil {
		t.Fatalf("CreateJob: %v", err)
	}
	if _, err := st.GetUsageByJob(j.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("sin uso esperaba ErrNotFound, got %v", err)
	}
	if _, err := st.RecordUsage(Usage{JobID: j.ID, InputTokens: 1000, OutputTokens: 500, ProviderCost: 0.02, Price: 0.04}); err != nil {
		t.Fatalf("RecordUsage: %v", err)
	}
	u, err := st.GetUsageByJob(j.ID)
	if err != nil || u.InputTokens != 1000 || u.OutputTokens != 500 || u.Price != 0.04 {
		t.Fatalf("GetUsageByJob: err=%v u=%+v", err, u)
	}
}
