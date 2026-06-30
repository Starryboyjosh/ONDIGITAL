package httpapi

import (
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"strings"
	"time"
	"unicode"

	"onstudio/internal/pipeline"
	"onstudio/internal/store"
	"onstudio/internal/templates"
)

// getHealth informa el estado del servidor y del motor. NUNCA expone llaves.
func (a *API) getHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":         "ok",
		"service":        "onstudio",
		"version":        a.version,
		"uptime_seconds": int(time.Since(a.started).Seconds()),
		"engine": map[string]any{
			"mode":       a.cfg.Engine.Mode,
			"configured": a.runner != nil,
			"note":       "El motor OpenCode se inicia bajo demanda al generar; las llaves viven solo en el entorno del servidor.",
		},
		"models_count":    len(a.cfg.AllowedModels),
		"templates_count": len(templates.All()),
	})
}

// getModels devuelve los modelos habilitados (allowed_models de la config).
func (a *API) getModels(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, a.cfg.AllowedModels)
}

// getTemplates devuelve el catálogo de plantillas Pro disponibles.
func (a *API) getTemplates(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, templates.All())
}

func (a *API) listJobs(w http.ResponseWriter, r *http.Request) {
	jobs, err := a.st.ListJobs()
	if err != nil {
		writeStoreErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, jobs)
}

func (a *API) getJob(w http.ResponseWriter, r *http.Request) {
	j, err := a.st.GetJob(r.PathValue("id"))
	if err != nil {
		writeStoreErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, j)
}

// createJob normaliza/valida la spec, elige plantilla y persiste un job 'queued'.
// Si hay un runner conectado, lanza la generación en segundo plano; si no (tests),
// el job queda 'queued' sin ejecutarse.
func (a *API) createJob(w http.ResponseWriter, r *http.Request) {
	in, err := decode[store.NewJobInput](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Cuerpo JSON inválido: "+err.Error())
		return
	}
	in.Provider = strings.TrimSpace(in.Provider)
	in.Model = strings.TrimSpace(in.Model)
	in.Spec = pipeline.Normalize(in.Spec)

	if err := pipeline.Validate(in.Spec); err != nil {
		writeError(w, http.StatusBadRequest, "spec_invalid", ucFirst(err.Error())+".")
		return
	}
	if !a.cfg.AllowsModel(in.Provider, in.Model) {
		writeError(w, http.StatusUnprocessableEntity, "model_not_allowed",
			"El modelo solicitado no está habilitado. Consulta GET /api/models.")
		return
	}

	tpl, reason := templates.Pick(in.Spec.SiteType, in.Spec.Industry, in.Spec.ContentNotes)
	j, err := a.st.CreateJob(in.Provider, in.Model, tpl.ID, in.Spec)
	if err != nil {
		writeStoreErr(w, err)
		return
	}
	log.Printf("job %s: plantilla=%s (%s)", j.ID, tpl.ID, reason)

	if a.runner != nil {
		a.runner.Submit(j.ID)
	}
	writeJSON(w, http.StatusCreated, map[string]any{"job": j})
}

// cancelJob señaliza la cancelación de un job en curso o en cola.
func (a *API) cancelJob(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	j, err := a.st.GetJob(id)
	if err != nil {
		writeStoreErr(w, err)
		return
	}
	switch j.Status {
	case "done", "error", "canceled":
		writeError(w, http.StatusConflict, "job_finalizado",
			"El job ya finalizó ("+j.Status+") y no puede cancelarse.")
		return
	}
	if a.runner != nil {
		a.runner.Cancel(id)
	}
	_ = a.st.SetJobStatus(id, "canceled")
	if j, err = a.st.GetJob(id); err != nil {
		writeStoreErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"job": j})
}

// getBilling devuelve la factura del job (USD + HNL). Si aún no hay uso capturado,
// responde con ceros y captured=false.
func (a *API) getBilling(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	j, err := a.st.GetJob(id)
	if err != nil {
		writeStoreErr(w, err)
		return
	}
	b := store.Billing{
		JobID:    j.ID,
		Status:   j.Status,
		Provider: j.Provider,
		Model:    j.Model,
		Currency: a.cfg.Pricing.Currency,
	}
	if u, err := a.st.GetUsageByJob(id); err == nil {
		b.InputTokens = u.InputTokens
		b.OutputTokens = u.OutputTokens
		b.CacheReadTokens = u.CacheReadTokens
		b.CacheWriteTokens = u.CacheWriteTokens
		b.ProviderCost = round4(u.ProviderCost)
		b.Margin = a.marginFor(j.Provider, j.Model)
		b.PriceUSD = round4(u.Price)
		b.PriceHNL = round2(u.Price * a.cfg.Pricing.HNLRate)
		b.Captured = true
	}
	writeJSON(w, http.StatusOK, b)
}

// preview sirve los archivos del sitio generado para enmarcarlos en la propia UI.
func (a *API) preview(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	site, err := a.st.GetSiteByJob(id)
	if err != nil {
		writeStoreErr(w, err)
		return
	}
	if site.WorkspaceDir == "" || !dirExists(site.WorkspaceDir) {
		writeError(w, http.StatusNotFound, "sin_sitio", "El job aún no tiene un sitio generado.")
		return
	}
	// Permite enmarcar SOLO en el mismo origen (la UI de OnStudio); el resto del
	// sitio mantiene X-Frame-Options: DENY del middleware global.
	w.Header().Set("X-Frame-Options", "SAMEORIGIN")
	prefix := "/api/jobs/" + id + "/preview"
	http.StripPrefix(prefix, http.FileServer(http.Dir(site.WorkspaceDir))).ServeHTTP(w, r)
}

// previewRedirect normaliza /preview (sin barra) → /preview/ para servir index.html.
func (a *API) previewRedirect(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/api/jobs/"+r.PathValue("id")+"/preview/", http.StatusFound)
}

// download entrega el sitio generado como un archivo .zip.
func (a *API) download(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	site, err := a.st.GetSiteByJob(id)
	if err != nil {
		writeStoreErr(w, err)
		return
	}
	if site.WorkspaceDir == "" || !dirExists(site.WorkspaceDir) {
		writeError(w, http.StatusNotFound, "sin_sitio", "El job aún no tiene un sitio generado.")
		return
	}
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="onstudio-%s.zip"`, id))
	if err := pipeline.ZipDir(w, site.WorkspaceDir); err != nil {
		log.Printf("download %s: zip falló: %v", id, err)
	}
}

func (a *API) marginFor(provider, model string) float64 {
	if r, ok, err := a.st.GetPrice(provider, model); err == nil && ok && r.Margin > 0 {
		return r.Margin
	}
	return a.cfg.Pricing.DefaultMargin
}

func dirExists(p string) bool {
	info, err := os.Stat(p)
	return err == nil && info.IsDir()
}

func ucFirst(s string) string {
	if s == "" {
		return s
	}
	r := []rune(s)
	r[0] = unicode.ToUpper(r[0])
	return string(r)
}

func round2(v float64) float64 { return math.Round(v*100) / 100 }
func round4(v float64) float64 { return math.Round(v*10000) / 10000 }
