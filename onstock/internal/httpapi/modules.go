package httpapi

import "net/http"

func (a *API) getModules(w http.ResponseWriter, r *http.Request) {
	if a.catalog == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"modules": []any{},
			"count":   0,
		})
		return
	}
	infos := a.catalog.Infos()
	writeJSON(w, http.StatusOK, map[string]any{
		"modules": infos,
		"count":   len(infos),
	})
}
