package config

import (
	"os"
	"path/filepath"
	"testing"
)

// TestLoadShippedExample valida que el config.example.json que se distribuye
// parsea contra la struct (incluye el campo _comment, que debe ignorarse).
func TestLoadShippedExample(t *testing.T) {
	cfg, source, err := Load("does-not-exist.json", "../../config.example.json")
	if err != nil {
		t.Fatalf("Load example: %v", err)
	}
	if filepath.Base(source) != "config.example.json" {
		t.Fatalf("fuente inesperada: %s", source)
	}
	if cfg.Port != 8100 {
		t.Fatalf("port inesperado: %d", cfg.Port)
	}
	if len(cfg.AllowedModels) == 0 {
		t.Fatalf("se esperaban allowed_models en el example")
	}
	if len(cfg.Pricing.Models) == 0 {
		t.Fatalf("se esperaban pricing.models en el example")
	}
	if cfg.Pricing.Currency == "" || cfg.Pricing.HNLRate <= 0 {
		t.Fatalf("pricing incompleto: %+v", cfg.Pricing)
	}
}

// TestLoadFallsBackToDefaults verifica que sin archivos se usan los defaults.
func TestLoadFallsBackToDefaults(t *testing.T) {
	cfg, source, err := Load("nope.json", "nope.example.json")
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if source != "defaults" {
		t.Fatalf("esperaba fuente=defaults, got %s", source)
	}
	if cfg.Port != 8100 || cfg.Engine.OpencodeURL == "" {
		t.Fatalf("defaults incompletos: %+v", cfg)
	}
}

// TestEnvOverridesPort confirma que ONSTUDIO_PORT pisa el valor del archivo.
func TestEnvOverridesPort(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	if err := os.WriteFile(path, []byte(`{"port":8100,"_comment":"hola"}`), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	t.Setenv("ONSTUDIO_PORT", "9999")
	cfg, _, err := Load(path, "")
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.Port != 9999 {
		t.Fatalf("env override falló: port=%d", cfg.Port)
	}
}

// TestAllowsModel cubre la validación usada por POST /api/jobs.
func TestAllowsModel(t *testing.T) {
	cfg := Default()
	cfg.AllowedModels = []Model{{Provider: "anthropic", Model: "claude-sonnet-4-5"}}
	if !cfg.AllowsModel("anthropic", "claude-sonnet-4-5") {
		t.Fatal("debería permitir el modelo configurado")
	}
	if cfg.AllowsModel("openai", "ghost") {
		t.Fatal("no debería permitir un modelo ausente")
	}
}
