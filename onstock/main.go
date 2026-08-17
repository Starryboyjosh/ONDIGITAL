// OnStock — Sistema de inventario, ventas y reportes para tiendas (Honduras).
// Un solo ejecutable: servidor HTTP + base de datos SQLite local + interfaz web embebida.
package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"onstock/internal/httpapi"
	"onstock/internal/store"
	"onstock/internal/vitohost"
)

//go:embed web
var webFiles embed.FS

func main() {
	defaultData := filepath.Join(defaultBaseDir(), "data")
	var (
		port          = flag.Int("port", 8080, "puerto del servidor")
		host          = flag.String("host", "127.0.0.1", "interfaz de escucha (127.0.0.1 local; 0.0.0.0 red local)")
		dataDir       = flag.String("data", defaultData, "carpeta donde se guarda la base de datos")
		noOpen        = flag.Bool("no-open", false, "no abrir el navegador automáticamente")
		cajaOnly      = flag.Bool("caja", false, "modo solo caja: PC del cajero (sin finanzas ni admin)")
		seedDemo      = flag.Bool("seed-demo", false, "cargar datos demostrativos y salir (falla si ya hay productos)")
		seedDemoForce = flag.Bool("seed-demo-force", false, "reemplazar datos con el set demostrativo y salir")
		backupDir     = flag.String("backup", "", "crear respaldo de la BD en este directorio y salir")
	)
	flag.Parse()

	st, err := store.Open(*dataDir)
	if err != nil {
		log.Fatalf("Error abriendo la base de datos: %v", err)
	}
	defer st.Close()

	if err := st.EnsureTenantDefaults(); err != nil {
		log.Printf("tenant: %v", err)
	}

	if *backupDir != "" {
		path, err := st.Backup(*backupDir)
		if err != nil {
			log.Fatalf("Backup: %v", err)
		}
		fmt.Println("Respaldo creado:", path)
		return
	}

	if *seedDemo || *seedDemoForce {
		rep, err := st.SeedDemo(*seedDemoForce)
		if err != nil {
			log.Fatalf("Seed demo: %v", err)
		}
		fmt.Println("┌────────────────────────────────────────────────┐")
		fmt.Println("│     OnStock — datos demostrativos listos       │")
		fmt.Println("├────────────────────────────────────────────────┤")
		fmt.Printf("│  Datos:       %-32s │\n", truncatePath(*dataDir, 32))
		fmt.Printf("│  Categorías:  %-32d │\n", rep.Categories)
		fmt.Printf("│  Proveedores: %-32d │\n", rep.Suppliers)
		fmt.Printf("│  Productos:   %-32d │\n", rep.Products)
		fmt.Printf("│  Ventas:      %-32d │\n", rep.Sales)
		fmt.Printf("│  Gastos:      %-32d │\n", rep.Expenses)
		fmt.Printf("│  Stock bajo:  %-32d │\n", rep.LowStock)
		fmt.Println("│  Empresa: Abarrotes El Progreso (TGU)          │")
		fmt.Println("└────────────────────────────────────────────────┘")
		fmt.Println("Siguiente: make dev  →  http://localhost:8080/#/vito")
		return
	}

	webFS, err := fs.Sub(webFiles, "web")
	if err != nil {
		log.Fatal(err)
	}

	// Vito: solo en modo admin (oficina). En -caja el cajero no ve ni usa Vito.
	base := defaultBaseDir()
	var handler http.Handler
	var openURL string
	addr := fmt.Sprintf("%s:%d", *host, *port)
	baseURL := fmt.Sprintf("http://localhost:%d", *port)

	if *cajaOnly {
		// Proceso del cajero: misma BD, solo API de cobro + caja.html
		handler = httpapi.New(st, nil, nil).RouterWithOpts(webFS, httpapi.RouterOpts{CajaOnly: true})
		openURL = baseURL + "/caja.html"

		fmt.Println("┌────────────────────────────────────────────────┐")
		fmt.Println("│        OnStock — CAJA (solo registradora)      │")
		fmt.Println("├────────────────────────────────────────────────┤")
		fmt.Printf("│  Caja:      %-34s │\n", openURL)
		if *host != "127.0.0.1" && *host != "localhost" {
			if lan := lanIP(); lan != "" {
				fmt.Printf("│  En la red: http://%s:%d/caja.html%*s│\n", lan, *port, 18-len(lan)-len(fmt.Sprint(*port)), " ")
			}
		}
		fmt.Printf("│  Datos:     %-34s │\n", truncatePath(*dataDir, 34))
		fmt.Println("│  Sin finanzas · sin reportes · sin admin       │")
		fmt.Println("│  Para apagar cierre esta ventana.              │")
		fmt.Println("└────────────────────────────────────────────────┘")
	} else {
		vitoHost := vitohost.Bootstrap(base, st)
		vitoSvc := vitoHost.Service
		handler = httpapi.New(st, vitoSvc, vitoHost.Catalog).Router(webFS)
		openURL = baseURL

		vitoLine := "apagado"
		if vitoSvc != nil && vitoSvc.Enabled() {
			vitoLine = "activo"
			if vitoHost.Fallback {
				vitoLine = "activo (local)"
			}
		}

		fmt.Println("┌────────────────────────────────────────────────┐")
		fmt.Println("│     OnStock — Administración (sistema completo)│")
		fmt.Println("├────────────────────────────────────────────────┤")
		fmt.Printf("│  Interfaz:  %-34s │\n", openURL)
		if *host != "127.0.0.1" && *host != "localhost" {
			if lan := lanIP(); lan != "" {
				fmt.Printf("│  En la red: http://%s:%d%*s│\n", lan, *port, 27-len(lan)-len(fmt.Sprint(*port)), " ")
			}
		}
		fmt.Printf("│  Datos:     %-34s │\n", truncatePath(*dataDir, 34))
		fmt.Printf("│  Vito:      %-34s │\n", vitoLine)
		fmt.Println("│  Cajero en otro PC: make caja (o -caja)        │")
		fmt.Println("│  Para apagar el sistema cierre esta ventana.   │")
		fmt.Println("└────────────────────────────────────────────────┘")
	}

	// En Windows (PC de la tienda) abrimos el navegador automáticamente.
	if !*noOpen && runtime.GOOS == "windows" {
		go func() {
			time.Sleep(600 * time.Millisecond)
			_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", openURL).Start()
		}()
	}

	server := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
	}
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Error del servidor: %v", err)
	}
}

// defaultBaseDir: junto al ejecutable (deployment); en `go run` usa el directorio actual.
func defaultBaseDir() string {
	exe, err := os.Executable()
	if err == nil {
		dir := filepath.Dir(exe)
		// go run compila a un directorio temporal; en ese caso usamos el cwd.
		if !isTempDir(dir) {
			return dir
		}
	}
	wd, err := os.Getwd()
	if err != nil {
		return "."
	}
	return wd
}

func isTempDir(dir string) bool {
	tmp := os.TempDir()
	rel, err := filepath.Rel(tmp, dir)
	return err == nil && rel != ".." && !filepath.IsAbs(rel) && len(rel) > 0 && rel[0] != '.'
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
