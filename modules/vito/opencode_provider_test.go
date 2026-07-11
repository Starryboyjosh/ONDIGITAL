package vito_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"ondigital.hn/vito"
)

func TestOpenCodeProvider_Ask_Content(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			t.Errorf("path = %s", r.URL.Path)
		}
		if !strings.HasPrefix(r.Header.Get("Authorization"), "Bearer test-key") {
			t.Errorf("auth = %q", r.Header.Get("Authorization"))
		}
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		if body["model"] != "big-pickle" {
			t.Errorf("model = %v", body["model"])
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []map[string]any{
				{"message": map[string]any{
					"content": "Hay 3 productos con stock bajo en el inventario.",
				}},
			},
		})
	}))
	defer srv.Close()

	p := vito.NewOpenCodeProvider(vito.OpenCodeConfig{
		APIKey:     "test-key",
		BaseURL:    srv.URL,
		Model:      "big-pickle",
		HTTPClient: srv.Client(),
	})
	if p.Name() != "opencode" {
		t.Fatalf("name = %q", p.Name())
	}

	res, err := p.Ask(context.Background(), vito.ProviderRequest{
		System:   "Eres Vito",
		Messages: []vito.Message{{Role: vito.RoleUser, Content: "stock bajo"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(res.Content, "stock bajo") {
		t.Fatalf("content = %q", res.Content)
	}
	assertNoVendorLeak(t, res.Content)
}

func TestOpenCodeProvider_Ask_ToolCalls(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []map[string]any{
				{"message": map[string]any{
					"content": "",
					"tool_calls": []map[string]any{
						{
							"id":   "call_1",
							"type": "function",
							"function": map[string]any{
								"name":      "list_low_stock",
								"arguments": `{"limit":10}`,
							},
						},
					},
				}},
			},
		})
	}))
	defer srv.Close()

	p := vito.NewOpenCodeProvider(vito.OpenCodeConfig{
		APIKey:     "k",
		BaseURL:    srv.URL,
		HTTPClient: srv.Client(),
	})
	res, err := p.Ask(context.Background(), vito.ProviderRequest{
		Messages: []vito.Message{{Role: vito.RoleUser, Content: "agotados"}},
		Tools: []vito.Tool{{
			Name:        "list_low_stock",
			Description: "stock bajo",
			ReadOnly:    true,
		}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(res.ToolCalls) != 1 || res.ToolCalls[0].Name != "list_low_stock" {
		t.Fatalf("tool_calls = %+v", res.ToolCalls)
	}
	if res.ToolCalls[0].Arguments["limit"] != float64(10) {
		t.Fatalf("args = %+v", res.ToolCalls[0].Arguments)
	}
}

func TestOpenCodeProvider_HTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"error":"nope"}`, http.StatusUnauthorized)
	}))
	defer srv.Close()

	p := vito.NewOpenCodeProvider(vito.OpenCodeConfig{
		APIKey:     "bad",
		BaseURL:    srv.URL,
		HTTPClient: srv.Client(),
	})
	_, err := p.Ask(context.Background(), vito.ProviderRequest{
		Messages: []vito.Message{{Role: vito.RoleUser, Content: "hola"}},
	})
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestLoadEnvConfig_AutoMock(t *testing.T) {
	t.Setenv("VITO_ENABLED", "true")
	t.Setenv("VITO_PROVIDER", "")
	t.Setenv("VITO_OPENCODE_API_KEY", "")
	t.Setenv("OPENCODE_API_KEY", "")
	cfg := vito.LoadEnvConfig()
	if cfg.Provider != "mock" {
		t.Fatalf("provider = %q", cfg.Provider)
	}
}

func TestLoadEnvConfig_AutoOpenCode(t *testing.T) {
	t.Setenv("VITO_PROVIDER", "")
	t.Setenv("VITO_OPENCODE_API_KEY", "secret")
	cfg := vito.LoadEnvConfig()
	if cfg.Provider != "opencode" {
		t.Fatalf("provider = %q", cfg.Provider)
	}
}

func TestNewServiceFromEnv_Mock(t *testing.T) {
	t.Setenv("VITO_ENABLED", "1")
	t.Setenv("VITO_PROVIDER", "mock")
	svc, cfg, err := vito.NewServiceFromEnv(nil)
	if err != nil {
		t.Fatal(err)
	}
	if !svc.Enabled() || cfg.Provider != "mock" {
		t.Fatalf("enabled=%v provider=%s", svc.Enabled(), cfg.Provider)
	}
	res, err := svc.Ask(context.Background(), vito.AskRequest{Message: "hola"})
	if err != nil {
		t.Fatal(err)
	}
	assertNoVendorLeak(t, res.Reply)
}

func TestNewProvider_OpenCodeRequiresKey(t *testing.T) {
	_, err := vito.NewProvider(vito.EnvConfig{Provider: "opencode"})
	if err == nil {
		t.Fatal("expected error")
	}
}
