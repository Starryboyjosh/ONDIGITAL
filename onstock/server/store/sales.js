// Traducción de internal/store/sales.go.
//
// La aritmética va al pie de la letra: mismo orden de operaciones, mismos
// puntos de redondeo, mismo reparto del descuento. Cualquier diferencia con el
// binario de Go aquí sería un error de traducción, no una mejora.
import { ErrNotFound, BizError, round2, fmtG } from '../db.js';

function scanSale(v) {
  return {
    id: v.id,
    sale_number: v.sale_number,
    customer_name: v.customer_name,
    customer_rtn: v.customer_rtn,
    sale_date: v.sale_date,
    subtotal: v.subtotal,
    discount: v.discount,
    discount_net: v.discount_net,
    isv: v.isv,
    total: v.total,
    cost_total: v.cost_total,
    payment_method: v.payment_method,
    status: v.status,
    notes: v.notes,
    created_at: v.created_at,
  };
}

export function listSales(db, f = {}) {
  const where = ['1=1'];
  const args = [];
  if (f.query) {
    const q = `%${f.query}%`;
    where.push('(sale_number LIKE ? OR customer_name LIKE ? OR customer_rtn LIKE ?)');
    args.push(q, q, q);
  }
  if (f.from) {
    where.push('date(sale_date) >= ?');
    args.push(f.from);
  }
  if (f.to) {
    where.push('date(sale_date) <= ?');
    args.push(f.to);
  }
  if (f.status) {
    where.push('status=?');
    args.push(f.status);
  }
  let limit = f.limit;
  if (!limit || limit <= 0) limit = 500;
  args.push(limit);
  const rows = db.all(
    `SELECT id, sale_number, customer_name, customer_rtn, sale_date, subtotal,
	  discount, discount_net, isv, total, cost_total, payment_method, status, notes, created_at
	  FROM sales WHERE ${where.join(' AND ')}
	  ORDER BY sale_date DESC, id DESC LIMIT ?`,
    ...args,
  );
  return rows.map(scanSale);
}

export function getSale(db, id) {
  const row = db.get(
    `SELECT id, sale_number, customer_name, customer_rtn, sale_date, subtotal,
	  discount, discount_net, isv, total, cost_total, payment_method, status, notes, created_at FROM sales WHERE id=?`,
    id,
  );
  if (!row) throw new ErrNotFound();
  const v = scanSale(row);
  delete v.created_at; // se vuelve a poner al final: en la struct va detrás de Items.
  const items = db.all(
    `SELECT i.id, i.product_id, p.name AS product_name, p.sku AS product_sku, i.qty, i.unit_price, i.unit_cost, i.isv_rate
	  FROM sale_items i JOIN products p ON p.id = i.product_id WHERE i.sale_id=? ORDER BY i.id`,
    id,
  );
  // `items,omitempty`: una venta sin líneas no lleva la clave en el JSON.
  if (items.length > 0) {
    v.items = items.map((it) => ({
      id: it.id,
      product_id: it.product_id,
      product_name: it.product_name,
      product_sku: it.product_sku,
      qty: it.qty,
      unit_price: it.unit_price,
      unit_cost: it.unit_cost,
      isv_rate: it.isv_rate,
    }));
  }
  v.created_at = row.created_at;
  return v;
}

// createSale registra una venta completa: calcula ISV, descuenta stock y guarda el costo (COGS).
export function createSale(db, input) {
  const items = input.items ?? [];
  if (items.length === 0) throw new BizError('la venta no tiene productos');
  const pricesIncludeISV = db.settingBool('prices_include_isv');
  const allowNegative = db.settingBool('allow_negative_stock');

  let saleID;
  db.transaction(() => {
    const lines = [];
    let grossTotal = 0;
    let netSum = 0;
    let costTotal = 0;

    for (const it of items) {
      if (!(it.qty > 0)) throw new BizError('las cantidades deben ser mayores que cero');
      const row = db.get('SELECT name, price, cost, isv_rate, stock, active FROM products WHERE id=?', it.product_id);
      if (!row) throw new BizError(`producto ${it.product_id} no existe`);
      const { name, price, cost, isv_rate: isvRate, stock, active } = row;
      if (active !== 1) throw new BizError(`el producto "${name}" está inactivo`);
      if (!allowNegative && stock < it.qty) {
        throw new BizError(`stock insuficiente de "${name}" (disponible: ${fmtG(stock)})`);
      }
      let unit = price;
      if (it.unit_price !== null && it.unit_price !== undefined) unit = it.unit_price;
      if (unit < 0) throw new BizError('precio inválido');
      let netUnit;
      let grossUnit;
      if (pricesIncludeISV) {
        grossUnit = unit;
        netUnit = unit / (1 + isvRate / 100);
      } else {
        netUnit = unit;
        grossUnit = unit * (1 + isvRate / 100);
      }
      const l = {
        productID: it.product_id,
        name,
        qty: it.qty,
        netUnit,
        net: netUnit * it.qty,
        gross: grossUnit * it.qty,
        isvRate,
        unitCost: cost,
      };
      lines.push(l);
      grossTotal += l.gross;
      netSum += l.net;
      costTotal += cost * it.qty;
    }

    let discount = input.discount ?? 0;
    if (discount < 0) discount = 0;
    if (discount > grossTotal) discount = grossTotal;
    let factor = 1.0;
    if (grossTotal > 0) factor = (grossTotal - discount) / grossTotal;
    const netTotal = round2(netSum * factor);
    const total = round2(grossTotal - discount);
    const isvTotal = round2(total - netTotal);
    const discountNet = round2(netSum - netSum * factor);

    const nextID = db.scalar('SELECT COALESCE(MAX(id),0)+1 FROM sales');
    const saleNumber = `V-${String(nextID).padStart(6, '0')}`;

    let payment = input.payment_method ?? '';
    if (payment === '') payment = 'efectivo';

    const res = db.run(
      `INSERT INTO sales
	  (sale_number, customer_name, customer_rtn, subtotal, discount, discount_net, isv, total, cost_total, payment_method, notes)
	  VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      saleNumber, String(input.customer_name ?? '').trim(), String(input.customer_rtn ?? '').trim(),
      netTotal, round2(discount), discountNet, isvTotal, total, round2(costTotal), payment, input.notes ?? '',
    );
    saleID = res.lastInsertRowid;

    for (const l of lines) {
      db.run(
        `INSERT INTO sale_items (sale_id, product_id, qty, unit_price, unit_cost, isv_rate)
		  VALUES (?,?,?,?,?,?)`,
        saleID, l.productID, l.qty, round2(l.netUnit), l.unitCost, l.isvRate,
      );
      db.run("UPDATE products SET stock = stock - ?, updated_at=datetime('now','localtime') WHERE id=?", l.qty, l.productID);
      db.run(
        `INSERT INTO stock_movements (product_id, type, qty, unit_cost, reference)
		  VALUES (?,?,?,?,?)`,
        l.productID, 'venta', -l.qty, l.unitCost, saleNumber,
      );
    }
  });
  return getSale(db, saleID);
}

// voidSale anula una venta: repone el stock y la excluye de los reportes.
export function voidSale(db, id) {
  db.transaction(() => {
    const head = db.get('SELECT status, sale_number FROM sales WHERE id=?', id);
    if (!head) throw new ErrNotFound();
    if (head.status === 'anulada') throw new BizError('la venta ya está anulada');

    const items = db.all('SELECT product_id, qty, unit_cost FROM sale_items WHERE sale_id=?', id);
    for (const it of items) {
      db.run("UPDATE products SET stock = stock + ?, updated_at=datetime('now','localtime') WHERE id=?", it.qty, it.product_id);
      db.run(
        `INSERT INTO stock_movements (product_id, type, qty, unit_cost, reference)
		  VALUES (?,?,?,?,?)`,
        it.product_id, 'anulacion', it.qty, it.unit_cost, head.sale_number,
      );
    }
    db.run("UPDATE sales SET status='anulada' WHERE id=?", id);
  });
  return getSale(db, id);
}
