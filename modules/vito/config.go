package vito

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Env keys (server-side only — never expose to the browser).
const (
	EnvEnabled        = "VITO_ENABLED"
	EnvProvider       = "VITO_PROVIDER" // mock | opencode
	EnvOpenCodeKey    = "VITO_OPENCODE_API_KEY"
	EnvOpenCodeKeyAlt = "OPENCODE_API_KEY" // alias
	EnvOpenCodeBase   = "VITO_OPENCODE_BASE_URL"
	EnvOpenCodeModel  = "VITO_OPENCODE_MODEL"
	EnvLocale         = "VITO_LOCALE"
)

// Default OpenCode Zen endpoint (OpenAI-compatible chat completions).
const DefaultOpenCodeBaseURL = "https://opencode.ai/zen/v1"

// Default free-tier model id on OpenCode Zen (demo).
const DefaultOpenCodeModel = "big-pickle"

// EnvConfig is resolved from process environment (and optional .env loaded by the host).
type EnvConfig struct {
	Enabled  bool
	Provider string // "mock" | "opencode"
	Locale   string

	OpenCodeAPIKey  string
	OpenCodeBaseURL string
	OpenCodeModel   string
}

// LoadEnvConfig reads VITO_* (and OPENCODE_API_KEY) from the environment.
func LoadEnvConfig() EnvConfig {
	cfg := EnvConfig{
		Enabled:         envBool(EnvEnabled, true),
		Provider:        strings.ToLower(strings.TrimSpace(os.Getenv(EnvProvider))),
		Locale:          strings.TrimSpace(os.Getenv(EnvLocale)),
		OpenCodeAPIKey:  firstNonEmpty(os.Getenv(EnvOpenCodeKey), os.Getenv(EnvOpenCodeKeyAlt)),
		OpenCodeBaseURL: strings.TrimSpace(os.Getenv(EnvOpenCodeBase)),
		OpenCodeModel:   strings.TrimSpace(os.Getenv(EnvOpenCodeModel)),
	}
	// Reject copy-paste placeholders from .env.example
	if isPlaceholderKey(cfg.OpenCodeAPIKey) {
		cfg.OpenCodeAPIKey = ""
	}
	if cfg.Provider == "" {
		// Auto: live key → opencode; otherwise mock (offline-safe default).
		if cfg.OpenCodeAPIKey != "" {
			cfg.Provider = "opencode"
		} else {
			cfg.Provider = "mock"
		}
	}
	// If user forced opencode but key is missing/placeholder, stay explicit — NewProvider errors.
	if cfg.Locale == "" {
		cfg.Locale = "es-HN"
	}
	if cfg.OpenCodeBaseURL == "" {
		cfg.OpenCodeBaseURL = DefaultOpenCodeBaseURL
	}
	if cfg.OpenCodeModel == "" {
		cfg.OpenCodeModel = DefaultOpenCodeModel
	}
	return cfg
}

// NewProvider builds a Provider from env config.
// Returns mock when disabled path still needs a provider for construction,
// or when provider=mock, or when opencode is requested without a key (falls back to mock + error note).
func NewProvider(cfg EnvConfig) (Provider, error) {
	switch cfg.Provider {
	case "mock", "":
		return NewMockProvider(), nil
	case "opencode":
		if cfg.OpenCodeAPIKey == "" || isPlaceholderKey(cfg.OpenCodeAPIKey) {
			return nil, fmt.Errorf(
				"vito: falta una API key real. En onstock/.env pon VITO_OPENCODE_API_KEY=tu_key (no dejes el texto pega_tu_key_aqui del ejemplo). Key en https://opencode.ai/auth",
			)
		}
		return NewOpenCodeProvider(OpenCodeConfig{
			APIKey:  cfg.OpenCodeAPIKey,
			BaseURL: cfg.OpenCodeBaseURL,
			Model:   cfg.OpenCodeModel,
		}), nil
	default:
		return nil, fmt.Errorf("vito: unknown provider %q (use mock or opencode)", cfg.Provider)
	}
}

func isPlaceholderKey(k string) bool {
	k = strings.TrimSpace(strings.ToLower(k))
	if k == "" {
		return true
	}
	placeholders := []string{
		"pega_tu_key_aqui",
		"your_api_key",
		"tu_key",
		"tu_key_real_aqui",
		"changeme",
		"xxx",
		"sk-xxx",
		"sk-...",
		"replace_me",
	}
	for _, p := range placeholders {
		if k == p || strings.Contains(k, "pega_tu") || strings.Contains(k, "your_key") {
			return true
		}
	}
	return false
}

// NewServiceFromEnv constructs a Service using environment configuration.
// tools may be nil (empty registry). On provider misconfig with Enabled=true and
// provider=opencode without key, falls back to mock and keeps Enabled as requested
// only if FallbackMockOnError — here we return error so host can decide.
func NewServiceFromEnv(tools *Registry) (*Service, EnvConfig, error) {
	cfg := LoadEnvConfig()
	prov, err := NewProvider(cfg)
	if err != nil {
		// Safe fallback: mock so the app never fails to boot.
		prov = NewMockProvider()
		svc, nerr := New(Config{
			Enabled: cfg.Enabled,
			Locale:  cfg.Locale,
		}, prov, tools)
		if nerr != nil {
			return nil, cfg, nerr
		}
		return svc, cfg, fmt.Errorf("vito: using mock fallback: %w", err)
	}
	svc, err := New(Config{
		Enabled: cfg.Enabled,
		Locale:  cfg.Locale,
	}, prov, tools)
	return svc, cfg, err
}

func envBool(key string, def bool) bool {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		// accept 1/0 already via ParseBool; also "yes"/"no"
		switch strings.ToLower(v) {
		case "1", "yes", "y", "on", "si", "sí":
			return true
		case "0", "no", "n", "off":
			return false
		default:
			return def
		}
	}
	return b
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if s := strings.TrimSpace(v); s != "" {
			return s
		}
	}
	return ""
}
