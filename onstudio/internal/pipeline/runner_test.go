package pipeline

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"onstudio/internal/config"
	"onstudio/internal/engine"
	"onstudio/internal/store"
)

// fakeEngine implementa pipeline.Engine sin opencode (cero tokens, sin llaves).
type fakeEngine struct {
	startErr   error
	sessionErr error
	promptErr  error
	result     engine.Result
	delay      time.Duration
	gotPrompt  string
}

func (f *fakeEngine) Start(ctx context.Context) error { return f.startErr }

func (f *fakeEngine) CreateSession(ctx context.Context, title string) (string, error) {
	if f.sessionErr != nil {
		return "", f.sessionErr
	}
	return "ses_fake", nil
}

func (f *fakeEngine) Prompt(ctx context.Context, in engine.PromptInput) (engine.Result, error) {
	f.gotPrompt = in.Text
	if f.delay > 0 {
		select {
		case <-time.After(f.delay):
		case <-ctx.Done():
			return engine.Result{}, ctx.Err()
		}
	}
	if f.promptErr != nil {
		return engine.Result{}, f.promptErr
	}
	return f.result, nil
}

func newRunnerTest(t *testing.T, eng Engine) (*Runner, *store.Store, config.Config) {
	t.Helper()
	dir := t.TempDir()
	st, err := store.Open(dir)
	if err != nil {
		t.Fatalf("store.Open: %v", err)
	}
	t.Cleanup(func() { st.Close() })
	if err := st.SeedPricing([]store.PriceRule{
		{Provider: "anthropic", Model: "claude-sonnet-4-5", InputPerMTok: 3, OutputPerMTok: 15, Margin: 2},
	}); err != nil {
		t.Fatalf("SeedPricing: %v", err)
	}
	cfg := config.Default()
	cfg.DataDir = dir
	return NewRunner(st, eng, cfg), st, cfg
}

func makeJob(t *testing.T, st *store.Store, spec store.Spec) store.Job {
	t.Helper()
	j, err := st.CreateJob("anthropic", "claude-sonnet-4-5", "landing-institucional", spec)
	if err != nil {
		t.Fatalf("CreateJob: %v", err)
	}
	return j
}

func waitStatus(t *testing.T, st *store.Store, id string, want ...string) store.Job {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		j, err := st.GetJob(id)
		if err == nil {
			for _, w := range want {
				if j.Status == w {
					return j
				}
			}
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("timeout esperando estado en %v", want)
	return store.Job{}
}

func TestRunnerSuccess(t *testing.T) {
	files := `{"files":[{"path":"index.html","content":"<h1>Hola</h1>"},{"path":"css/app.css","content":"body{}"}]}`
	eng := &fakeEngine{result: engine.Result{
		MessageID: "m1",
		Text:      files,
		Usage:     engine.Usage{InputTokens: 1000, OutputTokens: 500, Cost: 0.03},
	}}
	r, st, cfg := newRunnerTest(t, eng)
	job := makeJob(t, st, store.Spec{BusinessName: "Panadería", Industry: "alimentos", SiteType: "landing"})

	r.run(context.Background(), job.ID)

	got, _ := st.GetJob(job.ID)
	if got.Status != "done" {
		t.Fatalf("status = %q (err=%q), want done", got.Status, got.ErrorMsg)
	}
	if got.OpencodeSession != "ses_fake" {
		t.Errorf("session = %q, want ses_fake", got.OpencodeSession)
	}

	idx := filepath.Join(cfg.DataDir, "workspaces", job.ID, "index.html")
	if b, err := os.ReadFile(idx); err != nil || !strings.Contains(string(b), "Hola") {
		t.Fatalf("index.html: %v / %q", err, b)
	}

	u, err := st.GetUsageByJob(job.ID)
	if err != nil {
		t.Fatalf("usage no capturado: %v", err)
	}
	if u.ProviderCost != 0.03 || u.Price != 0.06 { // cost × margin 2
		t.Errorf("usage cost=%v price=%v, want 0.03/0.06", u.ProviderCost, u.Price)
	}

	site, err := st.GetSiteByJob(job.ID)
	if err != nil || site.BusinessName != "Panadería" {
		t.Errorf("site = %+v err=%v", site, err)
	}

	if !strings.Contains(eng.gotPrompt, "Panadería") || !strings.Contains(eng.gotPrompt, `{"files"`) {
		t.Error("el prompt no incluyó el negocio o el contrato de salida")
	}
}

func TestRunnerEngineStartFails(t *testing.T) {
	eng := &fakeEngine{startErr: errors.New("no se pudo iniciar opencode")}
	r, st, _ := newRunnerTest(t, eng)
	job := makeJob(t, st, store.Spec{BusinessName: "X", SiteType: "landing"})

	r.run(context.Background(), job.ID)

	got, _ := st.GetJob(job.ID)
	if got.Status != "error" || !strings.Contains(got.ErrorMsg, "motor") {
		t.Fatalf("status=%q err=%q, want error/motor", got.Status, got.ErrorMsg)
	}
}

func TestRunnerPromptErrorDoesNotBill(t *testing.T) {
	eng := &fakeEngine{promptErr: errors.New("proveedor rechazó la llave")}
	r, st, _ := newRunnerTest(t, eng)
	job := makeJob(t, st, store.Spec{BusinessName: "X", SiteType: "landing"})

	r.run(context.Background(), job.ID)

	got, _ := st.GetJob(job.ID)
	if got.Status != "error" || !strings.Contains(got.ErrorMsg, "generación") {
		t.Fatalf("status=%q err=%q, want error/generación", got.Status, got.ErrorMsg)
	}
	if _, err := st.GetUsageByJob(job.ID); !errors.Is(err, store.ErrNotFound) {
		t.Errorf("no debía facturar en error de generación, got err=%v", err)
	}
}

func TestRunnerEmitFailureWhenNoFiles(t *testing.T) {
	eng := &fakeEngine{result: engine.Result{Text: "lo siento, no puedo generar eso"}}
	r, st, _ := newRunnerTest(t, eng)
	job := makeJob(t, st, store.Spec{BusinessName: "X", SiteType: "landing"})

	r.run(context.Background(), job.ID)

	got, _ := st.GetJob(job.ID)
	if got.Status != "error" || !strings.Contains(got.ErrorMsg, "emisión") {
		t.Fatalf("status=%q err=%q, want error/emisión", got.Status, got.ErrorMsg)
	}
}

func TestRunnerCancel(t *testing.T) {
	eng := &fakeEngine{
		delay:  2 * time.Second,
		result: engine.Result{Text: `{"files":[{"path":"index.html","content":"x"}]}`},
	}
	r, st, _ := newRunnerTest(t, eng)
	job := makeJob(t, st, store.Spec{BusinessName: "X", SiteType: "landing"})

	r.Submit(job.ID)
	waitStatus(t, st, job.ID, "running")
	if !r.Cancel(job.ID) {
		t.Fatal("Cancel debió señalizar un job en curso")
	}
	got := waitStatus(t, st, job.ID, "canceled", "error", "done")
	if got.Status != "canceled" {
		t.Fatalf("status = %q, want canceled", got.Status)
	}
}
