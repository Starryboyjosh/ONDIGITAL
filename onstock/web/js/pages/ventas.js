// Ventas: listado, detalle y anulación.
import { api } from '../api.js';
import {
  $, esc, money, qty, fmtDate, icons, toast, toastErr,
  openModal, confirmDialog, statusBadge, debounce, download, firstOfMonth, today,
} from '../ui.js';

let filters = { q: '', from: firstOfMonth(), to: today(), status: '' };

export async function render(page) {
  page.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Ventas</h1>
        <div class="sub">Historial y anulación · para cobrar usa <b>Caja</b></div>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" id="btn-xlsx">${icons.download} Excel</button>
        <button class="btn btn-outline" id="btn-pdf">${icons.download} PDF</button>
        <a href="#/caja" class="btn btn-primary">${icons.cart} Ir a la caja</a>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <div class="search-wrap">${icons.search}
          <input class="input" id="f-q" placeholder="Buscar por número o cliente…" value="${esc(filters.q)}">
        </div>
        <input class="input" type="date" id="f-from" value="${filters.from}">
        <input class="input" type="date" id="f-to" value="${filters.to}">
        <select class="input" id="f-status">
          <option value="">Todas</option>
          <option value="completada" ${filters.status === 'completada' ? 'selected' : ''}>Completadas</option>
          <option value="anulada" ${filters.status === 'anulada' ? 'selected' : ''}>Anuladas</option>
        </select>
        <div class="spacer"></div>
        <div id="totals" class="muted" style="font-size:13px"></div>
      </div>
      <div id="sales-table"></div>
    </div>`;

  $('#f-q', page).addEventListener('input', debounce(() => { filters.q = $('#f-q', page).value; loadTable(page); }, 250));
  $('#f-from', page).addEventListener('change', () => { filters.from = $('#f-from', page).value; loadTable(page); });
  $('#f-to', page).addEventListener('change', () => { filters.to = $('#f-to', page).value; loadTable(page); });
  $('#f-status', page).addEventListener('change', () => { filters.status = $('#f-status', page).value; loadTable(page); });
  $('#btn-xlsx', page).addEventListener('click', () =>
    download(`/api/reports/sales/export?from=${filters.from}&to=${filters.to}`));
  $('#btn-pdf', page).addEventListener('click', () =>
    download(`/api/reports/sales/export?format=pdf&from=${filters.from}&to=${filters.to}`));

  await loadTable(page);
}

async function loadTable(page) {
  const root = $('#sales-table', page);
  const p = new URLSearchParams();
  if (filters.q) p.set('q', filters.q);
  if (filters.from) p.set('from', filters.from);
  if (filters.to) p.set('to', filters.to);
  if (filters.status) p.set('status', filters.status);

  let sales;
  try {
    sales = await api.get('/api/sales?' + p.toString());
  } catch (err) { toastErr(err); return; }

  const completed = sales.filter(v => v.status === 'completada');
  const totV = completed.reduce((a, v) => a + v.total, 0);
  const totU = completed.reduce((a, v) => a + (v.subtotal - v.cost_total), 0);
  $('#totals', page).innerHTML =
    `${completed.length} ventas · Total: <b>${money(totV)}</b> · Utilidad: <b class="text-green">${money(totU)}</b>`;

  if (!sales.length) {
    root.innerHTML = '<div class="empty-state"><b>Sin ventas en este período</b>Ajusta los filtros o registra una nueva venta.</div>';
    return;
  }

  root.innerHTML = `
    <div class="table-wrap"><table class="table">
      <thead><tr>
        <th>Número</th><th>Fecha</th><th>Cliente</th>
        <th class="num">Subtotal</th><th class="num">ISV</th><th class="num">Total</th>
        <th class="num">Utilidad</th><th>Pago</th><th>Estado</th><th class="actions-cell"></th>
      </tr></thead>
      <tbody>
        ${sales.map(v => `
          <tr class="row-click" data-id="${v.id}">
            <td class="mono">${esc(v.sale_number)}</td>
            <td class="nowrap">${fmtDate(v.sale_date)}</td>
            <td>${esc(v.customer_name) || '<span class="muted">Consumidor final</span>'}</td>
            <td class="num">${money(v.subtotal)}</td>
            <td class="num">${money(v.isv)}</td>
            <td class="num cell-main">${money(v.total)}</td>
            <td class="num ${v.status === 'completada' ? 'text-green' : 'muted'}">
              ${v.status === 'completada' ? money(v.subtotal - v.cost_total) : '—'}
            </td>
            <td>${esc(cap(v.payment_method))}</td>
            <td>${statusBadge(v.status)}</td>
            <td class="actions-cell">
              <button class="btn btn-sm btn-ghost btn-icon" data-act="view" title="Ver detalle">${icons.eye}</button>
              ${v.status === 'completada' ? `<button class="btn btn-sm btn-ghost btn-icon" data-act="void" title="Anular">${icons.ban}</button>` : ''}
            </td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;

  root.addEventListener('click', async (e) => {
    const row = e.target.closest('tr[data-id]');
    if (!row) return;
    const id = +row.dataset.id;
    const btn = e.target.closest('[data-act]');
    if (btn && btn.dataset.act === 'void') {
      await voidSale(id, page);
      return;
    }
    detailModal(id, page);
  });
}

async function voidSale(id, page) {
  const ok = await confirmDialog(
    'Al anular la venta se repondrá el stock de los productos y la venta dejará de contar en los reportes. Esta acción no se puede deshacer.',
    { title: 'Anular venta', okText: 'Anular venta', danger: true });
  if (!ok) return;
  try {
    await api.post(`/api/sales/${id}/void`);
    toast('Venta anulada y stock repuesto');
    loadTable(page);
  } catch (err) { toastErr(err); }
}

async function detailModal(id, page) {
  let v;
  try { v = await api.get(`/api/sales/${id}`); } catch (err) { toastErr(err); return; }

  const m = openModal({
    title: `Venta ${v.sale_number}`,
    size: 'modal-lg',
    body: `
      <div class="flex-between mb">
        <div>
          <div><b>${esc(v.customer_name) || 'Consumidor final'}</b>${v.customer_rtn ? ` · RTN: <span class="mono">${esc(v.customer_rtn)}</span>` : ''}</div>
          <div class="muted" style="font-size:13px">${fmtDate(v.sale_date)} · Pago: ${esc(cap(v.payment_method))}</div>
        </div>
        ${statusBadge(v.status)}
      </div>
      <div class="table-wrap" style="border:1px solid var(--border); border-radius:10px">
        <table class="table">
          <thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio (sin ISV)</th><th class="num">ISV %</th><th class="num">Importe</th></tr></thead>
          <tbody>
            ${v.items.map(it => `
              <tr>
                <td><div class="cell-main">${esc(it.product_name)}</div><div class="cell-sub mono">${esc(it.product_sku)}</div></td>
                <td class="num">${qty(it.qty)}</td>
                <td class="num">${money(it.unit_price)}</td>
                <td class="num">${it.isv_rate}%</td>
                <td class="num">${money(it.qty * it.unit_price)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="max-width:300px; margin-left:auto; margin-top:14px">
        <div class="pos-total-row"><span>Subtotal (sin ISV)</span><span>${money(v.subtotal)}</span></div>
        ${v.discount > 0 ? `<div class="pos-total-row"><span>Descuento</span><span>-${money(v.discount)}</span></div>` : ''}
        <div class="pos-total-row"><span>ISV</span><span>${money(v.isv)}</span></div>
        <div class="pos-total-row grand"><span>Total</span><span>${money(v.total)}</span></div>
        ${v.status === 'completada' ? `<div class="pos-total-row"><span>Utilidad bruta</span><span class="text-green">${money(v.subtotal - v.cost_total)}</span></div>` : ''}
      </div>
      ${v.notes ? `<p class="muted" style="font-size:13px">Notas: ${esc(v.notes)}</p>` : ''}`,
    footer: `
      ${v.status === 'completada' ? `<button class="btn btn-danger" data-void>${icons.ban} Anular venta</button>` : ''}
      <button class="btn btn-outline" data-cancel>Cerrar</button>`,
  });

  m.el.querySelector('[data-cancel]').addEventListener('click', m.close);
  const voidBtn = m.el.querySelector('[data-void]');
  if (voidBtn) voidBtn.addEventListener('click', async () => {
    m.close();
    await voidSale(id, page);
  });
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
