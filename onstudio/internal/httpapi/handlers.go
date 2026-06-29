package httpapi

import (
	"math"
	"net/http"
	"strings"
	"time"

	"onstudio/internal/store"
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
			"configured": false,
			"note":       "El motor OpenCode se integra en Phase 2; aún no se inicia.",
		},
		"models_count":    len(a.cfg.AllowedModels),
		"templates_count": len(catalog),
	})
}

// getModels devuelve los modelos habilitados (allowed_models de la config).
func (a *API) getModels(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, a.cfg.AllowedModels)
}

// getTemplates devuelve el catálogo de plantillas Pro disponibles.
func (a *API) getTemplates(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, catalog)
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

// createJob valida el modelo y la spec, y persiste un job 'queued'. La
// generación real (motor OpenCode) llega en Phase 2; aquí no se ejecuta nada.
func (a *API) createJob(w http.ResponseWriter, r *http.Request) {
	in, err := decode[store.NewJobInput](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Cuerpo JSON inválido: "+err.Error())
		return
	}
	in.Provider = strings.TrimSpace(in.Provider)
	in.Model = strings.TrimSpace(in.Model)
	in.Spec.BusinessName = strings.TrimSpace(in.Spec.BusinessName)
	in.Spec.SiteType = strings.TrimSpace(in.Spec.SiteType)

	if in.Spec.BusinessName == "" {
		writeError(w, http.StatusBadRequest, "spec_invalid", "Falta el nombre del negocio (spec.business_name).")
		return
	}
	if in.Spec.SiteType == "" {
		writeError(w, http.StatusBadRequest, "spec_invalid", "Falta el tipo de sitio (spec.site_type).")
		return
	}
	if !a.cfg.AllowsModel(in.Provider, in.Model) {
		writeError(w, http.StatusUnprocessableEntity, "model_not_allowed",
			"El modelo solicitado no está habilitado. Consulta GET /api/models.")
		return
	}

	templateID := pickTemplate(in.Spec.SiteType)
	j, err := a.st.CreateJob(in.Provider, in.Model, templateID, in.Spec)
	if err != nil {
		writeStoreErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"job": j})
}

// getBilling devuelve la factura del job (USD + HNL). Si aún no hay uso
// capturado, responde con ceros y captured=false.
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
		b.ProviderCost = round2(u.ProviderCost)
		b.PriceUSD = round2(u.Price)
		b.PriceHNL = round2(u.Price * a.cfg.Pricing.HNLRate)
		b.Captured = true
	}
	writeJSON(w, http.StatusOK, b)
}

func round2(v float64) float64 { return math.Round(v*100) / 100 }
