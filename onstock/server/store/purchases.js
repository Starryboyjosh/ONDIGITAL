// Traducción de internal/store/purchases.go.
import { ErrNotFound, BizError, round2 } from '../db.js';

export function listPurchaseOrders(db, f = {}) {
  const where = ['1=1'];
  const args = [];
  if (f.query) {
    const q = `%${f.query}%`;
    where.push('(o.po_number LIKE ? OR s.name LIKE ?)');
    args.push(q, q);
  }
  if (f.supplierID > 0) {
    where.push('o.supplier_id=?');
    args.push(f.supplierID);
  }
  if (f.status) {
    where.push('o.status=?');
    args.push(f.status);
  }
  if (f.from) {
    where.push('o.order_date >= ?');
    args.push(f.from);
  }
  if (f.to) {
    where.push('o.order_date <= ?');
    args.push(f.to);
  }
  let limit = f.limit;
  if (!limit || limit <= 0) limit = 500;
  args.push(limit);
  const rows = db.all(
    `SELECT o.id, o.po_number, o.supplier_id, s.name AS supplier_name, o.status, o.order_date,
	  o.expected_date, o.received_date, o.notes, o.created_at,
	  COALESCE((SELECT SUM(qty*unit_cost) FROM purchase_order_items WHERE po_id=o.id),0) AS total
	  FROM purchase_orders o JOIN suppliers s ON s.id=o.supplier_id
	  WHERE ${where.join(' AND ')} ORDER BY o.id DESC LIMIT ?`,
    ...args,
  );
  return rows.map((o) => ({
    id: o.id,
    po_number: o.po_number,
    supplier_id: o.supplier_id,
    supplier_name: o.supplier_name,
    status: o.status,
    order_date: o.order_date,
    expected_date: o.expected_date,
    received_date: o.received_date,
    notes: o.notes,
    total: round2(o.total),
    created_at: o.created_at,
  }));
}

export function getPurchaseOrder(db, id) {
  const head = db.get(
    `SELECT o.id, o.po_number, o.supplier_id, s.name AS supplier_name, o.status, o.order_date,
	  o.expected_date, o.received_date, o.notes, o.created_at
	  FROM purchase_orders o JOIN suppliers s ON s.id=o.supplier_id WHERE o.id=?`,
    id,
  );
  if (!head) throw new ErrNotFound();
  const rows = db.all(
    `SELECT i.id, i.product_id, p.name AS product_name, p.sku AS product_sku, i.qty, i.unit_cost
	  FROM purchase_order_items i JOIN products p ON p.id=i.product_id WHERE i.po_id=? ORDER BY i.id`,
    id,
  );
  let total = 0;
  const items = rows.map((it) => {
    total += it.qty * it.unit_cost;
    return {
      id: it.id,
      product_id: it.product_id,
      product_name: it.product_name,
      product_sku: it.product_sku,
      qty: it.qty,
      unit_cost: it.unit_cost,
    };
  });
  const o = {
    id: head.id,
    po_number: head.po_number,
    supplier_id: head.supplier_id,
    supplier_name: head.supplier_name,
    status: head.status,
    order_date: head.order_date,
    expected_date: head.expected_date,
    received_date: head.received_date,
    notes: head.notes,
    total: round2(total),
  };
  if (items.length > 0) o.items = items; // `items,omitempty`
  o.created_at = head.created_at;
  return o;
}

export function createPurchaseOrder(db, input) {
  if (!input.supplier_id) throw new BizError('selecciona un proveedor');
  const items = input.items ?? [];
  if (items.length === 0) throw new BizError('la orden no tiene productos');

  let poID;
  db.transaction(() => {
    const nextID = db.scalar('SELECT COALESCE(MAX(id),0)+1 FROM purchase_orders');
    const poNumber = `OC-${String(nextID).padStart(5, '0')}`;

    const orderDate = input.order_date ?? '';
    let res;
    if (orderDate !== '') {
      res = db.run(
        `INSERT INTO purchase_orders (po_number, supplier_id, order_date, expected_date, notes)
		  VALUES (?,?,?,?,?)`,
        poNumber, input.supplier_id, orderDate, input.expected_date ?? '', input.notes ?? '',
      );
    } else {
      // Sin fecha: el DEFAULT del esquema pone la fecha local.
      res = db.run(
        `INSERT INTO purchase_orders (po_number, supplier_id, expected_date, notes)
		  VALUES (?,?,?,?)`,
        poNumber, input.supplier_id, input.expected_date ?? '', input.notes ?? '',
      );
    }
    poID = res.lastInsertRowid;
    insertPOItems(db, poID, items);
  });
  return getPurchaseOrder(db, poID);
}

function insertPOItems(db, poID, items) {
  for (const it of items) {
    if (!(it.qty > 0)) throw new BizError('las cantidades deben ser mayores que cero');
    if (it.unit_cost < 0) throw new BizError('el costo no puede ser negativo');
    const exists = db.scalar('SELECT COUNT(*) FROM products WHERE id=?', it.product_id);
    if (exists === 0) throw new BizError(`producto ${it.product_id} no existe`);
    db.run(
      `INSERT INTO purchase_order_items (po_id, product_id, qty, unit_cost)
		  VALUES (?,?,?,?)`,
      poID, it.product_id, it.qty, it.unit_cost,
    );
  }
}

// updatePurchaseOrder reemplaza cabecera e ítems; solo permitido en borrador o enviada.
export function updatePurchaseOrder(db, id, input) {
  db.transaction(() => {
    const status = db.scalar('SELECT status FROM purchase_orders WHERE id=?', id);
    if (status === undefined) throw new ErrNotFound();
    if (status !== 'borrador' && status !== 'enviada') {
      throw new BizError(`no se puede editar una orden ${status}`);
    }
    db.run(
      'UPDATE purchase_orders SET supplier_id=?, order_date=?, expected_date=?, notes=? WHERE id=?',
      input.supplier_id, input.order_date ?? '', input.expected_date ?? '', input.notes ?? '', id,
    );
    db.run('DELETE FROM purchase_order_items WHERE po_id=?', id);
    insertPOItems(db, id, input.items ?? []);
  });
  return getPurchaseOrder(db, id);
}

// setPOStatus cambia el estado. Al pasar a "recibida": suma stock, recalcula el costo
// promedio ponderado de cada producto y registra los movimientos.
export function setPOStatus(db, id, newStatus) {
  const valid = { borrador: true, enviada: true, recibida: true, cancelada: true };
  if (!valid[newStatus]) throw new BizError(`estado inválido: "${newStatus}"`);

  db.transaction(() => {
    const head = db.get('SELECT status, po_number FROM purchase_orders WHERE id=?', id);
    if (!head) throw new ErrNotFound();
    const { status, po_number: poNumber } = head;
    if (status === 'recibida') {
      throw new BizError('la orden ya fue recibida; para deshacerla use «Revertir recepción»');
    }
    if (status === 'cancelada' && newStatus !== 'borrador') {
      throw new BizError('una orden cancelada solo puede reabrirse como borrador');
    }

    if (newStatus === 'recibida') {
      const items = db.all('SELECT product_id, qty, unit_cost FROM purchase_order_items WHERE po_id=?', id);
      if (items.length === 0) throw new BizError('la orden no tiene productos');
      for (const it of items) {
        const p = db.get('SELECT stock, cost FROM products WHERE id=?', it.product_id);
        const { stock, cost } = p;
        // Costo promedio ponderado (solo el stock positivo existente pondera).
        let newCost = it.unit_cost;
        if (stock > 0 && stock + it.qty > 0) {
          newCost = (stock * cost + it.qty * it.unit_cost) / (stock + it.qty);
        }
        db.run(
          "UPDATE products SET stock=stock+?, cost=?, updated_at=datetime('now','localtime') WHERE id=?",
          it.qty, round2(newCost), it.product_id,
        );
        db.run(
          `INSERT INTO stock_movements (product_id, type, qty, unit_cost, reference)
			  VALUES (?,?,?,?,?)`,
          it.product_id, 'compra', it.qty, it.unit_cost, poNumber,
        );
      }
      db.run("UPDATE purchase_orders SET status='recibida', received_date=date('now','localtime') WHERE id=?", id);
    } else {
      db.run('UPDATE purchase_orders SET status=? WHERE id=?', newStatus, id);
    }
  });
  return getPurchaseOrder(db, id);
}

// revertPOReceipt deshace la recepción de una orden: descuenta del stock lo que
// entró, devuelve el costo promedio al valor que tenía antes y deja la orden en
// "enviada" para poder corregirla y volver a recibirla.
//
// Recibir una orden por error era, hasta ahora, irreversible: sumaba existencias
// y movía el costo promedio de cada producto sin marcha atrás, y la única salida
// era falsear un ajuste de inventario, que además dejaba el costo mal.
//
// La reversión SOLO se permite si nada se movió después de la recepción. El
// costo promedio se deshace con la cuenta inversa a la que lo formó
//   costoPrevio = (stock·costo − qty·costoUnitario) / (stock − qty)
// y esa cuenta solo devuelve el valor original si las existencias son exactamente
// las que dejó la recepción. Si hubo una venta, otra compra o un ajuste de por
// medio, el número que saldría sería inventado: en ese caso se rechaza y se
// explica qué hacer, en vez de escribir un costo que nadie podría justificar.
export function revertPOReceipt(db, id) {
  db.transaction(() => {
    const head = db.get('SELECT status, po_number FROM purchase_orders WHERE id=?', id);
    if (!head) throw new ErrNotFound();
    if (head.status !== 'recibida') {
      throw new BizError('solo se puede revertir una orden que esté recibida');
    }
    const poNumber = head.po_number;
    const items = db.all(
      'SELECT product_id, qty, unit_cost FROM purchase_order_items WHERE po_id=? ORDER BY id',
      id,
    );
    if (items.length === 0) throw new BizError('la orden no tiene productos');

    // Cada renglón se ata a SU movimiento de entrada. Antes se buscaba con
    // MAX(id) por producto + referencia, y eso se rompía cuando la misma orden
    // traía el mismo producto en dos renglones: al revertir el primero se
    // insertaba su movimiento de salida, y ese movimiento propio de la reversión
    // contaba como "movimiento posterior" para el segundo renglón, así que la
    // orden quedaba imposible de revertir para siempre. El esquema no puede
    // cambiar (la base sembrada tiene que seguir sirviendo tal cual), así que en
    // vez de guardar el id del movimiento en el renglón se emparejan por producto
    // + cantidad + costo unitario respetando el orden de las filas, y todas las
    // comprobaciones se resuelven antes de escribir nada.
    const entradas = db.all(
      "SELECT id, product_id, qty, unit_cost FROM stock_movements WHERE reference=? AND type='compra' ORDER BY id",
      poNumber,
    );
    const emparejados = new Set();
    // corte: por producto, el último movimiento de entrada que dejó esta orden.
    // Los otros renglones de la misma orden no son movimientos posteriores.
    const corte = new Map();
    for (const it of items) {
      const nombre = db.scalar('SELECT name FROM products WHERE id=?', it.product_id) ?? `producto ${it.product_id}`;
      const mov = entradas.find((m) => !emparejados.has(m.id) && m.product_id === it.product_id
        && m.qty === it.qty && m.unit_cost === it.unit_cost);
      if (!mov) {
        throw new BizError(`no se encuentra el movimiento de entrada de "${nombre}" para ${poNumber}`);
      }
      emparejados.add(mov.id);
      const previo = corte.get(it.product_id);
      if (previo === undefined || mov.id > previo.movID) corte.set(it.product_id, { nombre, movID: mov.id });
    }

    for (const [productID, { nombre, movID }] of corte) {
      const posteriores = db.scalar(
        'SELECT COUNT(*) FROM stock_movements WHERE product_id=? AND id > ?',
        productID, movID,
      );
      if (posteriores > 0) {
        throw new BizError(
          `"${nombre}" ya se movió después de recibir ${poNumber} (${posteriores} `
          + `movimiento${posteriores === 1 ? '' : 's'}). Revertir ahora dejaría un costo `
          + 'promedio inventado. Corrija con una salida de inventario y anote el motivo.',
        );
      }
    }

    // Se deshace en el orden inverso al de la recepción: el costo promedio se
    // formó renglón por renglón, así que cada cuenta inversa solo cuadra exacta
    // contra el estado que dejó ese mismo renglón. En orden directo, con dos
    // renglones del mismo producto, el redondeo a dos decimales de cada paso
    // intermedio devolvía un costo con un centavo de diferencia.
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const prod = db.get('SELECT stock, cost FROM products WHERE id=?', it.product_id);
      if (!prod) throw new ErrNotFound();
      const stockPrevio = prod.stock - it.qty;
      let costoPrevio = prod.cost;
      if (stockPrevio > 0) {
        costoPrevio = (prod.stock * prod.cost - it.qty * it.unit_cost) / stockPrevio;
        // El costo guardado viene redondeado a dos decimales, así que la cuenta
        // inversa puede rozar el cero por abajo. Un costo negativo no existe.
        if (costoPrevio < 0) costoPrevio = 0;
      }
      // Si antes no había existencias, la recepción fijó el costo al de la
      // compra y no hay ningún costo anterior que recuperar: se deja el que está.

      db.run(
        "UPDATE products SET stock=stock-?, cost=?, updated_at=datetime('now','localtime') WHERE id=?",
        it.qty, round2(costoPrevio), it.product_id,
      );
      db.run(
        `INSERT INTO stock_movements (product_id, type, qty, unit_cost, reference, notes)
		  VALUES (?,?,?,?,?,?)`,
        it.product_id, 'salida', -it.qty, it.unit_cost, poNumber,
        `Reversión de la recepción de ${poNumber}`,
      );
    }

    db.run("UPDATE purchase_orders SET status='enviada', received_date='' WHERE id=?", id);
  });
  return getPurchaseOrder(db, id);
}

export function deletePurchaseOrder(db, id) {
  const status = db.scalar('SELECT status FROM purchase_orders WHERE id=?', id);
  if (status === undefined) throw new ErrNotFound();
  if (status === 'recibida') {
    throw new BizError('no se puede eliminar una orden recibida (su inventario ya está aplicado)');
  }
  db.run('DELETE FROM purchase_orders WHERE id=?', id);
}
