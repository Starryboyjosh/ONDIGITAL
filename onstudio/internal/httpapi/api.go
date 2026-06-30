// Package httpapi expone la API REST de OnStudio y sirve la SPA embebida.
// Mismo patrón que OnStock/OnServe. La interfaz habla SOLO con esta API; las
// llaves de proveedor nunca salen del servidor (no se aceptan ni se devuelven).
package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"log"
	"net/http"
	"strings"
	"time"

	"onstudio/internal/config"
	"onstudio/internal/store"
)

// JobRunner ejecuta la generación de un job en segundo plano. La implementa
// *pipeline.Runner; se inyecta con SetRunner. Si es nil (p.ej. en tests de la API),
// los jobs se crean en estado 'queued' y no se ejecuta generación.
type JobRunner interface {
	Submit(jobID string)
	Cancel(jobID string) bool
}

type API struct {
	st      *store.Store
	cfg     config.Config
	version string
	started time.Time
	runner  JobRunner
}

func New(st *store.Store, cfg config.Config, version string) *API {
	return &API{st: st, cfg: cfg, version: version, started: time.Now()}
}

// SetRunner conecta el runner de generación (lo llama main tras construir el motor).
func (a *API) SetRunner(r JobRunner) { a.runner = r }

func (a *API) Router(webFS fs.FS) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", a.getHealth)
	mux.HandleFunc("GET /api/models", a.getModels)
	mux.HandleFunc("GET /api/templates", a.getTemplates)
	mux.HandleFunc("GET /api/jobs", a.listJobs)
	mux.HandleFunc("POST /api/jobs", a.createJob)
	mux.HandleFunc("GET /api/jobs/{id}", a.getJob)
	mux.HandleFunc("GET /api/jobs/{id}/billing", a.getBilling)
	mux.HandleFunc("POST /api/jobs/{id}/cancel", a.cancelJob)
	mux.HandleFunc("GET /api/jobs/{id}/download", a.download)
	mux.HandleFunc("GET /api/jobs/{id}/preview", a.previewRedirect)
	mux.HandleFunc("GET /api/jobs/{id}/preview/{path...}", a.preview)

	mux.Handle("/", http.FileServer(http.FS(webFS)))

	return securityHeaders(logMiddleware(mux))
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "same-origin")
		h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		next.ServeHTTP(w, r)
	})
}

func logMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
		if strings.HasPrefix(r.URL.Path, "/api/") {
			log.Printf("%s %s", r.Method, r.URL.Path)
		}
	})
}

// ── Helpers ─────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// apiError es la forma estable de error de la API: {error:{code,message}}.
type apiError struct {
	Error errBody `json:"error"`
}
type errBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, apiError{Error: errBody{Code: code, Message: message}})
}

func writeStoreErr(w http.ResponseWriter, err error) {
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not_found", "Recurso no encontrado.")
		return
	}
	writeError(w, http.StatusInternalServerError, "internal", "Error interno del servidor.")
}

// decode lee un único valor JSON del cuerpo (máx. 1 MiB) y rechaza campos
// desconocidos y cuerpos con más de un valor.
func decode[T any](r *http.Request) (T, error) {
	var v T
	dec := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&v); err != nil {
		return v, err
	}
	if err := dec.Decode(&struct{}{}); err != io.EOF {
		if err == nil {
			err = errors.New("el cuerpo debe contener un solo objeto JSON")
		}
		return v, err
	}
	return v, nil
}
