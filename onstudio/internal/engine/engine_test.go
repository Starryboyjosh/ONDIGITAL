package engine

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// testEngine arma un Engine en modo externo apuntando al servidor mock, con
// credenciales conocidas para verificar el Basic Auth. Caja blanca: el test vive
// en el paquete `engine`, así que toca campos no exportados directamente.
func testEngine(srv *httptest.Server) *Engine {
	return &Engine{
		mode:    "external",
		baseURL: strings.TrimRight(srv.URL, "/"),
		timeout: 5 * time.Second,
		user:    "opencode",
		pass:    "s3cret",
		hc:      srv.Client(),
	}
}

func TestCreateSession(t *testing.T) {
	var gotMethod, gotPath, gotCT, gotUser, gotPass string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMethod, gotPath, gotCT = r.Method, r.URL.Path, r.Header.Get("Content-Type")
		gotUser, gotPass, _ = r.BasicAuth()
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"id":"ses_abc123"}`)
	}))
	defer srv.Close()

	id, err := testEngine(srv).CreateSession(context.Background(), "OnStudio job")
	if err != nil {
		t.Fatalf("CreateSession: %v", err)
	}
	if id != "ses_abc123" {
		t.Errorf("id = %q, want ses_abc123", id)
	}
	if gotMethod != http.MethodPost {
		t.Errorf("método = %q, want POST", gotMethod)
	}
	if gotPath != "/session" {
		t.Errorf("path = %q, want /session", gotPath)
	}
	if gotCT != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", gotCT)
	}
	if gotUser != "opencode" || gotPass != "s3cret" {
		t.Errorf("Basic Auth = %q:%q, want opencode:s3cret", gotUser, gotPass)
	}
}

func TestCreateSessionEmptyID(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{}`)
	}))
	defer srv.Close()

	if _, err := testEngine(srv).CreateSession(context.Background(), "x"); err == nil {
		t.Fatal("se esperaba error cuando el servidor no devuelve id")
	}
}

func TestCreateSessionHTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer srv.Close()

	_, err := testEngine(srv).CreateSession(context.Background(), "x")
	if err == nil {
		t.Fatal("se esperaba error en HTTP 500")
	}
	if !strings.Contains(err.Error(), "HTTP 500") {
		t.Errorf("error = %v, debería mencionar HTTP 500", err)
	}
}

func TestPrompt(t *testing.T) {
	var gotPath string
	var gotReq messageReq
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		_ = json.NewDecoder(r.Body).Decode(&gotReq)
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{
			"info": {
				"id": "msg_1",
				"role": "assistant",
				"cost": 0.01234,
				"tokens": {"input": 1200, "output": 800, "reasoning": 50, "cache": {"read": 300, "write": 100}}
			},
			"parts": [
				{"type": "text", "text": "part-one "},
				{"type": "step-start"},
				{"type": "text", "text": "part-two"}
			]
		}`)
	}))
	defer srv.Close()

	res, err := testEngine(srv).Prompt(context.Background(), PromptInput{
		SessionID:  "ses_x",
		ProviderID: "anthropic",
		ModelID:    "claude-sonnet-4-5",
		Agent:      "site-builder",
		Text:       "genera el sitio",
	})
	if err != nil {
		t.Fatalf("Prompt: %v", err)
	}

	if gotPath != "/session/ses_x/message" {
		t.Errorf("path = %q, want /session/ses_x/message", gotPath)
	}
	if gotReq.Model == nil || gotReq.Model.ProviderID != "anthropic" || gotReq.Model.ModelID != "claude-sonnet-4-5" {
		t.Errorf("model en el cuerpo = %+v, want anthropic/claude-sonnet-4-5", gotReq.Model)
	}
	if gotReq.Agent != "site-builder" {
		t.Errorf("agent = %q, want site-builder", gotReq.Agent)
	}
	if len(gotReq.Parts) != 1 || gotReq.Parts[0].Type != "text" || gotReq.Parts[0].Text != "genera el sitio" {
		t.Errorf("parts = %+v, want un text part 'genera el sitio'", gotReq.Parts)
	}

	if res.MessageID != "msg_1" {
		t.Errorf("MessageID = %q, want msg_1", res.MessageID)
	}
	if res.Text != "part-one part-two" {
		t.Errorf("Text = %q, want 'part-one part-two'", res.Text)
	}
	want := Usage{InputTokens: 1200, OutputTokens: 800, ReasoningTokens: 50, CacheReadTokens: 300, CacheWriteTokens: 100, Cost: 0.01234}
	if res.Usage != want {
		t.Errorf("Usage = %+v, want %+v", res.Usage, want)
	}
}

func TestPromptAssistantError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{
			"info": {
				"id": "msg_err",
				"role": "assistant",
				"error": {"name": "ProviderAuthError", "data": {"message": "API key inválida"}}
			},
			"parts": []
		}`)
	}))
	defer srv.Close()

	_, err := testEngine(srv).Prompt(context.Background(), PromptInput{
		SessionID: "ses_x", ProviderID: "anthropic", ModelID: "claude-sonnet-4-5", Text: "hola",
	})
	if err == nil {
		t.Fatal("se esperaba error cuando info.error está presente")
	}
	if !strings.Contains(err.Error(), "API key inválida") {
		t.Errorf("error = %v, debería surfacear el mensaje del asistente", err)
	}
}

func TestPromptHTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "no autorizado", http.StatusUnauthorized)
	}))
	defer srv.Close()

	_, err := testEngine(srv).Prompt(context.Background(), PromptInput{
		SessionID: "ses_x", ProviderID: "anthropic", ModelID: "claude-sonnet-4-5", Text: "hola",
	})
	if err == nil {
		t.Fatal("se esperaba error en HTTP 401")
	}
	if !strings.Contains(err.Error(), "HTTP 401") {
		t.Errorf("error = %v, debería mencionar HTTP 401", err)
	}
}

func TestPromptValidation(t *testing.T) {
	// baseURL inválida a propósito: si la validación falla, no debe haber request.
	e := &Engine{baseURL: "http://127.0.0.1:1", timeout: time.Second, hc: http.DefaultClient}

	cases := []struct {
		name string
		in   PromptInput
	}{
		{"sin sesión", PromptInput{ProviderID: "anthropic", ModelID: "m", Text: "x"}},
		{"sin provider", PromptInput{SessionID: "ses", ModelID: "m", Text: "x"}},
		{"sin modelo", PromptInput{SessionID: "ses", ProviderID: "anthropic", Text: "x"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := e.Prompt(context.Background(), tc.in); err == nil {
				t.Errorf("se esperaba error de validación para %q", tc.name)
			}
		})
	}
}

func TestHealth(t *testing.T) {
	okSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/doc" {
			t.Errorf("Health pidió %q, want /doc", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer okSrv.Close()
	if err := testEngine(okSrv).Health(context.Background()); err != nil {
		t.Errorf("Health (200) = %v, want nil", err)
	}

	downSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer downSrv.Close()
	if err := testEngine(downSrv).Health(context.Background()); err == nil {
		t.Error("Health (503) = nil, want error")
	}
}
