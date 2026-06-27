// Dashboard: resumen operativo del día (ventas, mesas, cocina, top platillos).
import { api } from '../api.js';
import { money, num, qty, esc, icons, fmtDate, orderStatusBadge } from '../ui.js';

export async function render(page) {
  const d = await api.get('/api/dashboard');

  const kpi = (label, value, foot, icon, cls) => `
    <div class="card kpi">
      <div class="kpi-label"><span class="kpi-icon ${cls}">${icon}</span>${esc(label)}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-foot">${foot}</div>
    </div>`;

  const sessionPill = d.session_open
    ? '<span class="badge badge-green">Caja abierta</span>'
    : '<span class="badge badge-amber">Caja cerrada</span>';

  page.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Dashboard</h1>
        <div class="sub">Resumen de hoy · ${sessionPill}</div>
      </div>
      <div class="page-actions">
        <a href="#/salon" class="btn btn-primary">${icons.table} Ir al salón</a>
      </div>
    </div>

    <div class="grid grid-4 mb">
      ${kpi('Ventas de hoy', money(d.sales_today), `${d.orders_today} comanda${d.orders_today === 1 ? '' : 's'} pagada${d.orders_today === 1 ? '' : 's'}`, icons.cash, 'ki-green')}
      ${kpi('Ticket promedio', money(d.avg_ticket), 'por comanda pagada', icons.receipt, 'ki-primary')}
      ${kpi('Propinas de hoy', money(d.tips_today), 'para el personal de servicio', icons.users, 'ki-amber')}
      ${kpi('Mesas ocupadas', `${d.tables_busy}/${d.tables_total}`, `${d.open_orders} comanda${d.open_orders === 1 ? '' : 's'} abierta${d.open_orders === 1 ? '' : 's'}`, icons.table, 'ki-primary')}
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h2>En cocina ahora <span class="muted">${d.kitchen_open} platillo${d.kitchen_open === 1 ? '' : 's'}</span></h2>
        <div class="card-pad">
          ${d.kitchen_open > 0
            ? `<p>Hay <b>${d.kitchen_open}</b> platillo${d.kitchen_open === 1 ? '' : 's'} en preparación. <a href="#/cocina">Abrir cocina →</a></p>`
            : '<p class="muted">Sin platillos pendientes en cocina.</p>'}
        </div>
      </div>
      <div class="card">
        <h2>Top platillos de hoy</h2>
        ${d.top_items && d.top_items.length ? `
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Platillo</th><th class="num">Cant.</th><th class="num">Venta</th></tr></thead>
            <tbody>
              ${d.top_items.map(t => `<tr><td class="cell-main">${esc(t.name)}</td><td class="num">${qty(t.qty)}</td><td class="num">${money(t.total)}</td></tr>`).join('')}
            </tbody>
          </table></div>` : '<div class="empty-state">Aún no hay ventas hoy.</div>'}
      </div>
    </div>

    <div class="card mt">
      <h2>Comandas recientes</h2>
      ${d.recent_orders && d.recent_orders.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Comanda</th><th>Mesa</th><th>Cerrada</th><th class="num">Total</th><th class="num">Propina</th><th>Estado</th></tr></thead>
          <tbody>
            ${d.recent_orders.map(o => `
              <tr>
                <td class="mono">${esc(o.order_number)}</td>
                <td>${esc(o.table_name || '—')}</td>
                <td>${fmtDate(o.closed_at)}</td>
                <td class="num">${money(o.total)}</td>
                <td class="num">${money(o.tip)}</td>
                <td>${orderStatusBadge(o.status)}</td>
              </tr>`).join('')}
          </tbody>
        </table></div>` : '<div class="empty-state">Aún no hay comandas pagadas hoy.</div>'}
    </div>`;
}
