// Traducción de internal/store/inventory.go.
import { ErrNotFound, BizError, round2, fmtG } from '../db.js';
import { getProduct } from './products.js';

export function listMovements(db, f = {}) {
  const where = ['1=1'];
  const args = [];
  if (f.productID > 0) {
    where.push('m.product_id=?');
    args.push(f.productID);
  }
  if (f.type) {
    where.push('m.type=?');
    args.push(f.type);
  }
  if (f.from) {
    where.push('date(m.created_at) >= ?');
    args.push(f.from);
  }
  if (f.to) {
    where.push('date(m.created_at) <= ?');
    args.push(f.to);
  }
  let limit = f.limit;
  if (!limit || limit <= 0) limit = 500;
  args.push(limit);
  // Se ordena por fecha y no por id: el kardex es un libro cronológico y el id
  // solo coincide con la fecha mientras nada se cargue con fecha retroactiva.
  const rows = db.all(
    `SELECT m.id, m.product_id, p.name AS product_name, p.sku AS product_sku, m.type, m.qty, m.unit_cost, m.reference, m.notes, m.created_at
	  FROM stock_movements m JOIN products p ON p.id = m.product_id
	  WHERE ${where.join(' AND ')}
	  ORDER BY m.created_at DESC, m.id DESC LIMIT ?`,
    ...args,
  );
  return rows.map((m) => ({
    id: m.id,
    product_id: m.product_id,
    product_name: m.product_name,
    product_sku: m.product_sku,
    type: m.type,
    qty: m.qty,
    unit_cost: m.unit_cost,
    reference: m.reference,
    notes: m.notes,
    created_at: m.created_at,
  }));
}

// adjustStock registra un movimiento manual de inventario.
//   - tipo "entrada": suma qty al stock (qty > 0)
//   - tipo "salida":  resta qty del stock (qty > 0; merma, daño, uso interno)
//   - tipo "ajuste":  fija el stock al valor contado qty (>= 0); registra la diferencia
export function adjustStock(db, productID, movType, qty, notes) {
  const allowNegative = db.settingBool('allow_negative_stock');

  db.transaction(() => {
    const row = db.get('SELECT stock, cost FROM products WHERE id=?', productID);
    if (!row) throw new ErrNotFound();
    const { stock, cost } = row;

    let delta;
    switch (movType) {
      case 'entrada':
        if (qty <= 0) throw new BizError('la cantidad debe ser mayor que cero');
        delta = qty;
        break;
      case 'salida':
        if (qty <= 0) throw new BizError('la cantidad debe ser mayor que cero');
        if (qty > stock && !allowNegative) {
          throw new BizError(`stock insuficiente: hay ${fmtG(stock)} y quiere sacar ${fmtG(qty)}`);
        }
        delta = -qty;
        break;
      case 'ajuste':
        if (qty < 0) throw new BizError('el stock contado no puede ser negativo');
        delta = qty - stock;
        if (delta === 0) throw new BizError('el stock contado es igual al actual; no hay nada que ajustar');
        break;
      default:
        throw new BizError(`tipo de movimiento inválido: "${movType}"`);
    }

    db.run("UPDATE products SET stock = stock + ?, updated_at=datetime('now','localtime') WHERE id=?", delta, productID);
    db.run(
      `INSERT INTO stock_movements (product_id, type, qty, unit_cost, reference, notes)
	  VALUES (?,?,?,?,?,?)`,
      productID, movType, delta, cost, 'Movimiento manual', notes ?? '',
    );
  });
  return getProduct(db, productID);
}

// inventoryValue devuelve el valor total del inventario activo (stock × costo).
export function inventoryValue(db) {
  return round2(db.scalar('SELECT COALESCE(SUM(stock*cost),0) FROM products WHERE active=1'));
}
