package vito

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Env keys (server-side only — never expose to the browser).
//
// El nombre del proveedor no aparece en las variables que edita quien instala
// el producto: el motor es intercambiable y el mensaje de error que sale al
// arrancar se lee en la misma ventana que mira el dueño del negocio. Las
// variables VITO_OPENCODE_* / OPENCODE_API_KEY siguen funcionando como alias
// para no romper los .env que ya existen.
const (
	EnvEnabled  = "VITO_ENABLED"
	EnvProvider = "VITO_PROVIDER" // local | nube (alias: mock | opencode)
	EnvAPIKey   = "VITO_API_KEY"
	EnvBaseURL  = "VITO_BASE_URL"
	EnvModel    = "VITO_MODEL"
	EnvLocale   = "VITO_LOCALE"

	// Alias aceptados: se leen si los de arriba vienen vacíos.
	// Los VITO_OPENCODE_* / OPENCODE_API_KEY son los nombres históricos y siguen
	// valiendo para no romper los .env ya escritos. VITO_MODELO existe porque
	// OnRoute lo adoptó en español antes de que el nombre canónico se fijara:
	// así un mismo .env sirve para los dos productos.
	EnvOpenCodeKey    = "VITO_OPENCODE_API_KEY"
	EnvOpenCodeKeyAlt = "OPENCODE_API_KEY"
	EnvOpenCodeBase   = "VITO_OPENCODE_BASE_URL"
	EnvOpenCodeModel  = "VITO_OPENCODE_MODEL"
	EnvModelAlt       = "VITO_MODELO"
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
		OpenCodeAPIKey:  firstNonEmpty(os.Getenv(EnvAPIKey), os.Getenv(EnvOpenCodeKey), os.Getenv(EnvOpenCodeKeyAlt)),
		OpenCodeBaseURL: firstNonEmpty(os.Getenv(EnvBaseURL), os.Getenv(EnvOpenCodeBase)),
		OpenCodeModel:   firstNonEmpty(os.Getenv(EnvModel), os.Getenv(EnvModelAlt), os.Getenv(EnvOpenCodeModel)),
	}
	cfg.Provider = normalizeProvider(cfg.Provider)
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
				"falta la clave del motor. En el archivo .env del producto pon %s=<tu clave> en una sola línea y sin comillas (no dejes el texto de ejemplo). Sin ella Vito sigue funcionando en modo local",
				EnvAPIKey,
			)
		}
		return NewOpenCodeProvider(OpenCodeConfig{
			APIKey:  cfg.OpenCodeAPIKey,
			BaseURL: cfg.OpenCodeBaseURL,
			Model:   cfg.OpenCodeModel,
		}), nil
	default:
		return nil, fmt.Errorf("motor %q desconocido (usa \"local\" o \"nube\")", cfg.Provider)
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
	if strings.Contains(k, "pega_tu") || strings.Contains(k, "your_key") {
		return true
	}
	for _, p := range placeholders {
		if k == p {
			return true
		}
	}
	return false
}

// normalizeProvider acepta los nombres neutros que se documentan ("local" y
// "nube") y los históricos ("mock" y "opencode"), que siguen siendo los valores
// internos. Así el .env del cliente no menciona a ningún proveedor y los
// archivos que ya estaban escritos siguen arrancando igual.
func normalizeProvider(p string) string {
	switch p {
	case "local", "offline", "mock":
		return "mock"
	case "nube", "cloud", "api", "opencode":
		return "opencode"
	default:
		return p
	}
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
		return svc, cfg, fmt.Errorf("Vito quedó en modo local: %w", err)
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
