// Package store es la capa de datos (SQLite) de OnStudio. Mismo enfoque que
// OnStock/OnServe: un solo escritor, WAL y claves foráneas. Aquí el dominio son
// jobs de generación, sitios producidos, uso de tokens y precios por modelo.
package store

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

type Store struct {
	db *sql.DB
}

// Open abre (o crea) la base de datos en dataDir/onstudio.db y aplica el esquema.
func Open(dataDir string) (*Store, error) {
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return nil, fmt.Errorf("creando carpeta de datos: %w", err)
	}
	dbPath := filepath.Join(dataDir, "onstudio.db")
	dsn := fmt.Sprintf("file:%s?_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)&_pragma=busy_timeout(5000)", dbPath)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	// SQLite con un solo escritor: una conexión evita SQLITE_BUSY.
	db.SetMaxOpenConns(1)
	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		db.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) migrate() error {
	if _, err := s.db.Exec(schema); err != nil {
		return fmt.Errorf("aplicando esquema: %w", err)
	}
	return nil
}

const schema = `
-- Un trabajo de generación = una "compra" facturable por tokens.
CREATE TABLE IF NOT EXISTS jobs (
  id               TEXT PRIMARY KEY,
  created_at       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  status           TEXT NOT NULL DEFAULT 'queued',
  provider         TEXT NOT NULL,
  model            TEXT NOT NULL,
  template_id      TEXT NOT NULL DEFAULT '',
  spec_json        TEXT NOT NULL,
  opencode_session TEXT NOT NULL DEFAULT '',
  error_msg        TEXT NOT NULL DEFAULT ''
);

-- Sitio resultante de un job.
CREATE TABLE IF NOT EXISTS sites (
  id            TEXT PRIMARY KEY,
  job_id        TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL DEFAULT '',
  workspace_dir TEXT NOT NULL DEFAULT '',
  preview_url   TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Uso de tokens y costo por job (base de la factura).
CREATE TABLE IF NOT EXISTS usage (
  id                 TEXT PRIMARY KEY,
  job_id             TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  input_tokens       INTEGER NOT NULL DEFAULT 0,
  output_tokens      INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens  INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  provider_cost      REAL NOT NULL DEFAULT 0,
  price              REAL NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'USD',
  captured_at        TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Precio/margen por modelo (semilla desde config.json; ver token-billing.md).
CREATE TABLE IF NOT EXISTS pricing (
  provider        TEXT NOT NULL,
  model           TEXT NOT NULL,
  input_per_mtok  REAL NOT NULL DEFAULT 0,
  output_per_mtok REAL NOT NULL DEFAULT 0,
  margin          REAL NOT NULL DEFAULT 1.0,
  PRIMARY KEY (provider, model)
);

CREATE INDEX IF NOT EXISTS idx_jobs_status  ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_sites_job    ON sites(job_id);
CREATE INDEX IF NOT EXISTS idx_usage_job    ON usage(job_id);
`

// newID genera un id corto y único (prefijo + 12 bytes hex aleatorios).
func newID(prefix string) string {
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		// crypto/rand no debería fallar; degradamos a un id fijo e improbable.
		return prefix + "000000000000000000000000"
	}
	return prefix + hex.EncodeToString(b)
}
