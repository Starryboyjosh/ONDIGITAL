package httpapi

import (
	"net/http"
	"strings"

	"ondigital.hn/tenant"
)

func (a *API) getTenant(w http.ResponseWriter, r *http.Request) {
	view, err := a.st.PublicTenantView()
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, view)
}

type putTenantBody struct {
	Plan     string `json:"plan"`
	TenantID string `json:"tenant_id"`
	Modules  string `json:"modules"` // comma-separated
}

func (a *API) putTenant(w http.ResponseWriter, r *http.Request) {
	body, err := decode[putTenantBody](r)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "JSON inválido"})
		return
	}
	patch := map[string]string{}
	if body.Plan != "" {
		p, err := tenant.ParsePlan(body.Plan)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		patch["plan"] = string(p)
	}
	if strings.TrimSpace(body.TenantID) != "" {
		patch["tenant_id"] = strings.TrimSpace(body.TenantID)
	}
	if body.Modules != "" {
		patch["modules"] = body.Modules
	}
	if len(patch) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "nada que actualizar"})
		return
	}
	if err := a.st.SetSettings(patch); err != nil {
		writeErr(w, err)
		return
	}
	view, err := a.st.PublicTenantView()
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, view)
}
