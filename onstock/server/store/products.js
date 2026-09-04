// Traducción de internal/store/products.go.
import { ErrNotFound, BizError, isUniqueViolation } from '../db.js';

const productCols = `
  p.id, p.sku, p.barcode, p.name, p.description, p.category_id,
  COALESCE(c.name,'') AS category_name, p.supplier_id, COALESCE(s.name,'') AS supplier_name,
  p.cost, p.price, p.isv_rate, p.stock, p.min_stock, p.active,
  p.created_at, p.updated_at`;

const productJoins = `
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN suppliers s ON s.id = p.supplier_id`;

// El orden de las claves es el de la struct Product de models.go: el JSON que
// sale por la API tiene que ser byte a byte el mismo que emitía Go.
function scanProduct(row) {
  return {
    id: row.id,
    sku: row.sku,
    barcode: row.barcode,
    name: row.name,
    description: row.description,
    category_id: row.category_id,
    category_name: row.category_name,
    supplier_id: row.supplier_id,
    supplier_name: row.supplier_name,
    cost: row.cost,
    price: row.price,
    isv_rate: row.isv_rate,
    stock: row.stock,
    min_stock: row.min_stock,
    active: row.active === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function listProducts(db, f = {}) {
  const where = ['1=1'];
  const args = [];
  if (!f.inactive) where.push('p.active=1');
  if (f.query) {
    const q = `%${f.query}%`;
    where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.description LIKE ?)');
    args.push(q, q, q, q);
  }
  if (f.categoryID > 0) {
    where.push('p.category_id=?');
    args.push(f.categoryID);
  }
  if (f.supplierID > 0) {
    where.push('p.supplier_id=?');
    args.push(f.supplierID);
  }
  if (f.lowStock) where.push('p.stock <= p.min_stock');
  const rows = db.all(
    `SELECT ${productCols}${productJoins} WHERE ${where.join(' AND ')} ORDER BY p.name`,
    ...args,
  );
  return rows.map(scanProduct);
}

export function getProduct(db, id) {
  const row = db.get(`SELECT ${productCols}${productJoins} WHERE p.id=?`, id);
  if (!row) throw new ErrNotFound();
  return scanProduct(row);
}

// findProductByCode busca por código de barras o SKU exacto (para el escáner del POS).
export function findProductByCode(db, code) {
  const row = db.get(
    `SELECT ${productCols}${productJoins} WHERE p.active=1 AND (p.barcode=? OR p.sku=?) LIMIT 1`,
    code, code,
  );
  if (!row) throw new ErrNotFound();
  return scanProduct(row);
}

export function createProduct(db, p) {
  if (!String(p.name ?? '').trim()) throw new BizError('el nombre es obligatorio');
  let sku = String(p.sku ?? '').trim();
  if (!sku) sku = nextSKU(db, p.category_id ?? null);
  let id;
  try {
    const res = db.run(
      `INSERT INTO products
	  (sku, barcode, name, description, category_id, supplier_id, cost, price, isv_rate, stock, min_stock, active)
	  VALUES (?,?,?,?,?,?,?,?,?,?,?,1)`,
      sku, String(p.barcode ?? '').trim(), String(p.name).trim(), p.description ?? '',
      p.category_id ?? null, p.supplier_id ?? null,
      p.cost ?? 0, p.price ?? 0, p.isv_rate ?? 0, p.stock ?? 0, p.min_stock ?? 0,
    );
    id = res.lastInsertRowid;
  } catch (err) {
    if (isUniqueViolation(err)) throw new BizError(`ya existe un producto con el SKU "${sku}"`);
    throw err;
  }
  if ((p.stock ?? 0) !== 0) {
    db.run(
      `INSERT INTO stock_movements (product_id, type, qty, unit_cost, reference, notes)
		  VALUES (?,?,?,?,?,?)`,
      id, 'entrada', p.stock, p.cost ?? 0, 'Inventario inicial', '',
    );
  }
  return getProduct(db, id);
}

export function updateProduct(db, id, p) {
  if (!String(p.name ?? '').trim()) throw new BizError('el nombre es obligatorio');
  let res;
  try {
    // El stock NO se edita aquí: se ajusta con movimientos de inventario.
    res = db.run(
      `UPDATE products SET
	  sku=?, barcode=?, name=?, description=?, category_id=?, supplier_id=?,
	  cost=?, price=?, isv_rate=?, min_stock=?, active=?, updated_at=datetime('now','localtime')
	  WHERE id=?`,
      String(p.sku ?? '').trim(), String(p.barcode ?? '').trim(), String(p.name).trim(), p.description ?? '',
      p.category_id ?? null, p.supplier_id ?? null,
      p.cost ?? 0, p.price ?? 0, p.isv_rate ?? 0, p.min_stock ?? 0, p.active ? 1 : 0, id,
    );
  } catch (err) {
    if (isUniqueViolation(err)) throw new BizError(`ya existe un producto con el SKU "${String(p.sku ?? '').trim()}"`);
    throw err;
  }
  if (res.changes === 0) throw new ErrNotFound();
  return getProduct(db, id);
}

// deleteProduct desactiva el producto si tiene historial; lo elimina si no lo tiene.
// deleteProduct borra el producto solo si no tiene NADA detrás. En cuanto tiene
// historial —una venta, una compra o un movimiento de inventario— se desactiva.
//
// Antes el kardex no contaba: un producto sin ventas ni órdenes se borraba junto
// con todos sus movimientos (`DELETE FROM stock_movements`). Bastaba con haberle
// cargado una entrada y contado sus existencias para que ese historial —y las
// existencias que declaraba— desaparecieran sin avisar. El movimiento de
// inventario es un asiento: se conserva igual que una venta.
//
// Devuelve 'desactivado' o 'eliminado' para que quien llame pueda decir cuál de
// las dos cosas pasó.
export function deleteProduct(db, id) {
  const existe = db.scalar('SELECT COUNT(*) FROM products WHERE id=?', id);
  if (!existe) throw new ErrNotFound();
  const refs = db.scalar(
    `SELECT
	  (SELECT COUNT(*) FROM sale_items WHERE product_id=?) +
	  (SELECT COUNT(*) FROM purchase_order_items WHERE product_id=?) +
	  (SELECT COUNT(*) FROM stock_movements WHERE product_id=?)`,
    id, id, id,
  );
  if (refs > 0) {
    db.run("UPDATE products SET active=0, updated_at=datetime('now','localtime') WHERE id=?", id);
    return 'desactivado';
  }
  db.run('DELETE FROM products WHERE id=?', id);
  return 'eliminado';
}

// nextSKU genera el siguiente SKU secuencial usando el prefijo de la categoría (p. ej. GEN-0007).
export function nextSKU(db, categoryID) {
  let prefix = 'PRD';
  if (categoryID !== null && categoryID !== undefined) {
    const p = db.scalar('SELECT prefix FROM categories WHERE id=?', categoryID);
    if (typeof p === 'string' && p.trim() !== '') prefix = p.trim().toUpperCase();
  }
  const rows = db.all('SELECT sku FROM products WHERE sku LIKE ?', `${prefix}-%`);
  let maxN = 0;
  for (const r of rows) {
    // strconv.Atoi es estricto: solo acepta la cola entera completa.
    const tail = r.sku.startsWith(`${prefix}-`) ? r.sku.slice(prefix.length + 1) : r.sku;
    if (/^[+-]?\d+$/.test(tail)) {
      const n = parseInt(tail, 10);
      if (n > maxN) maxN = n;
    }
  }
  return `${prefix}-${String(maxN + 1).padStart(4, '0')}`;
}

// ── Categorías ──────────────────────────────────────────

export function listCategories(db) {
  return db.all('SELECT id, name, prefix FROM categories ORDER BY name')
    .map((c) => ({ id: c.id, name: c.name, prefix: c.prefix }));
}

export function createCategory(db, c) {
  const name = String(c.name ?? '').trim();
  if (!name) throw new BizError('el nombre es obligatorio');
  let prefix = String(c.prefix ?? '').trim();
  if (!prefix) prefix = firstN(String(c.name).replaceAll(' ', ''), 3).toUpperCase();
  try {
    const res = db.run('INSERT INTO categories(name,prefix) VALUES(?,?)', name, prefix.trim().toUpperCase());
    return { id: res.lastInsertRowid, name, prefix: prefix.trim().toUpperCase() };
  } catch (err) {
    if (isUniqueViolation(err)) throw new BizError(`ya existe la categoría "${c.name}"`);
    throw err;
  }
}

export function updateCategory(db, id, c) {
  db.run(
    'UPDATE categories SET name=?, prefix=? WHERE id=?',
    String(c.name ?? '').trim(), String(c.prefix ?? '').trim().toUpperCase(), id,
  );
}

export function deleteCategory(db, id) {
  db.run('DELETE FROM categories WHERE id=?', id);
}

// firstN corta por runas, no por bytes, igual que la versión de Go.
function firstN(s, n) {
  const r = [...s];
  return r.length <= n ? s : r.slice(0, n).join('');
}
