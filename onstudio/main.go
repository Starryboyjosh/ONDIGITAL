// OnStudio — Generador de sitios web para empresas asistido por IA (ONDIGITAL).
// Un solo ejecutable: servidor HTTP + SQLite local + UI embebida. El motor de
// generación es OpenCode (multi-proveedor) y se inicia bajo demanda al generar. Las
// llaves de API viven solo en el entorno del servidor, nunca en el navegador ni en commits.
package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os/exec"
	"runtime"
	"time"

	"onstudio/internal/config"
	"onstudio/internal/engine"
	"onstudio/internal/httpapi"
	"onstudio/internal/pipeline"
	"onstudio/internal/store"
	"onstudio/internal/templates"
)

const version = "0.6.0-phase6"

//go:embed web
var webFiles embed.FS

// Plantillas Pro productizadas: viajan embebidas en el binario (single-binary).
//
//go:embed templates
var templateFiles embed.FS

func main() {
	var (
		port       = flag.Int("port", 0, "puerto del servidor (0 = el de config/entorno)")
		dataDir    = flag.String("data", "", "carpeta de datos (vacío = el de config/entorno)")
		configPath = flag.String("config", "config.json", "archivo de configuración")
		noOpen     = flag.Bool("no-open", false, "no abrir el navegador automáticamente")
	)
	flag.Parse()

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

	// Plantillas Pro: se productizan desde el embed. Si una falta o es inválida se
	// degrada al catálogo base sin tumbar el arranque.
	tplFS, err := fs.Sub(templateFiles, "templates")
	if err != nil {
		log.Fatal(err)
	}
	if n, warn := templates.LoadFS(tplFS); warn != nil {
		log.Printf("Plantillas productizadas: %d (con avisos: %v)", n, warn)
	} else {
		log.Printf("Plantillas productizadas: %d", n)
	}

	// Motor de generación (OpenCode) + runner. El motor se inicia de forma perezosa
	// al procesar el primer job; si el binario no está, el job queda en error sin
	// tumbar el servidor.
	eng := engine.New(cfg.Engine)
	defer eng.Stop()
	runner := pipeline.NewRunner(st, eng, cfg)

	api := httpapi.New(st, cfg, version)
	api.SetRunner(runner)
	handler := api.Router(webFS)

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
	fmt.Printf("│  Motor:     %-34s │\n", fmt.Sprintf("OpenCode %s (bajo demanda)", cfg.Engine.Mode))
	fmt.Println("│  Para apagar el sistema cierre esta ventana.    │")
	fmt.Println("└────────────────────────────────────────────────┘")

	server := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
	}
	// Escuchamos primero para no abrir el navegador antes de que el socket exista.
	ln, err := net.Listen("tcp", server.Addr)
	if err != nil {
		log.Fatalf("Error al escuchar en %s: %v", server.Addr, err)
	}
	if !*noOpen {
		go openBrowser(url)
	}
	if err := server.Serve(ln); err != nil {
		log.Fatalf("Error del servidor: %v", err)
	}
}

// openBrowser abre la URL en el navegador por defecto del sistema. Es de mejor
// esfuerzo: si el comando no existe o falla (p. ej. en un servidor headless), se
// ignora el error y el usuario abre manualmente la URL impresa en el banner.
func openBrowser(url string) {
	var cmd string
	var args []string
	switch runtime.GOOS {
	case "windows":
		cmd, args = "rundll32", []string{"url.dll,FileProtocolHandler", url}
	case "darwin":
		cmd, args = "open", []string{url}
	default:
		cmd, args = "xdg-open", []string{url}
	}
	_ = exec.Command(cmd, args...).Start()
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
