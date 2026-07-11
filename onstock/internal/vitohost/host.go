// Package vitohost wires business modules + Vito into OnStock.
package vitohost

import (
	"log"
	"path/filepath"

	"ondigital.hn/modkit"
	"ondigital.hn/vito"
	"onstock/internal/store"
)

// Host holds the module catalog and optional Vito service for this process.
type Host struct {
	Catalog  *modkit.Catalog
	Service  *vito.Service
	Env      vito.EnvConfig
	Fallback bool // true when we fell back to mock due to misconfig
}

// Bootstrap loads .env, registers the OnStock module, and optionally starts Vito.
func Bootstrap(baseDir string, st *store.Store) *Host {
	vito.LoadDotEnvFiles(
		filepath.Join(baseDir, ".env"),
		filepath.Join(baseDir, "data", ".env"),
		".env",
	)

	cat := modkit.NewCatalog()
	mod := NewOnStockModule(st)
	if err := cat.Register(mod); err != nil {
		log.Printf("modkit: no se pudo registrar OnStock: %v", err)
	}

	reg := vito.NewRegistry()
	// Tools only from the module contract (works with Vito off too if never called).
	if err := cat.RegisterAllVitoTools(reg); err != nil {
		log.Printf("vito: tools del catálogo: %v", err)
	}

	svc, cfg, err := vito.NewServiceFromEnv(reg)
	h := &Host{Catalog: cat, Service: svc, Env: cfg}
	if err != nil {
		h.Fallback = true
		log.Printf("vito: %v", err)
		log.Printf("vito: usando mock local (tools OnStock sí funcionan). Para API real: edita onstock/.env con una key válida y reinicia.")
	}
	if svc != nil {
		keyState := "sin key"
		if cfg.OpenCodeAPIKey != "" {
			keyState = "key ok"
		}
		log.Printf("vito: listo (enabled=%v provider=%s tools=%d modules=%d %s)",
			svc.Enabled(), svc.ProviderName(), len(reg.List()), len(cat.List()), keyState)
	}
	return h
}
