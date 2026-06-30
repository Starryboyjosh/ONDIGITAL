package pipeline

import (
	"archive/zip"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"
)

const (
	maxEmitFiles      = 200
	maxEmitFileBytes  = 2 << 20  // 2 MiB por archivo
	maxEmitTotalBytes = 24 << 20 // 24 MiB por sitio
)

type fileProposal struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

type filesEnvelope struct {
	Files []fileProposal `json:"files"`
}

// Emit toma el texto del modelo, extrae la propuesta de archivos y los escribe de
// forma segura bajo `workspace`. El modelo PROPONE; el adaptador ESCRIBE, con
// validación de rutas (sin path traversal fuera del workspace). Devuelve las rutas
// relativas escritas, ordenadas.
func Emit(modelText, workspace string) ([]string, error) {
	env, err := parseProposal(modelText)
	if err != nil {
		return nil, err
	}
	if len(env.Files) == 0 {
		return nil, errors.New("la respuesta del modelo no contiene archivos")
	}
	if len(env.Files) > maxEmitFiles {
		return nil, fmt.Errorf("demasiados archivos (%d > %d)", len(env.Files), maxEmitFiles)
	}

	// Validar TODAS las rutas y tamaños antes de escribir nada (todo-o-nada).
	type planned struct{ rel, full, content string }
	plan := make([]planned, 0, len(env.Files))
	total := 0
	for _, f := range env.Files {
		if len(f.Content) > maxEmitFileBytes {
			return nil, fmt.Errorf("archivo %q excede %d bytes", f.Path, maxEmitFileBytes)
		}
		total += len(f.Content)
		if total > maxEmitTotalBytes {
			return nil, fmt.Errorf("el sitio excede el total permitido (%d bytes)", maxEmitTotalBytes)
		}
		rel, full, err := safeJoin(workspace, f.Path)
		if err != nil {
			return nil, err
		}
		plan = append(plan, planned{rel, full, f.Content})
	}

	if err := os.MkdirAll(workspace, 0o755); err != nil {
		return nil, fmt.Errorf("creando workspace: %w", err)
	}
	written := make([]string, 0, len(plan))
	for _, p := range plan {
		if err := os.MkdirAll(filepath.Dir(p.full), 0o755); err != nil {
			return nil, fmt.Errorf("creando carpeta para %q: %w", p.rel, err)
		}
		if err := os.WriteFile(p.full, []byte(p.content), 0o644); err != nil {
			return nil, fmt.Errorf("escribiendo %q: %w", p.rel, err)
		}
		written = append(written, p.rel)
	}
	sort.Strings(written)
	return written, nil
}

// parseProposal extrae el objeto {"files":[...]} aunque el modelo lo envuelva en
// prosa o en una valla de código markdown.
func parseProposal(text string) (filesEnvelope, error) {
	s := stripFence(strings.TrimSpace(text))
	var env filesEnvelope
	if err := json.Unmarshal([]byte(s), &env); err == nil && len(env.Files) > 0 {
		return env, nil
	}
	if i := strings.IndexByte(s, '{'); i >= 0 {
		if j := strings.LastIndexByte(s, '}'); j > i {
			if err := json.Unmarshal([]byte(s[i:j+1]), &env); err == nil && len(env.Files) > 0 {
				return env, nil
			}
		}
	}
	return filesEnvelope{}, errors.New(`no se pudo extraer {"files":[...]} de la respuesta del modelo`)
}

// stripFence quita una valla de código markdown (```lang … ```), si la hay.
func stripFence(s string) string {
	if !strings.HasPrefix(s, "```") {
		return s
	}
	s = strings.TrimPrefix(s, "```")
	if nl := strings.IndexByte(s, '\n'); nl >= 0 {
		s = s[nl+1:] // descarta el resto de la línea de apertura (p.ej. "json")
	}
	if end := strings.LastIndex(s, "```"); end >= 0 {
		s = s[:end]
	}
	return strings.TrimSpace(s)
}

// safeJoin valida que `rel` quede ESTRICTAMENTE dentro de `root`: sin rutas
// absolutas, sin `..`, sin byte NUL. Devuelve la ruta relativa limpia (slash) y la
// ruta absoluta en disco.
func safeJoin(root, rel string) (string, string, error) {
	rel = strings.TrimSpace(rel)
	if rel == "" {
		return "", "", errors.New("ruta de archivo vacía")
	}
	if strings.ContainsRune(rel, 0) {
		return "", "", errors.New("ruta de archivo con byte NUL")
	}
	rel = filepath.ToSlash(rel)
	if path.IsAbs(rel) || strings.HasPrefix(rel, "/") {
		return "", "", fmt.Errorf("ruta absoluta no permitida: %q", rel)
	}
	clean := path.Clean(rel)
	if clean == "." || clean == ".." || strings.HasPrefix(clean, "../") {
		return "", "", fmt.Errorf("ruta fuera del workspace: %q", rel)
	}
	full := filepath.Join(root, filepath.FromSlash(clean))

	// Doble verificación por contención real en disco.
	rootAbs, err := filepath.Abs(root)
	if err != nil {
		return "", "", err
	}
	fullAbs, err := filepath.Abs(full)
	if err != nil {
		return "", "", err
	}
	rb, err := filepath.Rel(rootAbs, fullAbs)
	if err != nil || rb == ".." || strings.HasPrefix(rb, ".."+string(filepath.Separator)) {
		return "", "", fmt.Errorf("ruta fuera del workspace: %q", rel)
	}
	return clean, full, nil
}

// ZipDir comprime el contenido de `root` en `w` (rutas relativas a root).
func ZipDir(w io.Writer, root string) error {
	zw := zip.NewWriter(w)
	defer zw.Close()
	rootAbs, err := filepath.Abs(root)
	if err != nil {
		return err
	}
	return filepath.Walk(rootAbs, func(p string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(rootAbs, p)
		if err != nil {
			return err
		}
		f, err := os.Open(p)
		if err != nil {
			return err
		}
		defer f.Close()
		hw, err := zw.Create(filepath.ToSlash(rel))
		if err != nil {
			return err
		}
		_, err = io.Copy(hw, f)
		return err
	})
}
