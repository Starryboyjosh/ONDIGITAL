// Productos: catálogo con SKU, códigos de barras, categorías y etiquetas.
import { api } from '../api.js';
import {
  $, $$, esc, money, qty, num, icons, toast, toastErr,
  openModal, confirmDialog, debounce, download, state, margen,
} from '../ui.js';

let categories = [];
let suppliers = [];
let filters = { q: '', category_id: 0, supplier_id: 0, low_stock: false, inactive: false };
let selected = new Set();

export async function render(page) {
  [categories, suppliers] = await Promise.all([
    api.get('/api/categories'),
    api.get('/api/suppliers'),
  ]);
  selected = new Set();

  page.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Productos</h1>
        <div class="sub">Catálogo con SKU y código de barras</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" id="btn-cats">Categorías</button>
        <button class="btn btn-outline" id="btn-export">${icons.download} Excel</button>
        <button class="btn btn-outline" id="btn-labels">${icons.printer} Etiquetas<span id="sel-count"></span></button>
        <button class="btn btn-primary" id="btn-new">${icons.plus} Nuevo producto</button>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <div class="search-wrap">${icons.search}
          <input class="input" id="f-q" placeholder="Buscar por nombre, SKU o código…" value="${esc(filters.q)}">
        </div>
        <select class="input" id="f-cat">
          <option value="0">Todas las categorías</option>
          ${categories.map(c => `<option value="${c.id}" ${filters.category_id == c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>
        <select class="input" id="f-sup">
          <option value="0">Todos los proveedores</option>
          ${suppliers.map(s => `<option value="${s.id}" ${filters.supplier_id == s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
        </select>
        <label class="checkbox"><input type="checkbox" id="f-low" ${filters.low_stock ? 'checked' : ''}> Stock bajo</label>
        <label class="checkbox"><input type="checkbox" id="f-inactive" ${filters.inactive ? 'checked' : ''}> Ver inactivos</label>
      </div>
      <div id="product-table"></div>
    </div>`;

  $('#f-q', page).addEventListener('input', debounce(() => { filters.q = $('#f-q', page).value; loadTable(page); }, 250));
  $('#f-cat', page).addEventListener('change', () => { filters.category_id = +$('#f-cat', page).value; loadTable(page); });
  $('#f-sup', page).addEventListener('change', () => { filters.supplier_id = +$('#f-sup', page).value; loadTable(page); });
  $('#f-low', page).addEventListener('change', () => { filters.low_stock = $('#f-low', page).checked; loadTable(page); });
  $('#f-inactive', page).addEventListener('change', () => { filters.inactive = $('#f-inactive', page).checked; loadTable(page); });
  $('#btn-new', page).addEventListener('click', () => productModal(null, page));
  $('#btn-cats', page).addEventListener('click', () => categoriesModal(page));
  $('#btn-export', page).addEventListener('click', () => download('/api/reports/inventory/export'));
  $('#btn-labels', page).addEventListener('click', () => labelsModal());

  await loadTable(page);
}

function filterURL() {
  const p = new URLSearchParams();
  if (filters.q) p.set('q', filters.q);
  if (filters.category_id) p.set('category_id', filters.category_id);
  if (filters.supplier_id) p.set('supplier_id', filters.supplier_id);
  if (filters.low_stock) p.set('low_stock', '1');
  if (filters.inactive) p.set('inactive', '1');
  return '/api/products?' + p.toString();
}

async function loadTable(page) {
  const root = $('#product-table', page);
  let products;
  try {
    products = await api.get(filterURL());
  } catch (err) { toastErr(err); return; }

  if (!products.length) {
    root.innerHTML = `<div class="empty-state"><b>No hay productos</b>Crea el primero con "Nuevo producto".</div>`;
    return;
  }

  root.innerHTML = `
    <div class="table-wrap"><table class="table">
      <thead><tr>
        <th style="width:30px"><input type="checkbox" id="sel-all" aria-label="Seleccionar todos los productos de la lista"></th>
        <th>Producto</th><th>SKU</th><th>Categoría</th>
        <th class="num">Costo</th><th class="num">Precio</th><th class="num">Margen</th>
        <th class="num">Stock</th><th></th><th class="actions-cell"></th>
      </tr></thead>
      <tbody>
        ${products.map(p => {
          // Mismo cálculo que la ficha del producto: sobre el precio neto.
          const margin = margen(p.price, p.cost, p.isv_rate).pct;
          const low = p.stock <= p.min_stock;
          return `
          <tr data-id="${p.id}" class="${p.active ? '' : 'row-inactive'}">
            <td><input type="checkbox" class="sel-row" data-id="${p.id}" aria-label="Seleccionar ${esc(p.name)}" ${selected.has(p.id) ? 'checked' : ''}></td>
            <td>
              <div class="cell-main">${esc(p.name)}</div>
              <div class="cell-sub">${esc(p.supplier_name || '')}</div>
            </td>
            <td>
              <div class="mono">${esc(p.sku)}</div>
              ${p.barcode ? `<div class="cell-sub mono">${esc(p.barcode)}</div>` : ''}
            </td>
            <td>${esc(p.category_name || '—')}</td>
            <td class="num">${money(p.cost)}</td>
            <td class="num cell-main">${money(p.price)}</td>
            <td class="num ${margin < 0 ? 'text-red' : ''}">${num(margin)}%</td>
            <td class="num">
              <span class="badge ${low ? 'badge-red' : 'badge-green'} badge-plain">${qty(p.stock)}</span>
            </td>
            <td>${p.active ? '' : '<span class="badge badge-gray">Inactivo</span>'}</td>
            <td class="actions-cell">
              <button class="btn btn-sm btn-ghost btn-icon" data-act="barcode" title="Código de barras">${icons.barcode}</button>
              <button class="btn btn-sm btn-ghost btn-icon" data-act="edit" title="Editar">${icons.edit}</button>
              <button class="btn btn-sm btn-ghost btn-icon" data-act="del" title="Eliminar">${icons.trash}</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;

  // Sin esto las casillas parecían decorativas: se marcaban y no pasaba nada
  // visible hasta abrir el modal de etiquetas.
  const syncSel = () => {
    $$('.sel-row', root).forEach(cb => {
      cb.closest('tr').classList.toggle('is-selected', cb.checked);
    });
    const c = $('#sel-count', page);
    if (c) c.textContent = selected.size ? ` (${selected.size})` : '';
  };

  $('#sel-all', root).addEventListener('change', (e) => {
    $$('.sel-row', root).forEach(cb => {
      cb.checked = e.target.checked;
      const id = +cb.dataset.id;
      e.target.checked ? selected.add(id) : selected.delete(id);
    });
    syncSel();
  });
  $$('.sel-row', root).forEach(cb => cb.addEventListener('change', () => {
    const id = +cb.dataset.id;
    cb.checked ? selected.add(id) : selected.delete(id);
    syncSel();
  }));
  syncSel();

  // La tabla se vuelve a pintar en cada filtro, pero el contenedor es el mismo:
  // sin quitar el manejador anterior, un clic terminaría disparándose una vez
  // por cada búsqueda hecha en la sesión.
  if (root._rowClick) root.removeEventListener('click', root._rowClick);
  root._rowClick = async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = +btn.closest('tr').dataset.id;
    const p = products.find(x => x.id === id);
    if (btn.dataset.act === 'edit') productModal(p, page);
    if (btn.dataset.act === 'barcode') barcodeModal(p);
    if (btn.dataset.act === 'del') {
      const ok = await confirmDialog(
        `¿Eliminar el producto "${p.name}"? Si tiene historial —ventas, compras o `
        + 'movimientos de inventario— no se borra: se marca como inactivo y su kardex '
        + 'se conserva. Solo se borra del todo si nunca se movió.',
        { title: 'Eliminar producto', okText: 'Eliminar', danger: true });
      if (!ok) return;
      try {
        const r = await api.del(`/api/products/${id}`);
        toast(r && r.resultado === 'desactivado'
          ? 'El producto tiene historial: se marcó como inactivo y su kardex se conservó'
          : 'Producto eliminado');
        loadTable(page);
      } catch (err) { toastErr(err); }
    }
  };
  root.addEventListener('click', root._rowClick);
}

// ── Modal de producto ───────────────────────────────────

function productModal(p, page) {
  const isNew = !p;
  const inclISV = state.settings.prices_include_isv === '1';
  const m = openModal({
    title: isNew ? 'Nuevo producto' : `Editar — ${p.name}`,
    size: 'modal-lg',
    body: `
      <div class="form-grid">
        <label class="field full">Nombre *
          <input class="input" id="p-name" value="${esc(p?.name || '')}" placeholder="Ej: Aceite de motor 20W-50">
        </label>
        <label class="field">SKU
          <div class="input-group">
            <input class="input" id="p-sku" value="${esc(p?.sku || '')}" placeholder="Se genera automático">
            <button class="btn btn-sm btn-ghost btn-inset" id="p-sku-gen" title="Generar SKU">${icons.refresh}</button>
          </div>
        </label>
        <label class="field">Código de barras
          <input class="input" id="p-barcode" value="${esc(p?.barcode || '')}" placeholder="Escanea o escribe (opcional)">
        </label>
        <label class="field">Categoría
          <select class="input" id="p-cat">
            <option value="">— Sin categoría —</option>
            ${categories.map(c => `<option value="${c.id}" ${p?.category_id == c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </label>
        <label class="field">Proveedor
          <select class="input" id="p-sup">
            <option value="">— Sin proveedor —</option>
            ${suppliers.map(s => `<option value="${s.id}" ${p?.supplier_id == s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
          </select>
        </label>
        <label class="field">Costo (${esc(state.settings.currency_symbol || 'L')})
          <input class="input" id="p-cost" type="number" min="0" step="0.01" value="${p?.cost ?? ''}" placeholder="0.00">
        </label>
        <label class="field">Precio de venta ${inclISV ? '(ISV incluido)' : '(sin ISV)'}
          <input class="input" id="p-price" type="number" min="0" step="0.01" value="${p?.price ?? ''}" placeholder="0.00">
        </label>
        <label class="field">Tasa ISV
          <select class="input" id="p-isv">
            <option value="15" ${(p?.isv_rate ?? +state.settings.isv_rate_default) == 15 ? 'selected' : ''}>15% (general)</option>
            <option value="18" ${p?.isv_rate == 18 ? 'selected' : ''}>18% (alcohol/tabaco)</option>
            <option value="0" ${p?.isv_rate === 0 ? 'selected' : ''}>Exento (0%)</option>
          </select>
        </label>
        <label class="field">Margen estimado
          <input class="input" id="p-margin" disabled value="—">
        </label>
        ${isNew ? `
        <label class="field">Stock inicial
          <input class="input" id="p-stock" type="number" min="0" step="any" value="0">
        </label>` : ''}
        <label class="field">Stock mínimo (alerta)
          <input class="input" id="p-min" type="number" min="0" step="any" value="${p?.min_stock ?? 0}">
        </label>
        <label class="field full">Descripción
          <textarea class="input" id="p-desc" rows="2">${esc(p?.description || '')}</textarea>
        </label>
        ${!isNew ? `
        <label class="checkbox full"><input type="checkbox" id="p-active" ${p.active ? 'checked' : ''}> Producto activo</label>
        ` : ''}
      </div>
      ${!isNew ? '<p class="muted" style="font-size:12.5px; margin:12px 0 0">El stock se modifica desde <b>Inventario</b> (entradas, salidas y ajustes), no aquí.</p>' : ''}
    `,
    footer: `
      <button class="btn btn-outline" data-cancel>Cancelar</button>
      <button class="btn btn-primary" data-save>${isNew ? 'Crear producto' : 'Guardar cambios'}</button>`,
  });

  const el = m.el;
  const updateMargin = () => {
    const cost = +$('#p-cost', el).value || 0;
    const price = +$('#p-price', el).value || 0;
    const rate = +$('#p-isv', el).value || 0;
    const mEl = $('#p-margin', el);
    const m2 = margen(price, cost, rate);
    mEl.value = m2.neto > 0 ? `${num(m2.unidad)} por unidad (${num(m2.pct)}%)` : '—';
  };
  ['p-cost', 'p-price', 'p-isv'].forEach(id => $('#' + id, el).addEventListener('input', updateMargin));
  updateMargin();

  $('#p-sku-gen', el).addEventListener('click', async (e) => {
    e.preventDefault();
    const catID = $('#p-cat', el).value;
    try {
      const r = await api.get('/api/products/next-sku' + (catID ? `?category_id=${catID}` : ''));
      $('#p-sku', el).value = r.sku;
    } catch (err) { toastErr(err); }
  });

  el.querySelector('[data-cancel]').addEventListener('click', m.close);
  el.querySelector('[data-save]').addEventListener('click', async () => {
    const body = {
      name: $('#p-name', el).value.trim(),
      sku: $('#p-sku', el).value.trim(),
      barcode: $('#p-barcode', el).value.trim(),
      description: $('#p-desc', el).value,
      category_id: $('#p-cat', el).value ? +$('#p-cat', el).value : null,
      supplier_id: $('#p-sup', el).value ? +$('#p-sup', el).value : null,
      cost: +$('#p-cost', el).value || 0,
      price: +$('#p-price', el).value || 0,
      isv_rate: +$('#p-isv', el).value,
      min_stock: +$('#p-min', el).value || 0,
      active: isNew ? true : $('#p-active', el).checked,
    };
    if (isNew) body.stock = +$('#p-stock', el).value || 0;
    if (!body.name) { $('#p-name', el).classList.add('input-error'); return; }
    try {
      if (isNew) await api.post('/api/products', body);
      else await api.put(`/api/products/${p.id}`, body);
      toast(isNew ? 'Producto creado' : 'Cambios guardados');
      m.close();
      loadTable(page);
    } catch (err) { toastErr(err); }
  });
}

// ── Modal de código de barras ───────────────────────────

function barcodeModal(p) {
  const code = p.barcode || p.sku;
  const m = openModal({
    title: `Código de barras — ${p.name}`,
    body: `
      <div style="text-align:center">
        <img class="barcode-img" src="/api/barcode/${encodeURIComponent(code)}?w=320&h=90" alt="${esc(code)}">
        <div class="mono" style="margin-bottom:4px">${esc(code)}</div>
        <div class="cell-main" style="font-size:17px">${money(p.price)}</div>
        <p class="muted" style="font-size:12.5px">${p.barcode ? 'Usando el código de barras del producto.' : 'El producto no tiene código de barras propio; se usa el SKU.'}</p>
      </div>`,
    footer: `
      <button class="btn btn-outline" data-cancel>Cerrar</button>
      <button class="btn btn-primary" data-print>${icons.printer} Imprimir etiquetas</button>`,
  });
  m.el.querySelector('[data-cancel]').addEventListener('click', m.close);
  m.el.querySelector('[data-print]').addEventListener('click', () => {
    m.close();
    labelsModal([p.id]);
  });
}

// ── Modal de etiquetas ──────────────────────────────────

function labelsModal(ids = null) {
  const list = ids || [...selected];
  if (!list.length) {
    toast('Selecciona productos en la tabla (casillas de la izquierda) para imprimir etiquetas.', 'info', 4200);
    return;
  }
  const m = openModal({
    title: `Imprimir etiquetas (${list.length} producto${list.length > 1 ? 's' : ''})`,
    body: `
      <label class="field">Copias por producto
        <input class="input" id="lbl-copies" type="number" min="1" max="100" value="1">
      </label>
      <p class="muted" style="font-size:12.5px; margin-bottom:0">Se genera un PDF tamaño carta con etiquetas (3 columnas × 9 filas) con nombre, código de barras y precio.</p>`,
    footer: `
      <button class="btn btn-outline" data-cancel>Cancelar</button>
      <button class="btn btn-primary" data-go>${icons.printer} Generar PDF</button>`,
  });
  m.el.querySelector('[data-cancel]').addEventListener('click', m.close);
  m.el.querySelector('[data-go]').addEventListener('click', () => {
    const copies = +$('#lbl-copies', m.el).value || 1;
    download(`/api/labels/pdf?ids=${list.join(',')}&copies=${copies}`);
    m.close();
  });
}

// ── Modal de categorías ─────────────────────────────────

function categoriesModal(page) {
  const m = openModal({
    title: 'Categorías',
    body: `<div id="cat-list"></div>
      <hr class="sep">
      <div class="form-grid">
        <label class="field">Nueva categoría
          <input class="input" id="cat-name" placeholder="Ej: Lubricantes">
        </label>
        <label class="field">Prefijo SKU
          <input class="input" id="cat-prefix" placeholder="Ej: LUB" maxlength="6" style="text-transform:uppercase">
        </label>
      </div>`,
    footer: `
      <button class="btn btn-outline" data-cancel>Cerrar</button>
      <button class="btn btn-primary" data-add>${icons.plus} Agregar</button>`,
  });

  const renderList = () => {
    $('#cat-list', m.el).innerHTML = categories.length ? `
      <table class="table">
        <thead><tr><th>Nombre</th><th>Prefijo SKU</th><th class="actions-cell"></th></tr></thead>
        <tbody>${categories.map(c => `
          <tr data-id="${c.id}">
            <td class="cell-main">${esc(c.name)}</td>
            <td class="mono">${esc(c.prefix)}</td>
            <td class="actions-cell">
              <button class="btn btn-sm btn-ghost btn-icon" data-cat-del title="Eliminar">${icons.trash}</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<p class="muted">No hay categorías.</p>';
  };
  renderList();

  m.el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-cat-del]')) {
      const id = +e.target.closest('tr').dataset.id;
      const c = categories.find(x => x.id === id);
      const ok = await confirmDialog(`¿Eliminar la categoría "${c.name}"? Los productos quedarán sin categoría.`,
        { title: 'Eliminar categoría', okText: 'Eliminar', danger: true });
      if (!ok) return;
      try {
        await api.del(`/api/categories/${id}`);
        categories = await api.get('/api/categories');
        renderList();
        toast('Categoría eliminada');
      } catch (err) { toastErr(err); }
    }
  });

  m.el.querySelector('[data-cancel]').addEventListener('click', () => { m.close(); render(page); });
  m.el.querySelector('[data-add]').addEventListener('click', async () => {
    const name = $('#cat-name', m.el).value.trim();
    const prefix = $('#cat-prefix', m.el).value.trim().toUpperCase();
    if (!name) { $('#cat-name', m.el).classList.add('input-error'); return; }
    try {
      await api.post('/api/categories', { name, prefix });
      categories = await api.get('/api/categories');
      $('#cat-name', m.el).value = '';
      $('#cat-prefix', m.el).value = '';
      renderList();
      toast('Categoría creada');
    } catch (err) { toastErr(err); }
  });
}
