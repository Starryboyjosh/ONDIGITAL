// Package config carga la configuración de OnStudio (puerto, motor, modelos y
// precios). Los secretos NO viven aquí: las llaves de proveedor se leen del
// entorno del proceso y se resuelven en opencode.json con {env:VAR}.
package config

import (
	"encoding/json"
	"os"
	"strconv"
)

// Engine describe cómo OnStudio habla con el motor OpenCode (Phase 2).
type Engine struct {
	Mode        string `json:"mode"` // managed | external
	OpencodeBin string `json:"opencode_bin"`
	OpencodeURL string `json:"opencode_url"`
	TimeoutMs   int    `json:"timeout_ms"`
}

// Model es una entrada del selector de modelos permitidos.
type Model struct {
	Provider string `json:"provider"`
	Model    string `json:"model"`
	Label    string `json:"label"`
}

// PriceRule es el costo base y margen de un modelo (placeholders hasta que el
// operador los complete con tarifas reales).
type PriceRule struct {
	Provider      string  `json:"provider"`
	Model         string  `json:"model"`
	InputPerMTok  float64 `json:"input_per_mtok"`
	OutputPerMTok float64 `json:"output_per_mtok"`
	Margin        float64 `json:"margin"`
}

// Pricing agrupa moneda, conversión a HNL, margen por defecto y reglas por modelo.
type Pricing struct {
	Currency           string      `json:"currency"`
	HNLRate            float64     `json:"hnl_rate"`
	DefaultMargin      float64     `json:"default_margin"`
	PreferReportedCost bool        `json:"prefer_reported_cost"`
	Models             []PriceRule `json:"models"`
}

// Config es la configuración del negocio (no secretos).
type Config struct {
	Port          int     `json:"port"`
	DataDir       string  `json:"data_dir"`
	TemplatesDir  string  `json:"templates_dir"`
	Engine        Engine  `json:"engine"`
	AllowedModels []Model `json:"allowed_models"`
	Pricing       Pricing `json:"pricing"`
}

// Default devuelve una configuración usable sin archivo (para `make dev`).
func Default() Config {
	return Config{
		Port:         8100,
		DataDir:      "./data",
		TemplatesDir: "./templates",
		Engine: Engine{
			Mode:        "managed",
			OpencodeBin: "opencode",
			OpencodeURL: "http://127.0.0.1:4096",
			TimeoutMs:   300000,
		},
		Pricing: Pricing{
			Currency:           "USD",
			HNLRate:            24.6,
			DefaultMargin:      2.0,
			PreferReportedCost: true,
		},
	}
}

// Load lee la config desde path. Si no existe, intenta examplePath y, si tampoco,
// usa Default(). Nunca falla por ausencia de archivo. Aplica overrides de entorno
// (ONSTUDIO_PORT, ONSTUDIO_DATA_DIR). Devuelve también la fuente efectiva.
func Load(path, examplePath string) (Config, string, error) {
	cfg := Default()
	source := "defaults"

	data, err := os.ReadFile(path)
	if err == nil {
		source = path
	} else if data, err = os.ReadFile(examplePath); err == nil {
		source = examplePath
	}
	if source != "defaults" && len(data) > 0 {
		if err := json.Unmarshal(data, &cfg); err != nil {
			return cfg, source, err
		}
	}

	cfg.applyEnv()
	cfg.fillDefaults()
	return cfg, source, nil
}

func (c *Config) applyEnv() {
	if v := os.Getenv("ONSTUDIO_PORT"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			c.Port = n
		}
	}
	if v := os.Getenv("ONSTUDIO_DATA_DIR"); v != "" {
		c.DataDir = v
	}
}

func (c *Config) fillDefaults() {
	d := Default()
	if c.Port == 0 {
		c.Port = d.Port
	}
	if c.DataDir == "" {
		c.DataDir = d.DataDir
	}
	if c.TemplatesDir == "" {
		c.TemplatesDir = d.TemplatesDir
	}
	if c.Engine.OpencodeURL == "" {
		c.Engine = d.Engine
	}
	if c.Pricing.Currency == "" {
		c.Pricing.Currency = d.Pricing.Currency
	}
	if c.Pricing.HNLRate == 0 {
		c.Pricing.HNLRate = d.Pricing.HNLRate
	}
	if c.Pricing.DefaultMargin == 0 {
		c.Pricing.DefaultMargin = d.Pricing.DefaultMargin
	}
}

// AllowsModel indica si (provider, model) está en allowed_models.
func (c Config) AllowsModel(provider, model string) bool {
	for _, m := range c.AllowedModels {
		if m.Provider == provider && m.Model == model {
			return true
		}
	}
	return false
}
