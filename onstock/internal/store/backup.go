package store

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"
)

// Backup creates a consistent copy of the SQLite database into destDir.
// destDir is created if needed. Returns the path of the backup file.
func (s *Store) Backup(destDir string) (string, error) {
	if s == nil || s.db == nil {
		return "", fmt.Errorf("store no abierto")
	}
	if err := os.MkdirAll(destDir, 0o755); err != nil {
		return "", err
	}
	// Checkpoint WAL so the main file has recent data.
	if _, err := s.db.Exec(`PRAGMA wal_checkpoint(FULL)`); err != nil {
		return "", fmt.Errorf("checkpoint: %w", err)
	}

	// Discover DB path via a pragma if possible; fallback: settings not store path.
	// We keep path on Store — add field or query.
	src, err := s.dbPath()
	if err != nil {
		return "", err
	}

	stamp := time.Now().Format("20060102-150405")
	dest := filepath.Join(destDir, "onstock-backup-"+stamp+".db")
	if err := copyFile(src, dest); err != nil {
		return "", err
	}
	// Optional: copy -wal/-shm if still present after checkpoint (usually empty).
	return dest, nil
}

func (s *Store) dbPath() (string, error) {
	var p string
	// modernc.org/sqlite: PRAGMA database_list
	rows, err := s.db.Query(`PRAGMA database_list`)
	if err != nil {
		return "", err
	}
	defer rows.Close()
	for rows.Next() {
		var seq int
		var name, file string
		if err := rows.Scan(&seq, &name, &file); err != nil {
			return "", err
		}
		if name == "main" && file != "" {
			p = file
		}
	}
	if p == "" {
		return "", fmt.Errorf("no se pudo resolver la ruta de la base de datos")
	}
	return p, rows.Err()
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return err
	}
	defer out.Close()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}
