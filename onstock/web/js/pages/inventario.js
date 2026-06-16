// Inventario: historial de movimientos (kardex) y ajustes manuales de stock.
import { api } from '../api.js';
import {
  $, esc, qty, money, fmtDate, icons, toast, toastErr,
  openModal, movementBadge, productPicker, debounce,
} from '../ui.js';

let filters = { product: null, type: '', from: '', to: '' };

export async function render(page) {
  page.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Inventario</h1>
        <div class="sub">Movimientos de stock: ventas, compras, entradas, salidas y ajustes</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-mov">${icons.plus} Nuevo movimiento</button>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <div class="search-wrap ac-host">${icons.search}
          <input class="input" id="f-prod" placeholder="Filtrar por producto…" value="${esc(filters.product?.name || '')}">
        </div>
        <select class="input" id="f-type">
          <option value="">Todos los tipos</option>
          <option value="venta" ${filters.type === 'venta' ? 'selected' : ''}>Ventas</option>
          <option value="compra" ${filters.type === 'compra' ? 'selected' : ''}>Compras</option>
          <option value="entrada" ${filters.type === 'entrada' ? 'selected' : ''}>Entradas</option>
          <option value="salida" ${filters.type === 'salida' ? 'selected' : ''}>Salidas</option>
          <option value="ajuste" ${filters.type === 'ajuste' ? 'selected' : ''}>Ajustes</option>
          <option value="anulacion" ${filters.type === 'anulacion' ? 'selected' : ''}>Anulaciones</option>
        </select>
        <input class="input" type="date" id="f-from" value="${filters.from}">
        <input class="input" type="date" id="f-to" value="${filters.to}">
        <button class="btn btn-ghost btn-sm" id="f-clear">Limpiar</button>
      </div>
      <div id="mov-table"></div>
    </div>`;

  const prodInput = $('#f-prod', page);
  productPicker(prodInput, (p) => {
    filters.product = p;
    prodInput.value = p.name;
    loadTable(page);
  }, { clearOnPick: false });
  prodInput.addEventListener('input', debounce(() => {
    if (!prodInput.value.trim() && filters.product) { filters.product = null; loadTable(page); }
  }, 300));

  $('#f-type', page).addEventListener('change', () => { filters.type = $('#f-type', page).value; loadTable(page); });
  $('#f-from', page).addEventListener('change', () => { filters.from = $('#f-from', page).value; loadTable(page); });
  $('#f-to', page).addEventListener('change', () => { filters.to = $('#f-to', page).value; loadTable(page); });
  $('#f-clear', page).addEventListener('click', () => {
    filters = { product: null, type: '', from: '', to: '' };
    render(page);
  });
  $('#btn-mov', page).addEventListener('click', () => movementModal(page));

  await loadTable(page);
}

async function loadTable(page) {
  const root = $('#mov-table', page);
  const p = new URLSearchParams();
  if (filters.product) p.set('product_id', filters.product.id);
  if (filters.type) p.set('type', filters.type);
  if (filters.from) p.set('from', filters.from);
  if (filters.to) p.set('to', filters.to);

  let movs;
  try {
    movs = await api.get('/api/movements?' + p.toString());
  } catch (err) { toastErr(err); return; }

  if (!movs.length) {
    root.innerHTML = '<div class="empty-state"><b>Sin movimientos</b>Los movimientos de stock aparecerán aquí.</div>';
    return;
  }

  root.innerHTML = `
    <div class="table-wrap"><table class="table">
      <thead><tr>
        <th>Fecha</th><th>Producto</th><th>Tipo</th>
        <th class="num">Cantidad</th><th class="num">Costo unit.</th>
        <th>Referencia</th><th>Notas</th>
      </tr></thead>
      <tbody>
        ${movs.map(mv => `
          <tr>
            <td class="nowrap">${fmtDate(mv.created_at)}</td>
            <td>
              <div class="cell-main">${esc(mv.product_name)}</div>
              <div class="cell-sub mono">${esc(mv.product_sku)}</div>
            </td>
            <td>${movementBadge(mv.type)}</td>
            <td class="num ${mv.qty < 0 ? 'text-red' : 'text-green'}" style="font-weight:700">
              ${mv.qty > 0 ? '+' : ''}${qty(mv.qty)}
            </td>
            <td class="num">${money(mv.unit_cost)}</td>
            <td class="mono">${esc(mv.reference)}</td>
            <td class="muted">${esc(mv.notes)}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function movementModal(page) {
  let product = null;
  const m = openModal({
    title: 'Nuevo movimiento de inventario',
    body: `
      <label class="field">Producto *
        <input class="input" id="mv-prod" placeholder="Busca por nombre, SKU o escanea el código…">
      </label>
      <div id="mv-info" class="muted" style="font-size:13px; margin:8px 0 14px"></div>
      <div class="form-grid">
        <label class="field">Tipo de movimiento
          <select class="input" id="mv-type">
            <option value="entrada">Entrada (suma al stock)</option>
            <option value="salida">Salida (merma, daño, uso interno)</option>
            <option value="ajuste">Ajuste (fijar stock contado)</option>
          </select>
        </label>
        <label class="field"><span id="mv-qty-label">Cantidad</span>
          <input class="input" id="mv-qty" type="number" min="0" step="any" placeholder="0">
        </label>
        <label class="field full">Notas / motivo
          <input class="input" id="mv-notes" placeholder="Ej: conteo físico, producto dañado…">
        </label>
      </div>`,
    footer: `
      <button class="btn btn-outline" data-cancel>Cancelar</button>
      <button class="btn btn-primary" data-save>Registrar movimiento</button>`,
  });

  const el = m.el;
  const info = $('#mv-info', el);
  productPicker($('#mv-prod', el), (p) => {
    product = p;
    $('#mv-prod', el).value = p.name;
    info.innerHTML = `Stock actual: <b>${qty(p.stock)}</b> · Costo: <b>${money(p.cost)}</b> · SKU <span class="mono">${esc(p.sku)}</span>`;
  }, { clearOnPick: false });

  $('#mv-type', el).addEventListener('change', () => {
    $('#mv-qty-label', el).textContent =
      $('#mv-type', el).value === 'ajuste' ? 'Stock contado (valor final)' : 'Cantidad';
  });

  el.querySelector('[data-cancel]').addEventListener('click', m.close);
  el.querySelector('[data-save]').addEventListener('click', async () => {
    if (!product) { toast('Selecciona un producto', 'error'); return; }
    const body = {
      product_id: product.id,
      type: $('#mv-type', el).value,
      qty: +$('#mv-qty', el).value,
      notes: $('#mv-notes', el).value,
    };
    try {
      await api.post('/api/movements', body);
      toast('Movimiento registrado');
      m.close();
      loadTable(page);
    } catch (err) { toastErr(err); }
  });
}
