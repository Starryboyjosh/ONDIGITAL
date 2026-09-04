// Traducción de internal/store/reports.go.
//
// Estado de Resultados en formato Honduras: todos los montos de ventas son
// NETOS de ISV (el ISV no es ingreso de la empresa). Los puntos de redondeo van
// exactamente donde los puso el original — mover uno solo cambia el cuadre.
import { round2 } from '../db.js';
import { listProducts } from './products.js';
import { listSales } from './sales.js';
import { inventoryValue } from './inventory.js';
import { ymd, ym, primerDiaDelMes, addDate, MESES_CORTO_ES } from '../lib/fechas.js';

export function incomeStatement(db, from, to) {
  const st = {
    from,
    to,
    ventas_brutas: 0,
    descuentos: 0,
    ventas_netas: 0,
    costo_ventas: 0,
    utilidad_bruta: 0,
    gastos_ventas: 0,
    gastos_administrativos: 0,
    gastos_operativos: 0,
    utilidad_operativa: 0,
    gastos_financieros: 0,
    otros_gastos: 0,
    utilidad_antes_isr: 0,
    isr_rate: db.settingFloat('isr_rate', 25),
    isr: 0,
    utilidad_neta: 0,
    isv_cobrado: 0,
    num_ventas: 0,
    margen_bruto: 0,
    margen_neto: 0,
  };

  const v = db.get(
    `SELECT
	    COALESCE(SUM(subtotal + discount_net),0) AS brutas,
	    COALESCE(SUM(discount_net),0)            AS descuentos,
	    COALESCE(SUM(subtotal),0)                AS netas,
	    COALESCE(SUM(cost_total),0)              AS costo,
	    COALESCE(SUM(isv),0)                     AS isv,
	    COUNT(*)                                 AS n
	  FROM sales WHERE status='completada' AND date(sale_date) BETWEEN ? AND ?`,
    from, to,
  );
  st.ventas_brutas = v.brutas;
  st.descuentos = v.descuentos;
  st.ventas_netas = v.netas;
  st.costo_ventas = v.costo;
  st.isv_cobrado = v.isv;
  st.num_ventas = v.n;

  const gastos = db.all(
    `SELECT category, COALESCE(SUM(amount),0) AS amt FROM expenses
	  WHERE expense_date BETWEEN ? AND ? GROUP BY category`,
    from, to,
  );
  for (const g of gastos) {
    switch (g.category) {
      case 'ventas': st.gastos_ventas = g.amt; break;
      case 'administrativos': st.gastos_administrativos = g.amt; break;
      case 'financieros': st.gastos_financieros = g.amt; break;
      default: st.otros_gastos += g.amt; break;
    }
  }
  // Se redondea antes de derivar los totales: SUM() sobre montos con dos
  // decimales arrastra ruido binario y ese ruido terminaba escrito tal cual en
  // la celda del Excel (-869.5699999999999 en la barra de fórmulas).
  st.gastos_ventas = round2(st.gastos_ventas);
  st.gastos_administrativos = round2(st.gastos_administrativos);
  st.gastos_financieros = round2(st.gastos_financieros);
  st.otros_gastos = round2(st.otros_gastos);

  st.utilidad_bruta = st.ventas_netas - st.costo_ventas;
  st.gastos_operativos = st.gastos_ventas + st.gastos_administrativos;
  st.utilidad_operativa = st.utilidad_bruta - st.gastos_operativos;
  st.utilidad_antes_isr = st.utilidad_operativa - st.gastos_financieros - st.otros_gastos;
  if (st.utilidad_antes_isr > 0) {
    st.isr = round2((st.utilidad_antes_isr * st.isr_rate) / 100);
  }
  st.utilidad_neta = round2(st.utilidad_antes_isr - st.isr);
  if (st.ventas_netas > 0) {
    st.margen_bruto = round2((st.utilidad_bruta / st.ventas_netas) * 100);
    st.margen_neto = round2((st.utilidad_neta / st.ventas_netas) * 100);
  }
  for (const k of ['ventas_brutas', 'descuentos', 'ventas_netas', 'costo_ventas',
    'utilidad_bruta', 'gastos_operativos', 'utilidad_operativa', 'utilidad_antes_isr', 'isv_cobrado']) {
    st[k] = round2(st[k]);
  }
  return st;
}

export function topProducts(db, from, to, limit) {
  if (!limit || limit <= 0) limit = 10;
  // sale_items.unit_price es el precio neto ANTES del descuento de la venta y
  // viene redondeado a dos decimales, así que sumar las líneas nunca da el
  // mismo número que sales.subtotal. Para que este reporte cuadre exactamente
  // con VentasNetas/UtilidadBruta del Estado de Resultados, repartimos el
  // subtotal real de cada venta entre sus líneas en proporción a lo que pesa
  // cada una: k = subtotal / SUM(qty*unit_price).
  const rows = db.all(
    `SELECT i.product_id, p.name, p.sku,
	    SUM(i.qty) AS qty,
	    SUM(i.qty*i.unit_price*f.k) AS revenue,
	    SUM(i.qty*i.unit_price*f.k - i.qty*i.unit_cost) AS profit
	  FROM sale_items i
	  JOIN sales v ON v.id=i.sale_id AND v.status='completada' AND date(v.sale_date) BETWEEN ? AND ?
	  JOIN products p ON p.id=i.product_id
	  JOIN (SELECT s2.id AS sid,
	          COALESCE(s2.subtotal/NULLIF(SUM(i2.qty*i2.unit_price),0),1) AS k
	        FROM sales s2 JOIN sale_items i2 ON i2.sale_id=s2.id
	        WHERE s2.status='completada' AND date(s2.sale_date) BETWEEN ? AND ?
	        GROUP BY s2.id) f ON f.sid=v.id
	  GROUP BY i.product_id ORDER BY 5 DESC LIMIT ?`,
    from, to, from, to, limit,
  );
  return rows.map((t) => ({
    product_id: t.product_id,
    name: t.name,
    sku: t.sku,
    qty: t.qty,
    revenue: round2(t.revenue),
    profit: round2(t.profit),
  }));
}

// salesSeries devuelve ventas netas y utilidad bruta por mes para los últimos n meses.
export function salesSeries(db, n) {
  const now = new Date();
  const points = [];
  const byMonth = new Map();
  for (let i = n - 1; i >= 0; i--) {
    const t = addDate(primerDiaDelMes(now), 0, -i, 0);
    const key = ym(t);
    const p = {
      month: key,
      label: `${MESES_CORTO_ES[t.getMonth()]} ${String(t.getFullYear() % 100).padStart(2, '0')}`,
      ventas: 0,
      utilidad: 0,
    };
    points.push(p);
    byMonth.set(key, p);
  }
  const start = `${points[0].month}-01`;
  const rows = db.all(
    `SELECT strftime('%Y-%m', sale_date) AS k, COALESCE(SUM(subtotal),0) AS v, COALESCE(SUM(subtotal-cost_total),0) AS u
	  FROM sales WHERE status='completada' AND date(sale_date) >= ?
	  GROUP BY strftime('%Y-%m', sale_date)`,
    start,
  );
  for (const r of rows) {
    const p = byMonth.get(r.k);
    if (p) {
      p.ventas = round2(r.v);
      p.utilidad = round2(r.u);
    }
  }
  return points;
}

export function dashboard(db) {
  const now = new Date();
  const first = ymd(primerDiaDelMes(now));
  const today = ymd(now);
  const d = {
    month: ym(now),
    ventas_mes: 0,
    utilidad_bruta_mes: 0,
    gastos_mes: 0,
    num_ventas_mes: 0,
    ticket_promedio: 0,
    isv_cobrado_mes: 0,
    valor_inventario: 0,
    productos_activos: 0,
    low_stock_count: 0,
    series: [],
    top_products: [],
    low_stock: [],
    recent_sales: [],
  };

  const v = db.get(
    `SELECT COALESCE(SUM(subtotal),0) AS ventas, COALESCE(SUM(subtotal-cost_total),0) AS utilidad,
	    COALESCE(SUM(isv),0) AS isv, COUNT(*) AS n
	  FROM sales WHERE status='completada' AND date(sale_date) BETWEEN ? AND ?`,
    first, today,
  );
  d.ventas_mes = v.ventas;
  d.utilidad_bruta_mes = v.utilidad;
  d.isv_cobrado_mes = v.isv;
  d.num_ventas_mes = v.n;
  if (d.num_ventas_mes > 0) d.ticket_promedio = round2(d.ventas_mes / d.num_ventas_mes);
  d.ventas_mes = round2(d.ventas_mes);
  d.utilidad_bruta_mes = round2(d.utilidad_bruta_mes);
  d.isv_cobrado_mes = round2(d.isv_cobrado_mes);

  d.gastos_mes = round2(db.scalar(
    'SELECT COALESCE(SUM(amount),0) FROM expenses WHERE expense_date BETWEEN ? AND ?', first, today,
  ));

  d.valor_inventario = inventoryValue(db);
  d.productos_activos = db.scalar('SELECT COUNT(*) FROM products WHERE active=1');
  d.low_stock_count = db.scalar('SELECT COUNT(*) FROM products WHERE active=1 AND stock <= min_stock');
  d.series = salesSeries(db, 12);
  d.top_products = topProducts(db, first, today, 5);
  d.low_stock = listProducts(db, { lowStock: true });
  if (d.low_stock.length > 8) d.low_stock = d.low_stock.slice(0, 8);
  d.recent_sales = listSales(db, { limit: 8 });
  return d;
}

// monthlySummary agrupa todo lo necesario para el "resumen del mes".
export function monthlySummary(db, year, month) {
  const first = new Date(year, month - 1, 1);
  const last = addDate(first, 0, 1, -1);
  const from = ymd(first);
  const to = ymd(last);

  const ms = {
    year,
    month,
    statement: incomeStatement(db, from, to),
    ticket_promedio: 0,
    compras_recibidas: 0,
    num_compras: 0,
    top_products: [],
    valor_inventario: 0,
  };
  if (ms.statement.num_ventas > 0) {
    ms.ticket_promedio = round2(ms.statement.ventas_netas / ms.statement.num_ventas);
  }
  const c = db.get(
    `SELECT COUNT(*) AS n, COALESCE(SUM((SELECT SUM(qty*unit_cost) FROM purchase_order_items WHERE po_id=o.id)),0) AS total
	  FROM purchase_orders o WHERE o.status='recibida' AND o.received_date BETWEEN ? AND ?`,
    from, to,
  );
  ms.num_compras = c.n;
  ms.compras_recibidas = round2(c.total);
  ms.top_products = topProducts(db, from, to, 10);
  ms.valor_inventario = inventoryValue(db);
  return ms;
}

// salesReportRows: filas para exportar ventas de un período.
export function salesReportRows(db, from, to) {
  return listSales(db, { from, to, limit: 100000 });
}
