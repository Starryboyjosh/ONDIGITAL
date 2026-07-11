package httpapi

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"onstock/internal/store"
)

func TestCajaOnlyBlocksAdminAPI(t *testing.T) {
	dir := t.TempDir()
	st, err := store.Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = st.Close() })

	webFS := fstest.MapFS{
		"caja.html":   &fstest.MapFile{Data: []byte("<html>caja</html>")},
		"index.html":  &fstest.MapFile{Data: []byte("<html>admin</html>")},
		"css/app.css": &fstest.MapFile{Data: []byte("body{}")},
	}
	h := New(st, nil, nil).RouterWithOpts(webFS, RouterOpts{CajaOnly: true})
	srv := httptest.NewServer(h)
	t.Cleanup(srv.Close)

	// POS endpoints allowed
	for _, path := range []string{"/api/settings", "/api/products"} {
		res, err := http.Get(srv.URL + path)
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		if res.StatusCode != http.StatusOK {
			t.Errorf("%s: want 200, got %d", path, res.StatusCode)
		}
	}

	// Admin surfaces blocked
	for _, path := range []string{
		"/api/dashboard",
		"/api/reports/income-statement",
		"/api/expenses",
		"/api/sales",
		"/api/vito/status",
		"/api/tenant",
	} {
		res, err := http.Get(srv.URL + path)
		if err != nil {
			t.Fatal(err)
		}
		body, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if res.StatusCode != http.StatusForbidden {
			t.Errorf("%s: want 403, got %d body=%s", path, res.StatusCode, body)
		}
	}

	// Settings must not leak caja_exit_pin
	if err := st.SetSettings(map[string]string{"caja_exit_pin": "9999", "company_name": "Tienda Test"}); err != nil {
		t.Fatal(err)
	}
	res, err := http.Get(srv.URL + "/api/settings")
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if strings.Contains(string(body), "9999") || strings.Contains(string(body), "caja_exit_pin") {
		t.Errorf("settings leaked pin: %s", body)
	}

	// Root redirects to caja.html
	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	res, err = client.Get(srv.URL + "/")
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusFound {
		t.Fatalf("GET / want 302, got %d", res.StatusCode)
	}
	if loc := res.Header.Get("Location"); loc != "/caja.html" {
		t.Errorf("Location = %q, want /caja.html", loc)
	}

	// Static caja page served
	res, err = http.Get(srv.URL + "/caja.html")
	if err != nil {
		t.Fatal(err)
	}
	b, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if res.StatusCode != 200 || !strings.Contains(string(b), "caja") {
		t.Errorf("caja.html: status=%d body=%s", res.StatusCode, b)
	}
}
