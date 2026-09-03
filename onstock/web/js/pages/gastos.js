// Gastos operativos: alimentan el Estado de Resultados.
import { api } from '../api.js';
import {
  $, esc, money, fmtDate, icons, toast, toastErr,
  openModal, confirmDialog, expenseCatBadge, debounce, today, firstOfMonth,
} from '../ui.js';

let suppliers = [];
let filters = { q: '', category: '', from: firstOfMonth(), to: today() };

const CATS = [
  ['ventas', 'Gastos de venta'],
  ['administrativos', 'Gastos administrativos'],
  ['financieros', 'Gastos financieros'],
  ['otros', 'Otros gastos'],
];

export async function render(page) {
  suppliers = await api.get('/api/suppliers');

  page.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Gastos</h1>
        <div class="sub">Gastos operativos del negocio — se reflejan en el Estado de Resultados</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-new">${icons.plus} Nuevo gasto</button>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <div class="search-wrap">${icons.search}
          <input class="input" id="f-q" placeholder="Buscar descripción…" value="${esc(filters.q)}">
        </div>
        <select class="input" id="f-cat">
          <option value="">Todas las categorías</option>
          ${CATS.map(([v, l]) => `<option value="${v}" ${filters.category === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <input class="input" type="date" id="f-from" value="${filters.from}">
        <input class="input" type="date" id="f-to" value="${filters.to}">
        <div class="spacer"></div>
        <div id="total" class="muted" style="font-size:13px"></div>
      </div>
      <div id="exp-table"></div>
    </div>`;

  $('#f-q', page).addEventListener('input', debounce(() => { filters.q = $('#f-q', page).value; loadTable(page); }, 250));
  $('#f-cat', page).addEventListener('change', () => { filters.category = $('#f-cat', page).value; loadTable(page); });
  $('#f-from', page).addEventListener('change', () => { filters.from = $('#f-from', page).value; loadTable(page); });
  $('#f-to', page).addEventListener('change', () => { filters.to = $('#f-to', page).value; loadTable(page); });
  $('#btn-new', page).addEventListener('click', () => expenseModal(null, page));

  await loadTable(page);
}

async function loadTable(page) {
  const root = $('#exp-table', page);
  const p = new URLSearchParams();
  if (filters.q) p.set('q', filters.q);
  if (filters.category) p.set('category', filters.category);
  if (filters.from) p.set('from', filters.from);
  if (filters.to) p.set('to', filters.to);

  let list;
  try {
    list = await api.get('/api/expenses?' + p.toString());
  } catch (err) { toastErr(err); return; }

  const total = list.reduce((a, e) => a + e.amount, 0);
  $('#total', page).innerHTML =
    `${list.length} gasto${list.length === 1 ? '' : 's'} · Total: <b>${money(total)}</b>`;

  if (!list.length) {
    root.innerHTML = '<div class="empty-state"><b>Sin gastos en este período</b>Registra alquiler, planillas, energía, etc.</div>';
    return;
  }

  root.innerHTML = `
    <div class="table-wrap"><table class="table">
      <thead><tr>
        <th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Proveedor</th>
        <th class="num">Monto</th><th class="actions-cell"></th>
      </tr></thead>
      <tbody>
        ${list.map(e => `
          <tr data-id="${e.id}">
            <td class="nowrap">${fmtDate(e.expense_date)}</td>
            <td>${expenseCatBadge(e.category)}</td>
            <td>
              <div class="cell-main">${esc(e.description)}</div>
              ${e.notes ? `<div class="cell-sub">${esc(e.notes)}</div>` : ''}
            </td>
            <td>${esc(e.supplier_name) || '—'}</td>
            <td class="num cell-main">${money(e.amount)}</td>
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
  root._rowClick = async (ev) => {
    const btn = ev.target.closest('[data-act]');
    if (!btn) return;
    const id = +btn.closest('tr').dataset.id;
    const e = list.find(x => x.id === id);
    if (btn.dataset.act === 'edit') expenseModal(e, page);
    if (btn.dataset.act === 'del') {
      const ok = await confirmDialog(`¿Eliminar el gasto "${e.description}"?`,
        { title: 'Eliminar gasto', okText: 'Eliminar', danger: true });
      if (!ok) return;
      try {
        await api.del(`/api/expenses/${id}`);
        toast('Gasto eliminado');
        loadTable(page);
      } catch (err) { toastErr(err); }
    }
  };
  root.addEventListener('click', root._rowClick);
}

function expenseModal(e, page) {
  const isNew = !e;
  const m = openModal({
    title: isNew ? 'Nuevo gasto' : 'Editar gasto',
    body: `
      <div class="form-grid">
        <label class="field">Fecha
          <input class="input" type="date" id="e-date" value="${e?.expense_date || today()}">
        </label>
        <label class="field">Categoría
          <select class="input" id="e-cat">
            ${CATS.map(([v, l]) => `<option value="${v}" ${(e?.category || 'administrativos') === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
        <label class="field full">Descripción *
          <input class="input" id="e-desc" value="${esc(e?.description || '')}" placeholder="Ej: Alquiler del local — junio">
        </label>
        <label class="field">Monto *
          <input class="input" id="e-amount" type="number" min="0" step="0.01" value="${e?.amount ?? ''}">
        </label>
        <label class="field">Proveedor (opcional)
          <select class="input" id="e-sup">
            <option value="">—</option>
            ${suppliers.map(s => `<option value="${s.id}" ${e?.supplier_id == s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
          </select>
        </label>
        <label class="field full">Notas
          <input class="input" id="e-notes" value="${esc(e?.notes || '')}">
        </label>
      </div>`,
    footer: `
      <button class="btn btn-outline" data-cancel>Cancelar</button>
      <button class="btn btn-primary" data-save>${isNew ? 'Registrar gasto' : 'Guardar cambios'}</button>`,
  });

  const el = m.el;
  el.querySelector('[data-cancel]').addEventListener('click', m.close);
  el.querySelector('[data-save]').addEventListener('click', async () => {
    const body = {
      expense_date: $('#e-date', el).value,
      category: $('#e-cat', el).value,
      description: $('#e-desc', el).value.trim(),
      amount: +$('#e-amount', el).value || 0,
      supplier_id: $('#e-sup', el).value ? +$('#e-sup', el).value : null,
      notes: $('#e-notes', el).value,
    };
    if (!body.description) { $('#e-desc', el).classList.add('input-error'); return; }
    try {
      if (isNew) await api.post('/api/expenses', body);
      else await api.put(`/api/expenses/${e.id}`, body);
      toast(isNew ? 'Gasto registrado' : 'Cambios guardados');
      m.close();
      loadTable(page);
    } catch (err) { toastErr(err); }
  });
}
