package store_test

import (
	"os"
	"path/filepath"
	"testing"

	"onstock/internal/store"
)

func TestBackup(t *testing.T) {
	dir := t.TempDir()
	st, err := store.Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	defer st.Close()
	if err := st.EnsureTenantDefaults(); err != nil {
		t.Fatal(err)
	}
	out := filepath.Join(dir, "bak")
	path, err := st.Backup(out)
	if err != nil {
		t.Fatal(err)
	}
	fi, err := os.Stat(path)
	if err != nil || fi.Size() == 0 {
		t.Fatalf("backup file: %v size=%v", err, fi)
	}
}
