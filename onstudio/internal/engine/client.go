package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// maxRespBytes acota cuánto leemos de una respuesta de OpenCode. El cuerpo del
// mensaje del asistente trae el sitio generado (propuesta de archivos en JSON),
// así que damos margen amplio pero protegemos la memoria contra una respuesta
// descontrolada. Si algún día un sitio legítimo lo excede, se sube aquí.
const maxRespBytes = 32 << 20 // 32 MiB

// do ejecuta una llamada HTTP al servidor OpenCode: serializa `body` a JSON (si
// lo hay), aplica Basic Auth, valida el código de estado y decodifica la
// respuesta en `out` (si lo hay). El deadline lo fija el `ctx` que recibe; los
// métodos públicos derivan su propio timeout antes de llamar.
func (e *Engine) do(ctx context.Context, method, path string, body, out any) error {
	var reqBody io.Reader
	if body != nil {
		buf, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("engine: serializando cuerpo de %s %s: %w", method, path, err)
		}
		reqBody = bytes.NewReader(buf)
	}

	req, err := http.NewRequestWithContext(ctx, method, e.baseURL+path, reqBody)
	if err != nil {
		return err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Accept", "application/json")
	e.auth(req)

	resp, err := e.hc.Do(req)
	if err != nil {
		return fmt.Errorf("engine: %s %s: %w", method, path, err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(io.LimitReader(resp.Body, maxRespBytes))
	if err != nil {
		return fmt.Errorf("engine: leyendo respuesta de %s %s: %w", method, path, err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("engine: %s %s devolvió HTTP %d: %s", method, path, resp.StatusCode, snippet(data))
	}
	if out != nil {
		if err := json.Unmarshal(data, out); err != nil {
			return fmt.Errorf("engine: decodificando respuesta de %s %s: %w", method, path, err)
		}
	}
	return nil
}

// CreateSession abre una sesión en OpenCode y devuelve su id. Es la primera
// llamada de un job: la sesión agrupa el (único, por ahora) turno de generación.
func (e *Engine) CreateSession(ctx context.Context, title string) (string, error) {
	cctx, cancel := context.WithTimeout(ctx, sessionTimeout)
	defer cancel()

	var resp sessionResp
	if err := e.do(cctx, http.MethodPost, "/session", sessionReq{Title: title}, &resp); err != nil {
		return "", err
	}
	if strings.TrimSpace(resp.ID) == "" {
		return "", errors.New("engine: POST /session no devolvió id de sesión")
	}
	return resp.ID, nil
}

// Prompt envía un turno síncrono a la sesión con el modelo elegido y devuelve el
// texto concatenado del asistente más el uso (tokens + costo) reportado. Si el
// asistente reporta un error interno (`info.error`), se traduce a un error de Go.
func (e *Engine) Prompt(ctx context.Context, in PromptInput) (Result, error) {
	if strings.TrimSpace(in.SessionID) == "" {
		return Result{}, errors.New("engine: PromptInput.SessionID vacío")
	}
	if strings.TrimSpace(in.ProviderID) == "" || strings.TrimSpace(in.ModelID) == "" {
		return Result{}, errors.New("engine: PromptInput requiere ProviderID y ModelID")
	}

	body := messageReq{
		Model: &modelRef{ProviderID: in.ProviderID, ModelID: in.ModelID},
		Agent: in.Agent,
		Parts: []textPartInput{{Type: "text", Text: in.Text}},
	}

	pctx, cancel := context.WithTimeout(ctx, e.timeout)
	defer cancel()

	var resp messageResp
	path := "/session/" + url.PathEscape(in.SessionID) + "/message"
	if err := e.do(pctx, http.MethodPost, path, body, &resp); err != nil {
		return Result{}, err
	}

	if resp.Info.Error != nil {
		msg := strings.TrimSpace(resp.Info.Error.Data.Message)
		if msg == "" {
			msg = strings.TrimSpace(resp.Info.Error.Name)
		}
		if msg == "" {
			msg = "el asistente devolvió un error sin detalle"
		}
		return Result{}, fmt.Errorf("engine: turno falló: %s", msg)
	}

	var sb strings.Builder
	for _, p := range resp.Parts {
		if p.Type == "text" && p.Text != "" {
			sb.WriteString(p.Text)
		}
	}

	return Result{
		MessageID: resp.Info.ID,
		Text:      sb.String(),
		Usage: Usage{
			InputTokens:      resp.Info.Tokens.Input,
			OutputTokens:     resp.Info.Tokens.Output,
			ReasoningTokens:  resp.Info.Tokens.Reasoning,
			CacheReadTokens:  resp.Info.Tokens.Cache.Read,
			CacheWriteTokens: resp.Info.Tokens.Cache.Write,
			Cost:             resp.Info.Cost,
		},
	}, nil
}

// snippet recorta un cuerpo de error a algo legible para logs sin volcar todo.
// Corta por runas para no romper UTF-8 a media secuencia.
func snippet(b []byte) string {
	const max = 300
	s := strings.TrimSpace(string(b))
	r := []rune(s)
	if len(r) > max {
		return string(r[:max]) + "…"
	}
	return s
}
