// Traducción de internal/store/suppliers.go.
import { ErrNotFound, BizError } from '../db.js';

function scanSupplier(sp) {
  return {
    id: sp.id,
    name: sp.name,
    rtn: sp.rtn,
    contact_name: sp.contact_name,
    phone: sp.phone,
    email: sp.email,
    address: sp.address,
    notes: sp.notes,
    active: sp.active === 1,
    created_at: sp.created_at,
  };
}

export function listSuppliers(db, includeInactive) {
  let q = 'SELECT id, name, rtn, contact_name, phone, email, address, notes, active, created_at FROM suppliers';
  if (!includeInactive) q += ' WHERE active=1';
  q += ' ORDER BY name';
  return db.all(q).map(scanSupplier);
}

export function getSupplier(db, id) {
  const row = db.get(
    `SELECT id, name, rtn, contact_name, phone, email, address, notes, active, created_at
	  FROM suppliers WHERE id=?`, id,
  );
  if (!row) throw new ErrNotFound();
  return scanSupplier(row);
}

export function createSupplier(db, sp) {
  if (!String(sp.name ?? '').trim()) throw new BizError('el nombre es obligatorio');
  const res = db.run(
    `INSERT INTO suppliers (name, rtn, contact_name, phone, email, address, notes, active)
	  VALUES (?,?,?,?,?,?,?,1)`,
    String(sp.name).trim(), sp.rtn ?? '', sp.contact_name ?? '', sp.phone ?? '',
    sp.email ?? '', sp.address ?? '', sp.notes ?? '',
  );
  return getSupplier(db, res.lastInsertRowid);
}

export function updateSupplier(db, id, sp) {
  if (!String(sp.name ?? '').trim()) throw new BizError('el nombre es obligatorio');
  const res = db.run(
    `UPDATE suppliers SET name=?, rtn=?, contact_name=?, phone=?, email=?, address=?, notes=?, active=?
	  WHERE id=?`,
    String(sp.name).trim(), sp.rtn ?? '', sp.contact_name ?? '', sp.phone ?? '',
    sp.email ?? '', sp.address ?? '', sp.notes ?? '', sp.active ? 1 : 0, id,
  );
  if (res.changes === 0) throw new ErrNotFound();
  return getSupplier(db, id);
}

// deleteSupplier desactiva si tiene historial (productos, órdenes o gastos); elimina si no.
export function deleteSupplier(db, id) {
  const refs = db.scalar(
    `SELECT
	  (SELECT COUNT(*) FROM products WHERE supplier_id=?) +
	  (SELECT COUNT(*) FROM purchase_orders WHERE supplier_id=?) +
	  (SELECT COUNT(*) FROM expenses WHERE supplier_id=?)`,
    id, id, id,
  );
  if (refs > 0) {
    db.run('UPDATE suppliers SET active=0 WHERE id=?', id);
    return;
  }
  db.run('DELETE FROM suppliers WHERE id=?', id);
}
