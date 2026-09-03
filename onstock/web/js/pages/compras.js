// Compras: órdenes de compra a proveedores y recepción de mercancía.
import { api } from '../api.js';
import {
  $, $$, esc, money, qty, fmtDate, icons, toast, toastErr,
  openModal, confirmDialog, statusBadge, productPicker, today,
} from '../ui.js';

let suppliers = [];
let filters = { status: '', supplier_id: 0 };

export async function render(page) {
  suppliers = await api.get('/api/suppliers');

  page.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Compras</h1>
        <div class="sub">Órdenes de compra: al recibirlas se suma el stock y se recalcula el costo promedio</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-new">${icons.plus} Nueva orden</button>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <select class="input" id="f-status">
          <option value="">Todos los estados</option>
          <option value="borrador" ${filters.status === 'borrador' ? 'selected' : ''}>Borradores</option>
          <option value="enviada" ${filters.status === 'enviada' ? 'selected' : ''}>Enviadas</option>
          <option value="recibida" ${filters.status === 'recibida' ? 'selected' : ''}>Recibidas</option>
          <option value="cancelada" ${filters.status === 'cancelada' ? 'selected' : ''}>Canceladas</option>
        </select>
        <select class="input" id="f-sup">
          <option value="0">Todos los proveedores</option>
          ${suppliers.map(s => `<option value="${s.id}" ${filters.supplier_id == s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
        </select>
      </div>
      <div id="po-table"></div>
    </div>`;

  $('#f-status', page).addEventListener('change', () => { filters.status = $('#f-status', page).value; loadTable(page); });
  $('#f-sup', page).addEventListener('change', () => { filters.supplier_id = +$('#f-sup', page).value; loadTable(page); });
  $('#btn-new', page).addEventListener('click', () => poModal(null, page));

  await loadTable(page);
}

async function loadTable(page) {
  const root = $('#po-table', page);
  const p = new URLSearchParams();
  if (filters.status) p.set('status', filters.status);
  if (filters.supplier_id) p.set('supplier_id', filters.supplier_id);

  let orders;
  try {
    orders = await api.get('/api/purchase-orders?' + p.toString());
  } catch (err) { toastErr(err); return; }

  if (!orders.length) {
    root.innerHTML = '<div class="empty-state"><b>Sin órdenes de compra</b>Crea una orden para reabastecer tu inventario.</div>';
    return;
  }

  root.innerHTML = `
    <div class="table-wrap"><table class="table">
      <thead><tr>
        <th>Número</th><th>Proveedor</th><th>Fecha</th><th>Esperada</th>
        <th class="num">Total</th><th>Estado</th><th class="actions-cell"></th>
      </tr></thead>
      <tbody>
        ${orders.map(o => `
          <tr class="row-click" data-id="${o.id}">
            <td class="mono">${esc(o.po_number)}</td>
            <td class="cell-main">${esc(o.supplier_name)}</td>
            <td>${fmtDate(o.order_date)}</td>
            <td>${o.expected_date ? fmtDate(o.expected_date) : '—'}</td>
            <td class="num cell-main">${money(o.total)}</td>
            <td>${statusBadge(o.status)}</td>
            <td class="actions-cell">
              ${o.status === 'borrador' ? `<button class="btn btn-sm btn-outline" data-act="send">Marcar enviada</button>` : ''}
              ${(o.status === 'borrador' || o.status === 'enviada') ? `
                <button class="btn btn-sm btn-green" data-act="receive">${icons.truck} Recibir</button>
                <button class="btn btn-sm btn-ghost btn-icon" data-act="edit" title="Editar">${icons.edit}</button>
                <button class="btn btn-sm btn-ghost btn-icon" data-act="cancel" title="Cancelar">${icons.ban}</button>` : ''}
              ${o.status === 'cancelada' ? `<button class="btn btn-sm btn-ghost btn-icon" data-act="del" title="Eliminar">${icons.trash}</button>` : ''}
            </td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;

  // La tabla se vuelve a pintar en cada filtro, pero el contenedor es el mismo:
  // sin quitar el manejador anterior, un clic terminaría disparándose una vez
  // por cada búsqueda hecha en la sesión.
  if (root._rowClick) root.removeEventListener('click', root._rowClick);
  root._rowClick = async (e) => {
    const row = e.target.closest('tr[data-id]');
    if (!row) return;
    const id = +row.dataset.id;
    const btn = e.target.closest('[data-act]');
    if (!btn) { viewModal(id, page); return; }

    const act = btn.dataset.act;
    try {
      if (act === 'send') {
        await api.post(`/api/purchase-orders/${id}/status`, { status: 'enviada' });
        toast('Orden marcada como enviada');
        loadTable(page);
      } else if (act === 'receive') {
        const ok = await confirmDialog(
          'Al recibir la orden se sumará el stock de cada producto y se recalculará su costo (promedio ponderado). ¿Confirmar recepción?',
          { title: 'Recibir mercancía', okText: 'Recibir' });
        if (!ok) return;
        await api.post(`/api/purchase-orders/${id}/status`, { status: 'recibida' });
        toast('Mercancía recibida: stock y costos actualizados');
        loadTable(page);
      } else if (act === 'cancel') {
        const ok = await confirmDialog('¿Cancelar esta orden de compra?', { title: 'Cancelar orden', okText: 'Sí, cancelar', danger: true });
        if (!ok) return;
        await api.post(`/api/purchase-orders/${id}/status`, { status: 'cancelada' });
        toast('Orden cancelada');
        loadTable(page);
      } else if (act === 'del') {
        const ok = await confirmDialog('¿Eliminar esta orden definitivamente?', { title: 'Eliminar orden', okText: 'Eliminar', danger: true });
        if (!ok) return;
        await api.del(`/api/purchase-orders/${id}`);
        toast('Orden eliminada');
        loadTable(page);
      } else if (act === 'edit') {
        const o = await api.get(`/api/purchase-orders/${id}`);
        poModal(o, page);
      }
    } catch (err) { toastErr(err); }
  };
  root.addEventListener('click', root._rowClick);
}

async function viewModal(id, page) {
  let o;
  try { o = await api.get(`/api/purchase-orders/${id}`); } catch (err) { toastErr(err); return; }

  const m = openModal({
    title: `Orden ${o.po_number}`,
    size: 'modal-lg',
    body: `
      <div class="flex-between mb">
        <div>
          <div><b>${esc(o.supplier_name)}</b></div>
          <div class="muted" style="font-size:13px">
            Pedida: ${fmtDate(o.order_date)}
            ${o.expected_date ? ' · Esperada: ' + fmtDate(o.expected_date) : ''}
            ${o.received_date ? ' · Recibida: ' + fmtDate(o.received_date) : ''}
          </div>
        </div>
        ${statusBadge(o.status)}
      </div>
      <div class="table-wrap" style="border:1px solid var(--border); border-radius:10px">
        <table class="table">
          <thead><tr><th>Producto</th><th class="num">Cantidad</th><th class="num">Costo unit.</th><th class="num">Importe</th></tr></thead>
          <tbody>
            ${(o.items || []).map(it => `
              <tr>
                <td><div class="cell-main">${esc(it.product_name)}</div><div class="cell-sub mono">${esc(it.product_sku)}</div></td>
                <td class="num">${qty(it.qty)}</td>
                <td class="num">${money(it.unit_cost)}</td>
                <td class="num">${money(it.qty * it.unit_cost)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="pos-total-row grand" style="max-width:280px; margin-left:auto"><span>Total</span><span>${money(o.total)}</span></div>
      ${o.notes ? `<p class="muted" style="font-size:13px">Notas: ${esc(o.notes)}</p>` : ''}`,
    footer: `<button class="btn btn-outline" data-cancel>Cerrar</button>`,
  });
  m.el.querySelector('[data-cancel]').addEventListener('click', m.close);
}

// ── Crear / editar orden ────────────────────────────────

function poModal(existing, page) {
  let items = (existing?.items || []).map(it => ({
    product_id: it.product_id, name: it.product_name, sku: it.product_sku,
    qty: it.qty, unit_cost: it.unit_cost,
  }));

  const m = openModal({
    title: existing ? `Editar orden ${existing.po_number}` : 'Nueva orden de compra',
    size: 'modal-xl',
    body: `
      <div class="form-grid" style="grid-template-columns:2fr 1fr 1fr">
        <label class="field">Proveedor *
          <select class="input" id="po-sup">
            <option value="">— Selecciona —</option>
            ${suppliers.map(s => `<option value="${s.id}" ${existing?.supplier_id == s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
          </select>
        </label>
        <label class="field">Fecha de orden
          <input class="input" type="date" id="po-date" value="${existing?.order_date || today()}">
        </label>
        <label class="field">Fecha esperada
          <input class="input" type="date" id="po-expected" value="${existing?.expected_date || ''}">
        </label>
      </div>
      <hr class="sep">
      <label class="field">Agregar producto
        <input class="input" id="po-prod" placeholder="Busca por nombre, SKU o escanea…">
      </label>
      <div id="po-items" class="mt"></div>
      <label class="field mt">Notas
        <input class="input" id="po-notes" value="${esc(existing?.notes || '')}" placeholder="Opcional">
      </label>`,
    footer: `
      <button class="btn btn-outline" data-cancel>Cancelar</button>
      <button class="btn btn-primary" data-save>${existing ? 'Guardar cambios' : 'Crear orden'}</button>`,
  });

  const el = m.el;

  const renderItems = () => {
    const root = $('#po-items', el);
    if (!items.length) {
      root.innerHTML = '<p class="muted" style="font-size:13px">Aún no hay productos en la orden.</p>';
      return;
    }
    const total = items.reduce((a, it) => a + it.qty * it.unit_cost, 0);
    root.innerHTML = `
      <div class="table-wrap" style="border:1px solid var(--border); border-radius:10px">
        <table class="table">
          <thead><tr><th>Producto</th><th class="num">Cantidad</th><th class="num">Costo unit.</th><th class="num">Importe</th><th></th></tr></thead>
          <tbody>
            ${items.map((it, i) => `
              <tr data-i="${i}">
                <td><div class="cell-main">${esc(it.name)}</div><div class="cell-sub mono">${esc(it.sku)}</div></td>
                <td class="num"><input class="input qty-input" data-qty type="number" min="0.01" step="any" value="${it.qty}"></td>
                <td class="num"><input class="input price-input" data-cost type="number" min="0" step="0.01" value="${it.unit_cost}"></td>
                <td class="num cell-main" data-amount>${money(it.qty * it.unit_cost)}</td>
                <td class="actions-cell"><button class="btn btn-sm btn-ghost btn-icon" data-remove>${icons.x}</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="pos-total-row grand" style="max-width:280px; margin-left:auto"><span>Total</span><span id="po-total">${money(total)}</span></div>`;

    $$('tr[data-i]', root).forEach(row => {
      const i = +row.dataset.i;
      const refresh = () => {
        row.querySelector('[data-amount]').textContent = money(items[i].qty * items[i].unit_cost);
        const total = items.reduce((a, it) => a + it.qty * it.unit_cost, 0);
        $('#po-total', root).textContent = money(total);
      };
      row.querySelector('[data-qty]').addEventListener('input', (e) => { items[i].qty = +e.target.value || 0; refresh(); });
      row.querySelector('[data-cost]').addEventListener('input', (e) => { items[i].unit_cost = +e.target.value || 0; refresh(); });
      row.querySelector('[data-remove]').addEventListener('click', () => { items.splice(i, 1); renderItems(); });
    });
  };

  productPicker($('#po-prod', el), (p) => {
    const ex = items.find(it => it.product_id === p.id);
    if (ex) ex.qty += 1;
    else items.push({ product_id: p.id, name: p.name, sku: p.sku, qty: 1, unit_cost: p.cost });
    renderItems();
  });
  renderItems();

  el.querySelector('[data-cancel]').addEventListener('click', m.close);
  el.querySelector('[data-save]').addEventListener('click', async () => {
    const body = {
      supplier_id: +$('#po-sup', el).value || 0,
      order_date: $('#po-date', el).value,
      expected_date: $('#po-expected', el).value,
      notes: $('#po-notes', el).value,
      items: items.map(it => ({ product_id: it.product_id, qty: it.qty, unit_cost: it.unit_cost })),
    };
    try {
      if (existing) await api.put(`/api/purchase-orders/${existing.id}`, body);
      else await api.post('/api/purchase-orders', body);
      toast(existing ? 'Orden actualizada' : 'Orden creada');
      m.close();
      loadTable(page);
    } catch (err) { toastErr(err); }
  });
}
