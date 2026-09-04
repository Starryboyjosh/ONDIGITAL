// Traducción de internal/vitohost/tools.go.
// Herramientas de consulta y de acción sobre el dominio de OnStock.
import { ymd, primerDiaDelMes, addDate } from '../lib/fechas.js';

export function registerOnStockTools(reg, st) {
  if (!reg || !st) throw new Error('vitohost: registry and store are required');
  const tools = [
    [{
      name: 'list_low_stock',
      description: 'Lista productos activos con stock en o por debajo del mínimo (por agotarse).',
      read_only: true,
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Máximo de productos (default 20)' },
        },
      },
    }, toolListLowStock(st)],
    [{
      name: 'sales_summary',
      description: 'Resumen de ventas y margen del negocio en un periodo (7d, 30d, mes).',
      read_only: true,
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', description: '7d | 30d | month (mes actual)' },
        },
      },
    }, toolSalesSummary(st)],
    [{
      name: 'top_products',
      description: 'Productos con más ventas (ingresos) en un periodo.',
      read_only: true,
      parameters: {
        type: 'object',
        properties: { period: { type: 'string' }, limit: { type: 'integer' } },
      },
    }, toolTopProducts(st)],
    [{
      name: 'slow_products',
      description: 'Productos que se mueven más lento (poca o ninguna venta) en el periodo, con stock actual.',
      read_only: true,
      parameters: {
        type: 'object',
        properties: { period: { type: 'string' }, limit: { type: 'integer' } },
      },
    }, toolSlowProducts(st)],
    [{
      name: 'create_restock_po',
      description: 'Crea una orden de compra en borrador para reponer productos con stock bajo. Requiere confirmación del usuario.',
      read_only: false,
      parameters: {
        type: 'object',
        properties: {
          supplier_id: {
            type: 'integer',
            description: 'ID de proveedor (opcional: se infiere del primer producto con proveedor)',
          },
          notes: { type: 'string' },
        },
      },
    }, toolCreateRestockPO(st)],
  ];
  for (const [meta, fn] of tools) reg.register(meta, fn);
}

// f2 imita %.2f de Go; g imita %g.
const f2 = (v) => Number(v).toFixed(2);
const g = (v) => String(v);
const f1 = (v) => Number(v).toFixed(1);

function toolListLowStock(st) {
  return async (args) => {
    let limit = argInt(args, 'limit', 20);
    if (limit <= 0) limit = 20;
    let products = st.listProducts({ lowStock: true });
    if (products.length > limit) products = products.slice(0, limit);
    const rows = [];
    const lines = [];
    for (const p of products) {
      let need = p.min_stock - p.stock;
      if (need < 1) need = 1;
      const row = {
        id: p.id, sku: p.sku, name: p.name,
        stock: p.stock, min_stock: p.min_stock, qty_to_restock: need,
      };
      if (p.supplier_name) row.supplier = p.supplier_name; // `supplier,omitempty`
      rows.push(row);
      lines.push(`• ${p.name} (${p.sku}): stock ${g(p.stock)} / mín ${g(p.min_stock)} → reponer ${g(need)}`);
    }
    let text = 'No hay productos por debajo del mínimo de stock.';
    if (lines.length > 0) text = `Productos por agotarse (${lines.length}):\n${lines.join('\n')}`;
    return {
      ok: true,
      content: JSON.stringify({ count: rows.length, products: rows, summary: text }),
      citations: [{
        source: 'onstock.products.low_stock',
        label: 'Inventario · stock bajo',
        detail: `${rows.length} producto(s)`,
      }],
    };
  };
}

function toolSalesSummary(st) {
  return async (args) => {
    const [from, to, label] = periodRange(argString(args, 'period', '7d'));
    const stt = st.incomeStatement(from, to);
    const text = `Ventas ${label} (${from} → ${to}):\n`
      + `• Ventas netas: L ${f2(stt.ventas_netas)}\n`
      + `• Costo de ventas: L ${f2(stt.costo_ventas)}\n`
      + `• Utilidad bruta: L ${f2(stt.utilidad_bruta)} (margen ${f1(stt.margen_bruto)}%)\n`
      + `• Utilidad neta: L ${f2(stt.utilidad_neta)}\n`
      + `• Nº ventas: ${stt.num_ventas}\n`
      + `• ISV cobrado: L ${f2(stt.isv_cobrado)}`;
    return {
      ok: true,
      content: JSON.stringify({
        period: label, from, to,
        ventas_netas: stt.ventas_netas, utilidad_bruta: stt.utilidad_bruta,
        margen_bruto: stt.margen_bruto, utilidad_neta: stt.utilidad_neta,
        num_ventas: stt.num_ventas, summary: text,
      }),
      citations: [{
        source: 'onstock.reports.income_statement',
        label: 'Reportes · estado de resultados',
        detail: `${from} a ${to}`,
      }],
    };
  };
}

function toolTopProducts(st) {
  return async (args) => {
    const [from, to, label] = periodRange(argString(args, 'period', '30d'));
    let limit = argInt(args, 'limit', 5);
    if (limit <= 0) limit = 5;
    const top = st.topProducts(from, to, limit);
    const lines = top.map((p, i) => `${i + 1}. ${p.name} (${p.sku}): qty ${g(p.qty)} · ingresos L ${f2(p.revenue)} · utilidad L ${f2(p.profit)}`);
    let text = 'No hay ventas en el periodo.';
    if (lines.length > 0) text = `Top productos ${label}:\n${lines.join('\n')}`;
    return {
      ok: true,
      content: JSON.stringify({ period: label, from, to, products: top, summary: text }),
      citations: [{
        source: 'onstock.reports.top_products',
        label: 'Reportes · productos top',
        detail: `${from} a ${to}`,
      }],
    };
  };
}

function toolSlowProducts(st) {
  return async (args) => {
    const [from, to, label] = periodRange(argString(args, 'period', '30d'));
    let limit = argInt(args, 'limit', 8);
    if (limit <= 0) limit = 8;
    const products = st.listProducts({});
    // Cantidades vendidas a partir del top con un límite amplio.
    const top = st.topProducts(from, to, 500);
    const sold = new Map(top.map((t) => [t.product_id, t.qty]));
    let list = products.map((p) => ({
      id: p.id, sku: p.sku, name: p.name, stock: p.stock, qty_sold: sold.get(p.id) ?? 0,
    }));
    list.sort((a, b) => (a.qty_sold === b.qty_sold ? b.stock - a.stock : a.qty_sold - b.qty_sold));
    if (list.length > limit) list = list.slice(0, limit);
    const lines = list.map((p) => `• ${p.name} (${p.sku}): vendido ${g(p.qty_sold)} · stock actual ${g(p.stock)}`);
    let text = `Productos de movimiento lento (${label}):\n${lines.join('\n')}`;
    if (lines.length === 0) text = 'No hay productos para analizar.';
    return {
      ok: true,
      content: JSON.stringify({ period: label, from, to, products: list, summary: text }),
      citations: [{
        source: 'onstock.products.slow_movers',
        label: 'Inventario · rotación lenta',
        detail: `${from} a ${to}`,
      }],
    };
  };
}

function toolCreateRestockPO(st) {
  return async (args) => {
    const products = st.listProducts({ lowStock: true });
    if (products.length === 0) {
      return {
        ok: true,
        content: '{"summary":"No hay productos con stock bajo; no se creó orden de compra."}',
        citations: [{
          source: 'onstock.products.low_stock',
          label: 'Inventario · stock bajo',
          detail: '0 productos',
        }],
      };
    }

    // Agrupa por proveedor: el de los argumentos, o el que más se repita.
    let supplierID = argInt(args, 'supplier_id', 0);
    if (supplierID === 0) {
      const counts = new Map();
      for (const p of products) {
        if (p.supplier_id > 0) counts.set(p.supplier_id, (counts.get(p.supplier_id) ?? 0) + 1);
      }
      let best = 0;
      let bestN = 0;
      for (const [id, n] of counts) {
        if (n > bestN) { best = id; bestN = n; }
      }
      supplierID = best;
    }
    if (supplierID === 0) {
      return {
        ok: false,
        error: 'ningún producto con stock bajo tiene proveedor asignado; indícalo en supplier_id',
        content: '{"error":"falta proveedor"}',
      };
    }

    const items = [];
    const lines = [];
    for (const p of products) {
      if (p.supplier_id !== null && p.supplier_id !== supplierID) continue; // una OC por proveedor
      if (p.supplier_id === null) continue;
      let need = p.min_stock - p.stock;
      if (need < 1) need = 1;
      need = Math.ceil(need); // redondear hacia arriba a entero de compra
      items.push({ product_id: p.id, qty: need, unit_cost: p.cost });
      lines.push(`• ${p.name} × ${g(need)} @ L ${f2(p.cost)}`);
    }
    if (items.length === 0) {
      // Aquí antes se metían en la orden TODOS los productos con stock bajo,
      // fueran de quien fueran, pese a que el comentario decía lo contrario:
      // salía una orden dirigida a un proveedor pidiéndole mercancía de otro.
      // Si el proveedor elegido no tiene nada bajo mínimo no hay orden que
      // crear, y eso es lo que se contesta.
      // getSupplier lanza si el id no existe, y aquí un id inventado por el
      // motor no debe tumbar la herramienta: lo que toca es explicarlo.
      let nombre = `proveedor ${supplierID}`;
      try { nombre = st.getSupplier(supplierID).name; } catch { /* id desconocido */ }
      return {
        ok: false,
        error: `ningún producto con stock bajo pertenece a ${nombre}; `
          + 'indica otro proveedor o revisa a quién está asignado cada producto',
        content: JSON.stringify({ error: 'sin productos de ese proveedor', supplier: nombre }),
      };
    }
    const notes = argString(args, 'notes', 'Generada por Vito · reposición de stock bajo');
    const po = st.createPurchaseOrder({ supplier_id: supplierID, notes, items });
    const text = `Orden de compra ${po.po_number} creada (estado: ${po.status}) para ${po.supplier_name}.\n`
      + `Ítems:\n${lines.join('\n')}\nTotal estimado: L ${f2(po.total)}`;
    return {
      ok: true,
      content: JSON.stringify({
        po_id: po.id, po_number: po.po_number, status: po.status,
        supplier: po.supplier_name, total: po.total, summary: text,
      }),
      citations: [{
        source: 'onstock.purchase_orders.create',
        label: 'Compras · orden creada',
        detail: po.po_number,
      }],
    };
  };
}

export function periodRange(period) {
  const now = new Date();
  const to = ymd(now);
  switch (String(period ?? '').trim().toLowerCase()) {
    case '30d': case '30': case 'mes_movil':
      return [ymd(addDate(now, 0, 0, -30)), to, 'últimos 30 días'];
    case 'month': case 'mes': case 'this_month':
      return [ymd(primerDiaDelMes(now)), to, 'mes actual'];
    default: // 7d
      return [ymd(addDate(now, 0, 0, -7)), to, 'últimos 7 días'];
  }
}

function argString(args, key, def) {
  if (!args) return def;
  const v = args[key];
  if (v === undefined || v === null) return def;
  if (typeof v === 'string') return v.trim() === '' ? def : v;
  return String(v);
}

function argInt(args, key, def) {
  if (!args) return def;
  const v = args[key];
  if (v === undefined || v === null) return def;
  if (typeof v === 'number') return Math.trunc(v);
  if (typeof v === 'string') {
    const m = /^[+-]?\d+/.exec(v.trim());
    if (m) return Number.parseInt(m[0], 10);
  }
  return def;
}
