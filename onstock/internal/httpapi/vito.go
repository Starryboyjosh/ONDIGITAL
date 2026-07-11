package httpapi

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"ondigital.hn/vito"
)

// StatusResponse is safe for the UI — never includes vendor/provider names.
type vitoStatusResponse struct {
	Assistant string `json:"assistant"`
	Enabled   bool   `json:"enabled"`
	Ready     bool   `json:"ready"`
	Message   string `json:"message,omitempty"`
}

func (a *API) getVitoStatus(w http.ResponseWriter, r *http.Request) {
	if a.vito == nil {
		writeJSON(w, http.StatusOK, vitoStatusResponse{
			Assistant: "Vito",
			Enabled:   false,
			Ready:     false,
			Message:   "Vito no está configurado en este servidor.",
		})
		return
	}
	enabled := a.vito.Enabled()
	msg := ""
	if !enabled {
		msg = "Vito está desactivado. El sistema funciona con normalidad sin el asistente."
	}
	writeJSON(w, http.StatusOK, vitoStatusResponse{
		Assistant: "Vito",
		Enabled:   enabled,
		Ready:     enabled,
		Message:   msg,
	})
}

type vitoAskBody struct {
	Message string         `json:"message"`
	History []vito.Message `json:"history"`
	Locale  string         `json:"locale"`
}

func (a *API) postVitoAsk(w http.ResponseWriter, r *http.Request) {
	if a.vito == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"error": "Vito no está disponible en este servidor.",
		})
		return
	}

	var body vitoAskBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "JSON inválido"})
		return
	}
	if strings.TrimSpace(body.Message) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "El mensaje es obligatorio"})
		return
	}

	res, err := a.vito.Ask(r.Context(), vito.AskRequest{
		Message: body.Message,
		History: body.History,
		Locale:  body.Locale,
	})
	if err != nil {
		// Log real cause server-side only (may mention provider); never send vendor names to UI.
		log.Printf("vito ask: %v", err)
		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error": "No pude procesar tu consulta ahora. Intenta de nuevo en un momento.",
		})
		return
	}
	writeJSON(w, http.StatusOK, res)
}

type vitoConfirmBody struct {
	ToolName  string         `json:"tool_name"`
	Arguments map[string]any `json:"arguments"`
}

func (a *API) postVitoConfirm(w http.ResponseWriter, r *http.Request) {
	if a.vito == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"error": "Vito no está disponible en este servidor.",
		})
		return
	}
	var body vitoConfirmBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "JSON inválido"})
		return
	}
	if strings.TrimSpace(body.ToolName) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "tool_name es obligatorio"})
		return
	}
	res, err := a.vito.ConfirmAction(r.Context(), body.ToolName, body.Arguments)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "No pude confirmar esa acción. Revisa los datos e intenta de nuevo.",
		})
		return
	}
	writeJSON(w, http.StatusOK, res)
}
