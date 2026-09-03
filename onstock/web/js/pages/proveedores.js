// Proveedores: directorio con RTN y datos de contacto.
import { api } from '../api.js';
import {
  $, esc, icons, toast, toastErr, openModal, confirmDialog, debounce,
} from '../ui.js';

let showInactive = false;

export async function render(page) {
  page.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Proveedores</h1>
        <div class="sub">Directorio de proveedores de la empresa</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-new">${icons.plus} Nuevo proveedor</button>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <div class="search-wrap">${icons.search}
          <input class="input" id="f-q" placeholder="Buscar proveedor…">
        </div>
        <label class="checkbox"><input type="checkbox" id="f-inactive" ${showInactive ? 'checked' : ''}> Ver inactivos</label>
      </div>
      <div id="sup-table"></div>
    </div>`;

  $('#btn-new', page).addEventListener('click', () => supplierModal(null, page));
  $('#f-q', page).addEventListener('input', debounce(() => loadTable(page), 200));
  $('#f-inactive', page).addEventListener('change', () => {
    showInactive = $('#f-inactive', page).checked;
    loadTable(page);
  });

  await loadTable(page);
}

async function loadTable(page) {
  const root = $('#sup-table', page);
  let list;
  try {
    list = await api.get('/api/suppliers' + (showInactive ? '?inactive=1' : ''));
  } catch (err) { toastErr(err); return; }

  const q = ($('#f-q', page).value || '').toLowerCase();
  if (q) {
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.rtn.toLowerCase().includes(q) ||
      s.contact_name.toLowerCase().includes(q));
  }

  if (!list.length) {
    root.innerHTML = '<div class="empty-state"><b>Sin proveedores</b>Agrega tu primer proveedor.</div>';
    return;
  }

  root.innerHTML = `
    <div class="table-wrap"><table class="table">
      <thead><tr>
        <th>Proveedor</th><th>RTN</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th></th><th class="actions-cell"></th>
      </tr></thead>
      <tbody>
        ${list.map(s => `
          <tr data-id="${s.id}" ${s.active ? '' : 'style="opacity:.55"'}>
            <td>
              <div class="cell-main">${esc(s.name)}</div>
              <div class="cell-sub">${esc(s.address)}</div>
            </td>
            <td class="mono">${esc(s.rtn) || '—'}</td>
            <td>${esc(s.contact_name) || '—'}</td>
            <td>${esc(s.phone) || '—'}</td>
            <td>${esc(s.email) || '—'}</td>
            <td>${s.active ? '' : '<span class="badge badge-gray">Inactivo</span>'}</td>
            <td class="actions-cell">
              <button class="btn btn-sm btn-ghost btn-icon" data-act="edit" title="Editar">${icons.edit}</button>
              <button class="btn btn-sm btn-ghost btn-icon" data-act="del" title="Eliminar">${icons.trash}</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;

  // La tabla se vuelve a pintar en cada filtro, pero el contenedor es el mismo:
  // sin quitar el manejador anterior, un clic terminaría disparándose una vez
  // por cada búsqueda hecha en la sesión.
  if (root._rowClick) root.removeEventListener('click', root._rowClick);
  root._rowClick = async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = +btn.closest('tr').dataset.id;
    const s = list.find(x => x.id === id);
    if (btn.dataset.act === 'edit') supplierModal(s, page);
    if (btn.dataset.act === 'del') {
      const ok = await confirmDialog(
        `¿Eliminar el proveedor "${s.name}"? Si tiene historial de compras o productos solo se desactivará.`,
        { title: 'Eliminar proveedor', okText: 'Eliminar', danger: true });
      if (!ok) return;
      try {
        await api.del(`/api/suppliers/${id}`);
        toast('Proveedor eliminado');
        loadTable(page);
      } catch (err) { toastErr(err); }
    }
  };
  root.addEventListener('click', root._rowClick);
}

function supplierModal(s, page) {
  const isNew = !s;
  const m = openModal({
    title: isNew ? 'Nuevo proveedor' : `Editar — ${s.name}`,
    size: 'modal-lg',
    body: `
      <div class="form-grid">
        <label class="field">Nombre / Razón social *
          <input class="input" id="s-name" value="${esc(s?.name || '')}">
        </label>
        <label class="field">RTN
          <input class="input" id="s-rtn" value="${esc(s?.rtn || '')}" placeholder="14 dígitos">
        </label>
        <label class="field">Persona de contacto
          <input class="input" id="s-contact" value="${esc(s?.contact_name || '')}">
        </label>
        <label class="field">Teléfono
          <input class="input" id="s-phone" value="${esc(s?.phone || '')}">
        </label>
        <label class="field">Email
          <input class="input" id="s-email" type="email" value="${esc(s?.email || '')}">
        </label>
        <label class="field">Dirección
          <input class="input" id="s-address" value="${esc(s?.address || '')}">
        </label>
        <label class="field full">Notas
          <textarea class="input" id="s-notes" rows="2">${esc(s?.notes || '')}</textarea>
        </label>
        ${!isNew ? `<label class="checkbox full"><input type="checkbox" id="s-active" ${s.active ? 'checked' : ''}> Proveedor activo</label>` : ''}
      </div>`,
    footer: `
      <button class="btn btn-outline" data-cancel>Cancelar</button>
      <button class="btn btn-primary" data-save>${isNew ? 'Crear proveedor' : 'Guardar cambios'}</button>`,
  });

  const el = m.el;
  el.querySelector('[data-cancel]').addEventListener('click', m.close);
  el.querySelector('[data-save]').addEventListener('click', async () => {
    const body = {
      name: $('#s-name', el).value.trim(),
      rtn: $('#s-rtn', el).value.trim(),
      contact_name: $('#s-contact', el).value.trim(),
      phone: $('#s-phone', el).value.trim(),
      email: $('#s-email', el).value.trim(),
      address: $('#s-address', el).value.trim(),
      notes: $('#s-notes', el).value,
      active: isNew ? true : $('#s-active', el).checked,
    };
    if (!body.name) { $('#s-name', el).classList.add('input-error'); return; }
    try {
      if (isNew) await api.post('/api/suppliers', body);
      else await api.put(`/api/suppliers/${s.id}`, body);
      toast(isNew ? 'Proveedor creado' : 'Cambios guardados');
      m.close();
      loadTable(page);
    } catch (err) { toastErr(err); }
  });
}
