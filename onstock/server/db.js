// Capa de acceso a SQLite. Traducción de internal/store/store.go.
//
// Usa node:sqlite de la biblioteca estándar de Node 24: cero dependencias npm.
// El esquema es EL MISMO que aplica el binario de Go, letra por letra, para que
// una base creada por cualquiera de las dos implementaciones abra en la otra.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export class ErrNotFound extends Error {
  constructor(msg = 'no encontrado') {
    super(msg);
    this.name = 'ErrNotFound';
    this.notFound = true;
  }
}

// Error de negocio: se traduce a HTTP 400 con el mensaje tal cual, igual que
// hace writeErr en Go con cualquier error que no sea ErrNotFound.
export class BizError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'BizError';
  }
}

export const SCHEMA = `
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
`;

const DEFAULT_SETTINGS = {
  company_name: 'Mi Empresa',
  company_rtn: '',
  company_address: '',
  company_phone: '',
  currency_symbol: 'L',
  isv_rate_default: '15',
  isr_rate: '25',
  prices_include_isv: '1',
  allow_negative_stock: '0',
  // Tenant / plan comercial (Fase 4)
  tenant_id: '',
  plan: 'starter',
  modules: 'onstock',
  locale: 'es-HN',
  caja_exit_pin: '', // PIN para salir del modo cajero (UI)
};

// round2 replica math.Round(v*100)/100 de Go, que redondea el medio ALEJÁNDOSE
// del cero. Math.round de JavaScript lo hace hacia +infinito, así que -0.005
// daría -0.00 en vez de -0.01 y los montos negativos del estado de resultados
// se separarían del binario de Go.
export function round2(v) {
  const x = v * 100;
  return (x < 0 ? -Math.round(-x) : Math.round(x)) / 100;
}

// bind normaliza los valores que node:sqlite acepta: booleanos y undefined no
// se pueden enlazar directamente.
function bind(args) {
  return args.map((v) => {
    if (v === undefined || v === null) return null;
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v;
  });
}

export class Database {
  constructor(dbPath) {
    this.path = dbPath;
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA foreign_keys = ON');
    this.db.exec('PRAGMA busy_timeout = 5000');
    this._depth = 0;
  }

  close() {
    this.db.close();
  }

  exec(sql) {
    this.db.exec(sql);
  }

  // run ejecuta una sentencia de escritura y devuelve {changes, lastInsertRowid}.
  run(sql, ...args) {
    return this.db.prepare(sql).run(...bind(args));
  }

  // get devuelve la primera fila o undefined.
  get(sql, ...args) {
    return this.db.prepare(sql).get(...bind(args));
  }

  // all devuelve todas las filas.
  all(sql, ...args) {
    return this.db.prepare(sql).all(...bind(args));
  }

  // scalar devuelve el primer valor de la primera fila.
  scalar(sql, ...args) {
    const row = this.get(sql, ...args);
    if (!row) return undefined;
    return Object.values(row)[0];
  }

  // transaction envuelve fn en BEGIN/COMMIT y hace ROLLBACK ante cualquier
  // excepción, que es lo que consigue el `defer tx.Rollback()` del original.
  // Anida sin abrir una segunda transacción (SQLite no lo permite).
  transaction(fn) {
    if (this._depth > 0) return fn();
    this.db.exec('BEGIN');
    this._depth = 1;
    try {
      const out = fn();
      this.db.exec('COMMIT');
      return out;
    } catch (err) {
      try {
        this.db.exec('ROLLBACK');
      } catch { /* la transacción ya había terminado */ }
      throw err;
    } finally {
      this._depth = 0;
    }
  }

  // ── Settings ────────────────────────────────────────────

  getSettings() {
    const out = {};
    for (const r of this.all('SELECT key, value FROM settings')) out[r.key] = r.value;
    return out;
  }

  setSettings(values) {
    this.transaction(() => {
      for (const [k, v] of Object.entries(values)) {
        this.run(
          'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
          k, String(v),
        );
      }
    });
  }

  settingFloat(key, fallback) {
    const v = this.scalar('SELECT value FROM settings WHERE key=?', key);
    if (v === undefined || v === null) return fallback;
    const f = parseFloat(v);
    return Number.isNaN(f) ? fallback : f;
  }

  settingBool(key) {
    const v = this.scalar('SELECT value FROM settings WHERE key=?', key);
    return v === '1' || v === 'true';
  }

  settingString(key, fallback) {
    const v = this.scalar('SELECT value FROM settings WHERE key=?', key);
    if (v === undefined || v === null || v === '') return fallback;
    return v;
  }

  seedDefaults() {
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
      this.run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO NOTHING', k, v);
    }
    const n = this.scalar('SELECT COUNT(*) FROM categories');
    if (n === 0) {
      this.run("INSERT INTO categories(name,prefix) VALUES ('General','GEN')");
    }
  }
}

// open abre (o crea) dataDir/onstock.db y aplica el esquema.
export function open(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o755 });
  const dbPath = path.join(dataDir, 'onstock.db');
  const db = new Database(dbPath);
  db.exec(SCHEMA);
  db.seedDefaults();
  return db;
}

// isUniqueViolation reconoce el choque de UNIQUE con el que products.go y
// categories arman su mensaje en español.
export function isUniqueViolation(err) {
  return String(err && err.message).includes('UNIQUE');
}

// fmtG imita el verbo %g de Go para los mensajes de stock: 3 → "3", 2.5 → "2.5".
export function fmtG(v) {
  return String(v);
}
