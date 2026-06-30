package pipeline

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"path/filepath"
	"sync"

	"onstudio/internal/billing"
	"onstudio/internal/config"
	"onstudio/internal/engine"
	"onstudio/internal/store"
	"onstudio/internal/templates"
)

// Engine es la parte del motor que el runner necesita; la implementa *engine.Engine.
// Aislarla como interfaz permite inyectar un motor falso en los tests, sin opencode.
type Engine interface {
	Start(ctx context.Context) error
	CreateSession(ctx context.Context, title string) (string, error)
	Prompt(ctx context.Context, in engine.PromptInput) (engine.Result, error)
}

// Runner orquesta un job de generación: intake → plantilla → rebrand (motor) →
// emisión → facturación → entrega, actualizando el job en SQLite en cada etapa.
type Runner struct {
	st    *store.Store
	eng   Engine
	cfg   config.Config
	agent string

	mu      sync.Mutex
	running map[string]context.CancelFunc
}

// NewRunner construye un runner listo para recibir Submit/Cancel.
func NewRunner(st *store.Store, eng Engine, cfg config.Config) *Runner {
	return &Runner{
		st:      st,
		eng:     eng,
		cfg:     cfg,
		agent:   "site-builder",
		running: map[string]context.CancelFunc{},
	}
}

// Submit lanza el job en segundo plano y regresa de inmediato. POST /api/jobs
// responde 201 con el job 'queued' y la generación ocurre aquí.
func (r *Runner) Submit(jobID string) {
	ctx, cancel := context.WithCancel(context.Background())
	r.mu.Lock()
	r.running[jobID] = cancel
	r.mu.Unlock()

	go func() {
		defer func() {
			r.mu.Lock()
			delete(r.running, jobID)
			r.mu.Unlock()
			cancel()
			if rec := recover(); rec != nil {
				log.Printf("pipeline: panic en job %s: %v", jobID, rec)
				_ = r.st.SetJobError(jobID, "error interno del generador")
			}
		}()
		r.run(ctx, jobID)
	}()
}

// Cancel señaliza la cancelación de un job en curso. Devuelve true si seguía vivo.
func (r *Runner) Cancel(jobID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	if cancel, ok := r.running[jobID]; ok {
		cancel()
		return true
	}
	return false
}

// WorkspaceDir es la carpeta aislada del job: <data>/workspaces/<job_id>.
func (r *Runner) WorkspaceDir(jobID string) string {
	return filepath.Join(r.cfg.DataDir, "workspaces", jobID)
}

func (r *Runner) run(ctx context.Context, jobID string) {
	job, err := r.st.GetJob(jobID)
	if err != nil {
		log.Printf("pipeline: job %s no encontrado: %v", jobID, err)
		return
	}

	// fail centraliza el cierre del job: si el contexto fue cancelado, el job queda
	// "canceled"; si no, "error" con el mensaje de la etapa.
	fail := func(stage string, e error) {
		if ctx.Err() != nil {
			_ = r.st.SetJobStatus(jobID, "canceled")
			log.Printf("pipeline: job %s cancelado en %s", jobID, stage)
			return
		}
		_ = r.st.SetJobError(jobID, stage+": "+e.Error())
		log.Printf("pipeline: job %s error en %s: %v", jobID, stage, e)
	}

	var spec store.Spec
	if err := json.Unmarshal([]byte(job.SpecJSON), &spec); err != nil {
		fail("spec", err)
		return
	}
	spec = Normalize(spec)
	if err := Validate(spec); err != nil {
		fail("intake", err)
		return
	}

	tpl, ok := templates.Get(job.TemplateID)
	if !ok {
		tpl, _ = templates.Pick(spec.SiteType, spec.Industry, spec.ContentNotes)
	}

	// Arranque perezoso del motor: si opencode no está disponible, el job queda en
	// error con mensaje claro en vez de tumbar el servidor.
	if err := r.eng.Start(ctx); err != nil {
		fail("motor", err)
		return
	}
	if err := r.st.SetJobStatus(jobID, "running"); err != nil {
		fail("estado", err)
		return
	}

	sessionID, err := r.eng.CreateSession(ctx, "OnStudio — "+spec.BusinessName)
	if err != nil {
		fail("sesión", err)
		return
	}
	_ = r.st.SetJobSession(jobID, sessionID)

	res, err := r.eng.Prompt(ctx, engine.PromptInput{
		SessionID:  sessionID,
		ProviderID: job.Provider,
		ModelID:    job.Model,
		Agent:      r.agent,
		Text:       BuildPrompt(spec, tpl),
	})
	if err != nil {
		fail("generación", err)
		return
	}

	workspace := r.WorkspaceDir(jobID)
	files, err := Emit(res.Text, workspace)
	if err != nil {
		fail("emisión", err)
		return
	}
	if len(files) == 0 {
		fail("emisión", errors.New("el modelo no devolvió archivos"))
		return
	}

	// Facturación: convertir el uso de tokens en precio y persistirlo. Se factura
	// el consumo real aunque luego se cancele (los tokens ya se gastaron).
	rule, found, _ := r.st.GetPrice(job.Provider, job.Model)
	line := billing.Compute(res.Usage, rule, found, r.cfg.Pricing)
	if _, err := r.st.RecordUsage(store.Usage{
		JobID:            jobID,
		InputTokens:      line.InputTokens,
		OutputTokens:     line.OutputTokens,
		CacheReadTokens:  line.CacheReadTokens,
		CacheWriteTokens: line.CacheWriteTokens,
		ProviderCost:     line.ProviderCostUSD,
		Price:            line.PriceUSD,
		Currency:         "USD",
	}); err != nil {
		fail("facturación", err)
		return
	}

	if _, err := r.st.CreateSite(jobID, spec.BusinessName, workspace); err != nil {
		fail("entrega", err)
		return
	}

	// Si se canceló mientras emitíamos/facturábamos, respeta la cancelación y no
	// pises el estado con "done".
	if cur, err := r.st.GetJob(jobID); err == nil && cur.Status == "canceled" {
		log.Printf("pipeline: job %s quedó cancelado; no se marca done", jobID)
		return
	}
	if err := r.st.SetJobStatus(jobID, "done"); err != nil {
		fail("estado", err)
		return
	}
	log.Printf("pipeline: job %s done (%d archivos, costo=%s)", jobID, len(files), line.CostSource)
}
