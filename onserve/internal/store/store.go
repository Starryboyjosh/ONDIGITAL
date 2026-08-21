// Package store contiene la capa de datos (SQLite) de OnServe.
// Mismo enfoque que OnStock: un solo escritor, WAL, claves foráneas y
// reglas de negocio transaccionales. Lenguaje del dominio en español.
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

// Open abre (o crea) la base de datos en dataDir/onserve.db y aplica el esquema.
func Open(dataDir string) (*Store, error) {
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return nil, fmt.Errorf("creando carpeta de datos: %w", err)
	}
	dbPath := filepath.Join(dataDir, "onserve.db")
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
	return s.seedDefaults()
}

const schema = `
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Zonas del salón (Odoo: restaurant.floor)
CREATE TABLE IF NOT EXISTS zones (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  sort       INTEGER NOT NULL DEFAULT 0,
  color      TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Mesas (Odoo: restaurant.table). pos_x/pos_y ubican la mesa en el mapa del salón.
CREATE TABLE IF NOT EXISTS dining_tables (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id       INTEGER REFERENCES zones(id) ON DELETE CASCADE,
  name          TEXT NOT NULL UNIQUE,
  seats         INTEGER NOT NULL DEFAULT 4,
  pos_x         REAL NOT NULL DEFAULT 40,
  pos_y         REAL NOT NULL DEFAULT 40,
  shape         TEXT NOT NULL DEFAULT 'square',
  reserved      INTEGER NOT NULL DEFAULT 0,
  reserved_note TEXT NOT NULL DEFAULT '',
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Categorías del menú (Odoo: pos.category). station = a dónde se manda (cocina/barra).
CREATE TABLE IF NOT EXISTS menu_categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  sort       INTEGER NOT NULL DEFAULT 0,
  station    TEXT NOT NULL DEFAULT 'cocina',
  color      TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Platillos del menú. price = precio de menú (con ISV incluido por defecto).
CREATE TABLE IF NOT EXISTS menu_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL DEFAULT '',
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id INTEGER REFERENCES menu_categories(id) ON DELETE SET NULL,
  price       REAL NOT NULL DEFAULT 0,
  isv_rate    REAL NOT NULL DEFAULT 15,
  cost        REAL NOT NULL DEFAULT 0,
  station     TEXT NOT NULL DEFAULT '',
  available   INTEGER NOT NULL DEFAULT 1,
  active      INTEGER NOT NULL DEFAULT 1,
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Sesiones de caja / arqueo (Odoo: pos.session)
CREATE TABLE IF NOT EXISTS register_sessions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  session_number TEXT NOT NULL UNIQUE,
  opened_by      TEXT NOT NULL DEFAULT '',
  opening_cash   REAL NOT NULL DEFAULT 0,
  opened_at      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  closing_cash   REAL NOT NULL DEFAULT 0,
  expected_cash  REAL NOT NULL DEFAULT 0,
  difference     REAL NOT NULL DEFAULT 0,
  closed_at      TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'abierta',
  notes          TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Comandas / cuentas por mesa (Odoo: pos.order). subtotal/isv/total son netos de ISV.
CREATE TABLE IF NOT EXISTS orders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number  TEXT NOT NULL UNIQUE,
  table_id      INTEGER REFERENCES dining_tables(id) ON DELETE SET NULL,
  session_id    INTEGER REFERENCES register_sessions(id) ON DELETE SET NULL,
  type          TEXT NOT NULL DEFAULT 'mesa',
  guests        INTEGER NOT NULL DEFAULT 1,
  waiter        TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'abierta',
  opened_at     TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  closed_at     TEXT NOT NULL DEFAULT '',
  customer_name TEXT NOT NULL DEFAULT '',
  customer_rtn  TEXT NOT NULL DEFAULT '',
  subtotal      REAL NOT NULL DEFAULT 0,
  discount      REAL NOT NULL DEFAULT 0,
  discount_net  REAL NOT NULL DEFAULT 0,
  isv           REAL NOT NULL DEFAULT 0,
  tip           REAL NOT NULL DEFAULT 0,
  total         REAL NOT NULL DEFAULT 0,
  cost_total    REAL NOT NULL DEFAULT 0,
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Líneas de la comanda (Odoo: pos.order.line). name/unit_price son snapshot histórico.
CREATE TABLE IF NOT EXISTS order_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id       INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id   INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  qty            REAL NOT NULL DEFAULT 1,
  unit_price     REAL NOT NULL DEFAULT 0,
  isv_rate       REAL NOT NULL DEFAULT 15,
  unit_cost      REAL NOT NULL DEFAULT 0,
  course         TEXT NOT NULL DEFAULT 'fuerte',
  station        TEXT NOT NULL DEFAULT 'cocina',
  kitchen_status TEXT NOT NULL DEFAULT 'pendiente',
  sent_at        TEXT NOT NULL DEFAULT '',
  ready_at       TEXT NOT NULL DEFAULT '',
  served_at      TEXT NOT NULL DEFAULT '',
  notes          TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Pagos de la cuenta. Varias filas = cuenta dividida. tip = propina (no gravable).
CREATE TABLE IF NOT EXISTS order_payments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method     TEXT NOT NULL DEFAULT 'efectivo',
  amount     REAL NOT NULL DEFAULT 0,
  tip        REAL NOT NULL DEFAULT 0,
  reference  TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Documento fiscal (esquema listo para SAR; emisión XML/CAEE es fase posterior).
CREATE TABLE IF NOT EXISTS invoices (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  doc_type   TEXT NOT NULL DEFAULT 'factura',
  sequence   TEXT NOT NULL UNIQUE,
  cai        TEXT NOT NULL DEFAULT '',
  buyer_name TEXT NOT NULL DEFAULT '',
  buyer_rtn  TEXT NOT NULL DEFAULT '',
  seller_rtn TEXT NOT NULL DEFAULT '',
  subtotal   REAL NOT NULL DEFAULT 0,
  isv        REAL NOT NULL DEFAULT 0,
  exempt     REAL NOT NULL DEFAULT 0,
  total      REAL NOT NULL DEFAULT 0,
  currency   TEXT NOT NULL DEFAULT 'HNL',
  status     TEXT NOT NULL DEFAULT 'emitida',
  issued_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_tables_zone        ON dining_tables(zone_id);
CREATE INDEX IF NOT EXISTS idx_items_category      ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_table        ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_session      ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_opened       ON orders(opened_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_kitchen ON order_items(kitchen_status);
CREATE INDEX IF NOT EXISTS idx_payments_order      ON order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order      ON invoices(order_id);
`

func (s *Store) seedDefaults() error {
	defaults := map[string]string{
		"company_name":       "Mi Restaurante",
		"company_rtn":        "",
		"company_address":    "",
		"company_phone":      "",
		"currency_symbol":    "L",
		"isv_rate_default":   "15",
		"isr_rate":           "25",
		"prices_include_isv": "1",
		"tip_suggest_rate":   "10",
		"cai":               "",
		"cai_range":         "",
		"cai_expires":       "",
		"fiscal_doc_type":   "factura",
	}
	for k, v := range defaults {
		if _, err := s.db.Exec(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO NOTHING`, k, v); err != nil {
			return err
		}
	}
	if err := s.seedFloor(); err != nil {
		return err
	}
	return s.seedMenu()
}

// seedFloor crea un salón inicial con seis mesas para que el sistema sea usable al primer arranque.
func (s *Store) seedFloor() error {
	var n int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM zones`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	res, err := s.db.Exec(`INSERT INTO zones(name, sort, color) VALUES ('Salón Principal', 0, '#d8a24a')`)
	if err != nil {
		return err
	}
	zoneID, _ := res.LastInsertId()
	positions := [][2]float64{{60, 60}, {220, 60}, {380, 60}, {60, 220}, {220, 220}, {380, 220}}
	for i, p := range positions {
		shape := "square"
		seats := 4
		if i%3 == 2 {
			shape, seats = "round", 2
		}
		if _, err := s.db.Exec(`INSERT INTO dining_tables(zone_id, name, seats, pos_x, pos_y, shape)
			VALUES (?,?,?,?,?,?)`, zoneID, fmt.Sprintf("M%d", i+1), seats, p[0], p[1], shape); err != nil {
			return err
		}
	}
	return nil
}

// seedMenu carga un menú de ejemplo (cocina hondureña) en el primer arranque.
func (s *Store) seedMenu() error {
	var n int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM menu_categories`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	cats := []struct {
		name, station string
	}{
		{"Entradas", "cocina"},
		{"Platos Fuertes", "cocina"},
		{"Bebidas", "barra"},
		{"Postres", "cocina"},
	}
	catID := map[string]int64{}
	for i, c := range cats {
		res, err := s.db.Exec(`INSERT INTO menu_categories(name, sort, station) VALUES (?,?,?)`, c.name, i, c.station)
		if err != nil {
			return err
		}
		catID[c.name], _ = res.LastInsertId()
	}
	items := []struct {
		cat, code, name string
		price, cost     float64
	}{
		{"Entradas", "ENT-01", "Baleadas (2)", 70, 22},
		{"Entradas", "ENT-02", "Tajadas con pollo", 95, 34},
		{"Platos Fuertes", "FUE-01", "Plato Típico", 185, 70},
		{"Platos Fuertes", "FUE-02", "Pollo a la plancha", 165, 58},
		{"Platos Fuertes", "FUE-03", "Pinchos de res", 220, 92},
		{"Bebidas", "BEB-01", "Refresco natural", 45, 9},
		{"Bebidas", "BEB-02", "Café", 35, 6},
		{"Bebidas", "BEB-03", "Cerveza nacional", 55, 22},
		{"Postres", "POS-01", "Flan de la casa", 60, 15},
	}
	for i, it := range items {
		station := "cocina"
		if it.cat == "Bebidas" {
			station = "barra"
		}
		if _, err := s.db.Exec(`INSERT INTO menu_items(code, name, category_id, price, cost, isv_rate, station, sort)
			VALUES (?,?,?,?,?,?,?,?)`, it.code, it.name, catID[it.cat], it.price, it.cost, 15.0, station, i); err != nil {
			return err
		}
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
