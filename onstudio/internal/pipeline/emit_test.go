package pipeline

import (
	"archive/zip"
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestEmitWritesFiles(t *testing.T) {
	ws := t.TempDir()
	text := `{"files":[{"path":"index.html","content":"<h1>Hola</h1>"},{"path":"css/app.css","content":"body{}"}]}`
	written, err := Emit(text, ws)
	if err != nil {
		t.Fatalf("Emit: %v", err)
	}
	if len(written) != 2 || written[0] != "css/app.css" || written[1] != "index.html" {
		t.Fatalf("written = %v, want sorted [css/app.css index.html]", written)
	}
	if b, _ := os.ReadFile(filepath.Join(ws, "index.html")); string(b) != "<h1>Hola</h1>" {
		t.Errorf("index.html content = %q", b)
	}
	if b, _ := os.ReadFile(filepath.Join(ws, "css", "app.css")); string(b) != "body{}" {
		t.Errorf("css content = %q", b)
	}
}

func TestEmitStripsCodeFence(t *testing.T) {
	ws := t.TempDir()
	text := "```json\n{\"files\":[{\"path\":\"index.html\",\"content\":\"ok\"}]}\n```"
	if _, err := Emit(text, ws); err != nil {
		t.Fatalf("Emit with fence: %v", err)
	}
	if b, _ := os.ReadFile(filepath.Join(ws, "index.html")); string(b) != "ok" {
		t.Errorf("content = %q", b)
	}
}

func TestEmitExtractsFromProse(t *testing.T) {
	ws := t.TempDir()
	text := `Claro, aquí tienes el sitio: {"files":[{"path":"index.html","content":"ok"}]} ¡listo!`
	if _, err := Emit(text, ws); err != nil {
		t.Fatalf("Emit from prose: %v", err)
	}
}

func TestEmitRejectsTraversal(t *testing.T) {
	parent := t.TempDir()
	ws := filepath.Join(parent, "job")
	text := `{"files":[{"path":"../escape.txt","content":"x"}]}`
	if _, err := Emit(text, ws); err == nil {
		t.Fatal("expected traversal to be rejected")
	}
	if _, err := os.Stat(filepath.Join(parent, "escape.txt")); !os.IsNotExist(err) {
		t.Fatal("traversal file was written outside workspace")
	}
}

func TestEmitRejectsAbsolutePath(t *testing.T) {
	ws := t.TempDir()
	text := `{"files":[{"path":"/etc/pwned","content":"x"}]}`
	if _, err := Emit(text, ws); err == nil {
		t.Fatal("expected absolute path to be rejected")
	}
}

func TestEmitRejectsNoFiles(t *testing.T) {
	ws := t.TempDir()
	if _, err := Emit("lo siento, no puedo ayudar con eso", ws); err == nil {
		t.Fatal("expected error when no files JSON present")
	}
}

func TestEmitAtomicOnBadPath(t *testing.T) {
	ws := t.TempDir()
	// El primer archivo es válido, el segundo escapa: NADA debe escribirse.
	text := `{"files":[{"path":"index.html","content":"ok"},{"path":"../evil","content":"x"}]}`
	if _, err := Emit(text, ws); err == nil {
		t.Fatal("expected rejection")
	}
	if _, err := os.Stat(filepath.Join(ws, "index.html")); !os.IsNotExist(err) {
		t.Fatal("partial write: index.html should not exist after rejection")
	}
}

func TestSafeJoin(t *testing.T) {
	root := t.TempDir()
	cases := []struct {
		rel string
		ok  bool
	}{
		{"index.html", true},
		{"css/app.css", true},
		{"a/b/c.txt", true},
		{"./index.html", true},
		{"../escape", false},
		{"a/../../escape", false},
		{"/abs", false},
		{"", false},
	}
	for _, c := range cases {
		_, _, err := safeJoin(root, c.rel)
		if (err == nil) != c.ok {
			t.Errorf("safeJoin(%q): err=%v, want ok=%v", c.rel, err, c.ok)
		}
	}
}

func TestZipDir(t *testing.T) {
	ws := t.TempDir()
	if _, err := Emit(`{"files":[{"path":"index.html","content":"A"},{"path":"sub/b.txt","content":"B"}]}`, ws); err != nil {
		t.Fatal(err)
	}
	var buf bytes.Buffer
	if err := ZipDir(&buf, ws); err != nil {
		t.Fatalf("ZipDir: %v", err)
	}
	zr, err := zip.NewReader(bytes.NewReader(buf.Bytes()), int64(buf.Len()))
	if err != nil {
		t.Fatal(err)
	}
	found := map[string]bool{}
	for _, f := range zr.File {
		found[f.Name] = true
	}
	if !found["index.html"] || !found["sub/b.txt"] {
		t.Errorf("zip entries = %v, want index.html + sub/b.txt", found)
	}
	if strings.Contains(buf.String(), "\\") {
		t.Error("zip should use forward slashes")
	}
}
