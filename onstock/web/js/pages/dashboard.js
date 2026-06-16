// Dashboard: KPIs del mes, gráfica de 12 meses, top productos, stock bajo, ventas recientes.
import { api } from '../api.js';
import { $, esc, money, qty, fmtDate, statusBadge, icons } from '../ui.js';
import { monthBarChart } from '../charts.js';

const ic = {
  sales: '<svg viewBox="0 0 24 24"><path d="M3 17l5-5 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
  profit: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1 1-1.7 2.5-1.7s2.5.7 2.5 1.7-1 1.4-2.5 1.8-2.5.8-2.5 1.8 1 1.7 2.5 1.7 2.5-.7 2.5-1.7"/></svg>',
  expense: '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/></svg>',
  box: '<svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v9"/></svg>',
};

export async function render(page) {
  const d = await api.get('/api/dashboard');
  const [y, m] = d.month.split('-');
  const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const monthLabel = `${monthNames[+m - 1]} ${y}`;

  page.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Dashboard</h1>
        <div class="sub">Resumen de ${esc(monthLabel)}</div>
      </div>
      <div class="page-actions">
        <a href="#/reportes" class="btn btn-outline">${icons.download} Reportes</a>
        <a href="#/ventas/nueva" class="btn btn-primary">${icons.cart} Nueva venta</a>
      </div>
    </div>

    <div class="grid grid-4 mb">
      <div class="card kpi">
        <div class="kpi-label"><span class="kpi-icon ki-primary">${ic.sales}</span> Ventas del mes</div>
        <div class="kpi-value">${money(d.ventas_mes)}</div>
        <div class="kpi-foot">${d.num_ventas_mes} ventas · ticket ${money(d.ticket_promedio)}</div>
      </div>
      <div class="card kpi">
        <div class="kpi-label"><span class="kpi-icon ki-green">${ic.profit}</span> Utilidad bruta</div>
        <div class="kpi-value text-green">${money(d.utilidad_bruta_mes)}</div>
        <div class="kpi-foot">ISV cobrado: ${money(d.isv_cobrado_mes)}</div>
      </div>
      <div class="card kpi">
        <div class="kpi-label"><span class="kpi-icon ki-red">${ic.expense}</span> Gastos del mes</div>
        <div class="kpi-value">${money(d.gastos_mes)}</div>
        <div class="kpi-foot">Utilidad neta est.: ${money(d.utilidad_bruta_mes - d.gastos_mes)}</div>
      </div>
      <div class="card kpi">
        <div class="kpi-label"><span class="kpi-icon ki-amber">${ic.box}</span> Valor del inventario</div>
        <div class="kpi-value">${money(d.valor_inventario)}</div>
        <div class="kpi-foot">${d.productos_activos} productos · ${d.low_stock_count > 0
          ? `<span class="text-red">${d.low_stock_count} con stock bajo</span>` : 'stock saludable'}</div>
      </div>
    </div>

    <div class="card mb">
      <h2>Ventas últimos 12 meses <span class="muted">netas de ISV</span></h2>
      <div class="chart-wrap" id="chart"></div>
      <div class="chart-legend">
        <span><span class="dot" style="background:#4f46e5"></span>Ventas netas</span>
        <span><span class="dot" style="background:#10b981"></span>Utilidad bruta</span>
      </div>
    </div>

    <div class="grid grid-2 mb">
      <div class="card">
        <h2>Top productos del mes</h2>
        ${d.top_products.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Ventas</th><th class="num">Utilidad</th></tr></thead>
          <tbody>
            ${d.top_products.map(t => `
              <tr>
                <td><div class="cell-main">${esc(t.name)}</div><div class="cell-sub mono">${esc(t.sku)}</div></td>
                <td class="num">${qty(t.qty)}</td>
                <td class="num">${money(t.revenue)}</td>
                <td class="num text-green">${money(t.profit)}</td>
              </tr>`).join('')}
          </tbody>
        </table></div>` : `<div class="empty-state"><b>Sin ventas este mes</b>Registra tu primera venta para ver estadísticas.</div>`}
      </div>

      <div class="card">
        <h2>Stock bajo <span class="muted">stock ≤ mínimo</span></h2>
        ${d.low_stock.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Producto</th><th class="num">Stock</th><th class="num">Mínimo</th><th></th></tr></thead>
          <tbody>
            ${d.low_stock.map(p => `
              <tr>
                <td><div class="cell-main">${esc(p.name)}</div><div class="cell-sub mono">${esc(p.sku)}</div></td>
                <td class="num"><span class="badge badge-red badge-plain">${qty(p.stock)}</span></td>
                <td class="num">${qty(p.min_stock)}</td>
                <td class="actions-cell"><a class="btn btn-sm btn-outline" href="#/compras">Reabastecer</a></td>
              </tr>`).join('')}
          </tbody>
        </table></div>` : `<div class="empty-state"><b>Todo en orden</b>Ningún producto está por debajo de su stock mínimo.</div>`}
      </div>
    </div>

    <div class="card">
      <h2>Ventas recientes <a href="#/ventas" class="muted" style="text-decoration:none">ver todas →</a></h2>
      ${d.recent_sales.length ? `
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th class="num">Total</th><th>Pago</th><th>Estado</th></tr></thead>
        <tbody>
          ${d.recent_sales.map(v => `
            <tr>
              <td class="mono">${esc(v.sale_number)}</td>
              <td>${fmtDate(v.sale_date)}</td>
              <td>${esc(v.customer_name) || '<span class="muted">Consumidor final</span>'}</td>
              <td class="num cell-main">${money(v.total)}</td>
              <td>${esc(cap(v.payment_method))}</td>
              <td>${statusBadge(v.status)}</td>
            </tr>`).join('')}
        </tbody>
      </table></div>` : `<div class="empty-state"><b>Aún no hay ventas</b>Usa "Nueva venta" para registrar la primera.</div>`}
    </div>`;

  monthBarChart($('#chart', page), d.series);
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
