// Package engine es el adaptador de OnStudio para el motor OpenCode
// (`opencode serve`). Encapsula el ciclo de vida del servidor (proceso hijo
// gestionado o conexión a uno externo) y las llamadas HTTP para crear una sesión,
// enviar un prompt con el modelo elegido y capturar tokens + costo del turno.
//
// El paquete NO importa `store`: devuelve un engine.Usage neutro y el llamador
// (el pipeline de Phase 3) lo mapea a store.Usage. Tampoco ejecuta jobs por su
// cuenta — solo provee la capacidad de generación.
//
// Seguridad: las llaves de proveedor NUNCA viven aquí; OpenCode las resuelve por
// `{env:VAR}` desde el entorno del proceso. En modo gestionado se genera una
// contraseña aleatoria de Basic Auth para que nada más en la máquina hable con el
// hijo en localhost.
package engine

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"onstudio/internal/config"
)

const (
	bootTimeout    = 30 * time.Second // espera máx. a que el hijo quede healthy
	sessionTimeout = 30 * time.Second // POST /session debe ser rápido
	defaultTurnMs  = 300_000          // 5 min si la config no trae timeout
)

// Usage es el uso de un turno, tal como lo reporta OpenCode. Es neutro respecto a
// la BD; el llamador lo convierte a store.Usage.
type Usage struct {
	InputTokens      int64
	OutputTokens     int64
	ReasoningTokens  int64
	CacheReadTokens  int64
	CacheWriteTokens int64
	Cost             float64 // USD reportado por el proveedor; 0 si no reporta
}

// PromptInput describe un turno: a qué sesión, con qué modelo y qué texto.
type PromptInput struct {
	SessionID  string
	ProviderID string
	ModelID    string
	Agent      string // opcional (p.ej. "site-builder")
	Text       string
}

// Result es la salida de un turno: id del mensaje, texto concatenado y uso.
type Result struct {
	MessageID string
	Text      string
	Usage     Usage
}

// Engine habla con un servidor OpenCode. Es seguro para uso concurrente en las
// llamadas HTTP; Start/Stop están protegidos por mutex.
type Engine struct {
	mode    string // "managed" | "external"
	bin     string // binario opencode (PATH o ruta)
	host    string // host para el hijo gestionado
	port    string // puerto para el hijo gestionado
	baseURL string // URL base del servidor (sin slash final)
	timeout time.Duration
	user    string // Basic Auth
	pass    string // Basic Auth (vacío = sin auth)

	hc *http.Client

	mu     sync.Mutex
	proc   *exec.Cmd
	cancel context.CancelFunc
}

// New construye un Engine desde la config (no arranca nada todavía).
func New(cfg config.Engine) *Engine {
	mode := cfg.Mode
	if mode == "" {
		mode = "managed"
	}
	bin := cfg.OpencodeBin
	if bin == "" {
		bin = "opencode"
	}
	base := strings.TrimRight(cfg.OpencodeURL, "/")
	if base == "" {
		base = "http://127.0.0.1:4096"
	}
	host, port := "127.0.0.1", "4096"
	if u, err := url.Parse(base); err == nil {
		if h := u.Hostname(); h != "" {
			host = h
		}
		if p := u.Port(); p != "" {
			port = p
		}
	}
	turn := time.Duration(cfg.TimeoutMs) * time.Millisecond
	if turn <= 0 {
		turn = defaultTurnMs * time.Millisecond
	}

	user := os.Getenv("OPENCODE_SERVER_USERNAME")
	pass := os.Getenv("OPENCODE_SERVER_PASSWORD")
	if mode == "managed" {
		if user == "" {
			user = "opencode"
		}
		if pass == "" {
			pass = randomPass()
		}
	}

	return &Engine{
		mode:    mode,
		bin:     bin,
		host:    host,
		port:    port,
		baseURL: base,
		timeout: turn,
		user:    user,
		pass:    pass,
		// Sin timeout global: cada request usa su propio context con deadline.
		hc: &http.Client{},
	}
}

// BaseURL expone la URL del servidor (útil para logs/diagnóstico).
func (e *Engine) BaseURL() string { return e.baseURL }

// serveArgs son los argumentos de `opencode serve` en modo gestionado.
func (e *Engine) serveArgs() []string {
	return []string{"serve", "--port", e.port, "--hostname", e.host}
}

// Start asegura que haya un servidor OpenCode accesible. En modo gestionado lanza
// el hijo y espera a que quede healthy; en modo externo solo verifica el ping.
func (e *Engine) Start(ctx context.Context) error {
	if e.mode != "managed" {
		hctx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		if err := e.Health(hctx); err != nil {
			return fmt.Errorf("engine: servidor externo no accesible: %w", err)
		}
		return nil
	}

	e.mu.Lock()
	defer e.mu.Unlock()
	if e.proc != nil {
		return nil // ya iniciado
	}
	if strings.TrimSpace(e.bin) == "" {
		return errors.New("engine: opencode_bin vacío")
	}

	procCtx, cancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(procCtx, e.bin, e.serveArgs()...)
	cmd.Env = e.childEnv()
	cmd.Stdout = io.Discard
	cmd.Stderr = io.Discard
	if err := cmd.Start(); err != nil {
		cancel()
		return fmt.Errorf("engine: no se pudo iniciar `%s serve` (¿instalado?): %w", e.bin, err)
	}
	e.proc = cmd
	e.cancel = cancel

	if err := e.waitHealthy(ctx, bootTimeout); err != nil {
		e.stopLocked()
		return err
	}
	return nil
}

// Stop apaga el hijo gestionado (no-op en modo externo o si no se inició).
func (e *Engine) Stop() error {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.stopLocked()
}

func (e *Engine) stopLocked() error {
	if e.proc == nil {
		return nil
	}
	p := e.proc
	e.proc = nil

	if p.Process != nil {
		_ = p.Process.Signal(os.Interrupt) // intento amable
	}
	done := make(chan struct{})
	go func() { _, _ = p.Process.Wait(); close(done) }()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		if e.cancel != nil {
			e.cancel() // fuerza SIGKILL vía context
		}
		<-done
	}
	if e.cancel != nil {
		e.cancel()
		e.cancel = nil
	}
	return nil
}

// Health hace un ping a /doc (el OpenAPI siempre servido). 200 = sano.
func (e *Engine) Health(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, e.baseURL+"/doc", nil)
	if err != nil {
		return err
	}
	e.auth(req)
	resp, err := e.hc.Do(req)
	if err != nil {
		return fmt.Errorf("servidor no accesible en %s: %w", e.baseURL, err)
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("/doc devolvió HTTP %d", resp.StatusCode)
	}
	return nil
}

func (e *Engine) waitHealthy(ctx context.Context, max time.Duration) error {
	deadline := time.Now().Add(max)
	var lastErr error
	for {
		hctx, cancel := context.WithTimeout(ctx, 2*time.Second)
		lastErr = e.Health(hctx)
		cancel()
		if lastErr == nil {
			return nil
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("engine: opencode no quedó healthy en %s: %w", max, lastErr)
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(250 * time.Millisecond):
		}
	}
}

// auth aplica Basic Auth si hay contraseña configurada.
func (e *Engine) auth(req *http.Request) {
	if e.pass != "" {
		req.SetBasicAuth(e.user, e.pass)
	}
}

// childEnv hereda el entorno (incluidas las llaves de proveedor que OpenCode
// resuelve con {env:VAR}) y fuerza las credenciales de Basic Auth del hijo,
// reemplazando cualquier valor previo para que no haya ambigüedad.
func (e *Engine) childEnv() []string {
	base := os.Environ()
	out := make([]string, 0, len(base)+2)
	for _, kv := range base {
		if strings.HasPrefix(kv, "OPENCODE_SERVER_USERNAME=") ||
			strings.HasPrefix(kv, "OPENCODE_SERVER_PASSWORD=") {
			continue
		}
		out = append(out, kv)
	}
	if e.pass != "" {
		out = append(out, "OPENCODE_SERVER_USERNAME="+e.user, "OPENCODE_SERVER_PASSWORD="+e.pass)
	}
	return out
}

func randomPass() string {
	b := make([]byte, 18)
	if _, err := rand.Read(b); err != nil {
		return "onstudio-local-fallback"
	}
	return hex.EncodeToString(b)
}
