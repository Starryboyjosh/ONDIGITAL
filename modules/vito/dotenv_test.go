package vito_test

import (
	"os"
	"path/filepath"
	"testing"

	"ondigital.hn/vito"
)

func TestLoadDotEnv(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".env")
	content := "# comment\nVITO_ENABLED=true\nVITO_PROVIDER=mock\nexport OPENCODE_API_KEY=\"abc123\"\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}

	t.Setenv("VITO_ENABLED", "") // clear so load can set — Setenv to empty still "exists"
	// LookupEnv: empty string still exists. Unset for a clean test.
	_ = os.Unsetenv("VITO_ENABLED")
	_ = os.Unsetenv("VITO_PROVIDER")
	_ = os.Unsetenv("OPENCODE_API_KEY")

	if err := vito.LoadDotEnv(path); err != nil {
		t.Fatal(err)
	}
	if os.Getenv("VITO_PROVIDER") != "mock" {
		t.Fatalf("VITO_PROVIDER=%q", os.Getenv("VITO_PROVIDER"))
	}
	if os.Getenv("OPENCODE_API_KEY") != "abc123" {
		t.Fatalf("OPENCODE_API_KEY=%q", os.Getenv("OPENCODE_API_KEY"))
	}

	// Must not override existing
	t.Setenv("VITO_PROVIDER", "opencode")
	if err := vito.LoadDotEnv(path); err != nil {
		t.Fatal(err)
	}
	if os.Getenv("VITO_PROVIDER") != "opencode" {
		t.Fatal("should not override existing env")
	}
}
