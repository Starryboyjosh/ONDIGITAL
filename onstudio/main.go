// OnStudio — Generador de sitios web para empresas asistido por IA (ONDIGITAL).
// Un solo ejecutable: servidor HTTP + SQLite local + UI embebida. El motor de
// generación es OpenCode (multi-proveedor) y se integra en Phase 2. Las llaves
// de API viven solo en el entorno del servidor, nunca en el navegador ni en commits.
package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"time"

	"onstudio/internal/config"
	"onstudio/internal/httpapi"
	"onstudio/internal/store"
)

const version = "0.1.0-phase1"

//go:embed web
var webFiles embed.FS

func main() {
	var (
		port       = flag.Int("port", 0, "puerto del servidor (0 = el de config/entorno)")
		dataDir    = flag.String("data", "", "carpeta de datos (vacío = el de config/entorno)")
		configPath = flag.String("config", "config.json", "archivo de configuración")
		noOpen     = flag.Bool("no-open", false, "no abrir el navegador automáticamente")
	)
	flag.Parse()
	_ = noOpen // El auto-open del navegador llega en Phase 5; el flag ya se acepta para `make dev`.

	cfg, source, err := config.Load(*configPath, "config.example.json")
	if err != nil {
		log.Fatalf("Error leyendo configuración (%s): %v", source, err)
	}
	if *port > 0 {
		cfg.Port = *port
	}
	if *dataDir != "" {
		cfg.DataDir = *dataDir
	}

	st, err := store.Open(cfg.DataDir)
	if err != nil {
		log.Fatalf("Error abriendo la base de datos: %v", err)
	}
	defer st.Close()

	// Semilla de precios desde config (placeholders hasta que el operador los complete).
	rules := make([]store.PriceRule, 0, len(cfg.Pricing.Models))
	for _, m := range cfg.Pricing.Models {
		rules = append(rules, store.PriceRule{
			Provider:      m.Provider,
			Model:         m.Model,
			InputPerMTok:  m.InputPerMTok,
			OutputPerMTok: m.OutputPerMTok,
			Margin:        m.Margin,
		})
	}
	if err := st.SeedPricing(rules); err != nil {
		log.Fatalf("Error sembrando precios: %v", err)
	}

	webFS, err := fs.Sub(webFiles, "web")
	if err != nil {
		log.Fatal(err)
	}
	handler := httpapi.New(st, cfg, version).Router(webFS)

	url := fmt.Sprintf("http://localhost:%d", cfg.Port)
	fmt.Println("┌────────────────────────────────────────────────┐")
	fmt.Println("│       OnStudio — Generador de sitios (IA)       │")
	fmt.Println("├────────────────────────────────────────────────┤")
	fmt.Printf("│  Interfaz:  %-34s │\n", url)
	if lan := lanIP(); lan != "" {
		fmt.Printf("│  En la red: %-34s │\n", fmt.Sprintf("http://%s:%d", lan, cfg.Port))
	}
	fmt.Printf("│  Datos:     %-34s │\n", truncatePath(cfg.DataDir, 34))
	fmt.Printf("│  Config:    %-34s │\n", truncatePath(source, 34))
	fmt.Printf("│  Motor:     %-34s │\n", "OpenCode (Phase 2 — pendiente)")
	fmt.Println("│  Para apagar el sistema cierre esta ventana.    │")
	fmt.Println("└────────────────────────────────────────────────┘")

	server := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
	}
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Error del servidor: %v", err)
	}
}

func lanIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return ""
	}
	for _, a := range addrs {
		if ipnet, ok := a.(*net.IPNet); ok && !ipnet.IP.IsLoopback() && ipnet.IP.To4() != nil {
			return ipnet.IP.String()
		}
	}
	return ""
}

func truncatePath(p string, n int) string {
	if len(p) <= n {
		return p
	}
	return "…" + p[len(p)-n+1:]
}
