// Package store contiene la capa de datos (SQLite) del sistema.
package store

import (
	"database/sql"
	"fmt"
	"math"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

type Store struct {
	db *sql.DB
}

// Open abre (o crea) la base de datos en dataDir/onstock.db y aplica el esquema.
func Open(dataDir string) (*Store, error) {
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return nil, fmt.Errorf("creando carpeta de datos: %w", err)
	}
	dbPath := filepath.Join(dataDir, "onstock.db")
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
	_, err := s.db.Exec(schema)
	if err != nil {
		return fmt.Errorf("aplicando esquema: %w", err)
	}
	return s.seedDefaults()
}

const schema = `
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS categories (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  name   TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS suppliers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  rtn          TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  phone        TEXT NOT NULL DEFAULT '',
  email        TEXT NOT NULL DEFAULT '',
  address      TEXT NOT NULL DEFAULT '',
  notes        TEXT NOT NULL DEFAULT '',
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sku         TEXT NOT NULL UNIQUE,
  barcode     TEXT NOT NULL DEFAULT '',
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  cost        REAL NOT NULL DEFAULT 0,
  price       REAL NOT NULL DEFAULT 0,
  isv_rate    REAL NOT NULL DEFAULT 15,
  stock       REAL NOT NULL DEFAULT 0,
  min_stock   REAL NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  qty        REAL NOT NULL,
  unit_cost  REAL NOT NULL DEFAULT 0,
  reference  TEXT NOT NULL DEFAULT '',
  notes      TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  po_number     TEXT NOT NULL UNIQUE,
  supplier_id   INTEGER NOT NULL REFERENCES suppliers(id),
  status        TEXT NOT NULL DEFAULT 'borrador',
  order_date    TEXT NOT NULL DEFAULT (date('now','localtime')),
  expected_date TEXT NOT NULL DEFAULT '',
  received_date TEXT NOT NULL DEFAULT '',
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  po_id      INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty        REAL NOT NULL DEFAULT 1,
  unit_cost  REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_number    TEXT NOT NULL UNIQUE,
  customer_name  TEXT NOT NULL DEFAULT '',
  customer_rtn   TEXT NOT NULL DEFAULT '',
  sale_date      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  subtotal       REAL NOT NULL DEFAULT 0,
  discount       REAL NOT NULL DEFAULT 0,
  discount_net   REAL NOT NULL DEFAULT 0,
  isv            REAL NOT NULL DEFAULT 0,
  total          REAL NOT NULL DEFAULT 0,
  cost_total     REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'efectivo',
  status         TEXT NOT NULL DEFAULT 'completada',
  notes          TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS sale_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id    INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty        REAL NOT NULL,
  unit_price REAL NOT NULL,
  unit_cost  REAL NOT NULL,
  isv_rate   REAL NOT NULL DEFAULT 15
);

CREATE TABLE IF NOT EXISTS expenses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_date TEXT NOT NULL DEFAULT (date('now','localtime')),
  category     TEXT NOT NULL DEFAULT 'administrativos',
  description  TEXT NOT NULL,
  amount       REAL NOT NULL DEFAULT 0,
  supplier_id  INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_sales_date          ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale     ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_movements_product   ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_date      ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_date       ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_po_items_po         ON purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier   ON products(supplier_id);
`

func (s *Store) seedDefaults() error {
	defaults := map[string]string{
		"company_name":         "Mi Empresa",
		"company_rtn":          "",
		"company_address":      "",
		"company_phone":        "",
		"currency_symbol":      "L",
		"isv_rate_default":     "15",
		"isr_rate":             "25",
		"prices_include_isv":   "1",
		"allow_negative_stock": "0",
	}
	for k, v := range defaults {
		if _, err := s.db.Exec(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO NOTHING`, k, v); err != nil {
			return err
		}
	}
	var n int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM categories`).Scan(&n); err != nil {
		return err
	}
	if n == 0 {
		_, err := s.db.Exec(`INSERT INTO categories(name,prefix) VALUES ('General','GEN')`)
		return err
	}
	return nil
}

// ── Settings ────────────────────────────────────────────

func (s *Store) GetSettings() (map[string]string, error) {
	rows, err := s.db.Query(`SELECT key, value FROM settings`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]string{}
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		out[k] = v
	}
	return out, rows.Err()
}

func (s *Store) SetSettings(values map[string]string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for k, v := range values {
		if _, err := tx.Exec(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, k, v); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (s *Store) settingFloat(key string, fallback float64) float64 {
	var v string
	if err := s.db.QueryRow(`SELECT value FROM settings WHERE key=?`, key).Scan(&v); err != nil {
		return fallback
	}
	var f float64
	if _, err := fmt.Sscanf(v, "%g", &f); err != nil {
		return fallback
	}
	return f
}

func (s *Store) settingBool(key string) bool {
	var v string
	_ = s.db.QueryRow(`SELECT value FROM settings WHERE key=?`, key).Scan(&v)
	return v == "1" || v == "true"
}

func round2(v float64) float64 { return math.Round(v*100) / 100 }
