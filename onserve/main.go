// OnServe — Sistema de operación de restaurante (Honduras).
// Un solo ejecutable: servidor HTTP + base de datos SQLite local + interfaz web embebida.
// Línea Micro-Empresa de ONDIGITAL. Contrasta con OnStock (inventario) y OnDental (clínica):
// aquí el centro es el salón, la comanda y la cocina en tiempo real.
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

	"onserve/internal/httpapi"
	"onserve/internal/store"
)

//go:embed web
var webFiles embed.FS

func main() {
	defaultData := filepath.Join(defaultBaseDir(), "data")
	var (
		port          = flag.Int("port", 8090, "puerto del servidor")
		host          = flag.String("host", "127.0.0.1", "interfaz de escucha (127.0.0.1 local; 0.0.0.0 red local)")
		dataDir       = flag.String("data", defaultData, "carpeta donde se guarda la base de datos")
		noOpen        = flag.Bool("no-open", false, "no abrir el navegador automáticamente")
		seedDemo      = flag.Bool("seed-demo", false, "cargar datos demostrativos y salir")
		seedDemoForce = flag.Bool("seed-demo-force", false, "reemplazar datos con el set demostrativo y salir")
	)
	flag.Parse()

	st, err := store.Open(*dataDir)
	if err != nil {
		log.Fatalf("Error abriendo la base de datos: %v", err)
	}
	defer st.Close()

	if *seedDemo || *seedDemoForce {
		rep, err := st.SeedDemo(*seedDemoForce)
		if err != nil {
			log.Fatalf("Seed demo: %v", err)
		}
		fmt.Println("┌────────────────────────────────────────────────┐")
		fmt.Println("│     OnServe — datos demostrativos listos       │")
		fmt.Println("├────────────────────────────────────────────────┤")
		fmt.Printf("│  Zonas:       %-32d │\n", rep.Zones)
		fmt.Printf("│  Mesas:       %-32d │\n", rep.Tables)
		fmt.Printf("│  Platillos:   %-32d │\n", rep.MenuItems)
		fmt.Printf("│  Comandas:    %d pagadas / %d abiertas         │\n", rep.PaidOrders, rep.OpenOrders)
		fmt.Printf("│  Facturas:    %-32d │\n", rep.Invoices)
		fmt.Println("│  Empresa: Café Valle HN (demo)                  │")
		fmt.Println("└────────────────────────────────────────────────┘")
		fmt.Println("Siguiente: make dev  →  http://localhost:8090")
		return
	}

	webFS, err := fs.Sub(webFiles, "web")
	if err != nil {
		log.Fatal(err)
	}
	handler := httpapi.New(st).Router(webFS)

	addr := fmt.Sprintf("%s:%d", *host, *port)
	url := fmt.Sprintf("http://localhost:%d", *port)

	fmt.Println("┌────────────────────────────────────────────────┐")
	fmt.Println("│         OnServe — Operación de restaurante      │")
	fmt.Println("├────────────────────────────────────────────────┤")
	fmt.Printf("│  Interfaz:  %-34s │\n", url)
	if *host != "127.0.0.1" && *host != "localhost" {
		if lan := lanIP(); lan != "" {
			fmt.Printf("│  En la red: http://%s:%d%*s│\n", lan, *port, 27-len(lan)-len(fmt.Sprint(*port)), " ")
		}
	}
	fmt.Printf("│  Datos:     %-34s │\n", truncatePath(*dataDir, 34))
	fmt.Println("│  Para apagar el sistema cierre esta ventana.   │")
	fmt.Println("└────────────────────────────────────────────────┘")

	// En Windows (PC del restaurante) abrimos el navegador automáticamente.
	if !*noOpen && runtime.GOOS == "windows" {
		go func() {
			time.Sleep(600 * time.Millisecond)
			_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
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
