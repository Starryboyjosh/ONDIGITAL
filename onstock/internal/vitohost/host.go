// Package vitohost wires business modules + Vito into OnStock.
package vitohost

import (
	"errors"
	"fmt"
	"log"
	"path/filepath"
	"strings"

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
		// Esta ventana la deja abierta el dueño del negocio, no un programador.
		// Se imprime el motivo en español y sin jerga: el envoltorio técnico que
		// añade la capa de proveedores se desenvuelve antes de mostrarlo.
		log.Printf("vito: %s", motivoMotorLocal(err))
		log.Printf("vito: mientras tanto responde con el motor local; el inventario, las ventas y los reportes se consultan igual.")
	}
	if svc != nil {
		// Esta línea sale en la misma ventana que ve el dueño del negocio, así
		// que describe el motor por dónde corre —nube o equipo local— y nunca
		// por el nombre del proveedor. Cuál es el proveedor es un detalle de
		// implementación que vive en la capa de providers, no en pantalla.
		motor := "en la nube"
		switch {
		case h.Fallback:
			motor = "local (sin conexión al servicio)"
		case cfg.OpenCodeAPIKey == "":
			motor = "local"
		}
		log.Printf("vito: listo (activo=%v · motor %s · %s · %s)",
			svc.Enabled(), motor,
			plural(len(reg.List()), "herramienta", "herramientas"),
			plural(len(cat.List()), "módulo", "módulos"))
	}
	return h
}

// motivoMotorLocal deja el mensaje que de verdad le sirve al dueño del negocio:
// quita el envoltorio técnico de las capas intermedias y el prefijo "vito:" que
// cada una vuelve a agregar, para que la ventana no muestre la misma palabra
// tres veces ni una frase en inglés.
func motivoMotorLocal(err error) string {
	for {
		inner := errors.Unwrap(err)
		if inner == nil {
			break
		}
		err = inner
	}
	msg := strings.TrimSpace(strings.TrimPrefix(err.Error(), "vito: "))
	if msg == "" {
		return "no se pudo contactar el motor en la nube"
	}
	return msg
}

func plural(n int, singular, plural string) string {
	if n == 1 {
		return fmt.Sprintf("%d %s", n, singular)
	}
	return fmt.Sprintf("%d %s", n, plural)
}
