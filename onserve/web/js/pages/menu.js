// Menú: categorías y platillos. Crear/editar/eliminar y marcar "se acabó" (86).
import { api } from '../api.js';
import { $, $$, money, esc, icons, toast, toastErr, openModal, confirmDialog } from '../ui.js';

export async function render(page) {
  const [cats, items] = await Promise.all([
    api.get('/api/menu-categories'),
    api.get('/api/menu-items'),
  ]);
  const catName = (id) => (cats.find(c => c.id === id) || {}).name || '—';

  page.innerHTML = `
    <div class="page-head">
      <div><h1>Menú</h1><div class="sub">${items.length} platillo${items.length === 1 ? '' : 's'} · ${cats.length} categoría${cats.length === 1 ? '' : 's'}</div></div>
      <div class="page-actions">
        <button class="btn btn-outline" id="b-cat">${icons.plus} Categoría</button>
        <button class="btn btn-primary" id="b-item">${icons.plus} Platillo</button>
      </div>
    </div>

    <div class="card mb">
      <h2>Categorías</h2>
      <div class="card-pad">
        <div class="cat-tabs">
          ${cats.length ? cats.map(c => `
            <span class="cat-tab" style="cursor:default">
              ${esc(c.name)} <small class="muted">(${esc(c.station)})</small>
              <button class="btn btn-sm btn-ghost btn-icon" data-edit-cat="${c.id}" title="Editar">${icons.edit}</button>
              <button class="btn btn-sm btn-ghost btn-icon" data-del-cat="${c.id}" title="Eliminar">${icons.x}</button>
            </span>`).join('') : '<span class="muted">Sin categorías.</span>'}
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Platillos</h2>
      ${items.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Platillo</th><th>Categoría</th><th>Estación</th><th class="num">Precio</th><th class="num">ISV</th><th>Disponible</th><th></th></tr></thead>
          <tbody>
            ${items.map(it => `
              <tr>
                <td><div class="cell-main">${esc(it.name)}</div><div class="cell-sub mono">${esc(it.code || '')}</div></td>
                <td>${esc(catName(it.category_id))}</td>
                <td>${esc(it.station || '—')}</td>
                <td class="num">${money(it.price)}</td>
                <td class="num">${it.isv_rate}%</td>
                <td><button class="btn btn-sm ${it.available ? 'btn-green' : 'btn-outline'}" data-avail="${it.id}" data-on="${it.available ? 1 : 0}">${it.available ? 'Sí' : 'Se acabó'}</button></td>
                <td class="actions-cell">
                  <button class="btn btn-sm btn-ghost btn-icon" data-edit="${it.id}">${icons.edit}</button>
                  <button class="btn btn-sm btn-ghost btn-icon" data-del="${it.id}">${icons.trash}</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table></div>` : '<div class="empty-state"><b>Sin platillos</b>Agrega el primer platillo del menú.</div>'}
    </div>`;

  $('#b-item', page).addEventListener('click', () => itemModal(null, cats, page));
  $('#b-cat', page).addEventListener('click', () => catModal(null, page));
  $$('[data-edit]', page).forEach(b => b.addEventListener('click', () => itemModal(items.find(i => i.id === +b.dataset.edit), cats, page)));
  $$('[data-del]', page).forEach(b => b.addEventListener('click', async () => {
    const ok = await confirmDialog('¿Eliminar este platillo? Las comandas anteriores conservan su registro.', { title: 'Eliminar platillo', okText: 'Eliminar', danger: true });
    if (!ok) return;
    try { await api.del(`/api/menu-items/${b.dataset.del}`); render(page); } catch (err) { toastErr(err); }
  }));
  $$('[data-avail]', page).forEach(b => b.addEventListener('click', async () => {
    try { await api.post(`/api/menu-items/${b.dataset.avail}/available`, { available: b.dataset.on !== '1' }); render(page); }
    catch (err) { toastErr(err); }
  }));
  $$('[data-edit-cat]', page).forEach(b => b.addEventListener('click', () => catModal(cats.find(c => c.id === +b.dataset.editCat), page)));
  $$('[data-del-cat]', page).forEach(b => b.addEventListener('click', async () => {
    const ok = await confirmDialog('¿Eliminar esta categoría? Los platillos quedarán sin categoría.', { title: 'Eliminar categoría', okText: 'Eliminar', danger: true });
    if (!ok) return;
    try { await api.del(`/api/menu-categories/${b.dataset.delCat}`); render(page); } catch (err) { toastErr(err); }
  }));
}

function itemModal(item, cats, page) {
  const it = item || { name: '', code: '', category_id: cats[0] ? cats[0].id : null, price: 0, isv_rate: 15, cost: 0, station: '', available: true, active: true };
  const m = openModal({
    title: item ? `Editar ${item.name}` : 'Nuevo platillo',
    size: 'modal-lg',
    body: `
      <div class="form-grid">
        <label class="field full">Nombre
          <input class="input" id="i-name" value="${esc(it.name)}"></label>
        <label class="field">Código (opcional)
          <input class="input" id="i-code" value="${esc(it.code)}" placeholder="FUE-01"></label>
        <label class="field">Categoría
          <select class="input" id="i-cat">${cats.map(c => `<option value="${c.id}" ${c.id === it.category_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
        <label class="field">Precio de menú (con ISV)
          <input class="input" id="i-price" type="number" min="0" step="0.01" value="${it.price}"></label>
        <label class="field">ISV (%)
          <select class="input" id="i-isv">
            <option value="15" ${it.isv_rate == 15 ? 'selected' : ''}>15%</option>
            <option value="18" ${it.isv_rate == 18 ? 'selected' : ''}>18%</option>
            <option value="0" ${it.isv_rate == 0 ? 'selected' : ''}>Exento (0%)</option>
          </select></label>
        <label class="field">Costo (food cost)
          <input class="input" id="i-cost" type="number" min="0" step="0.01" value="${it.cost}"></label>
        <label class="field">Estación
          <select class="input" id="i-station">
            <option value="" ${!it.station ? 'selected' : ''}>(según categoría)</option>
            <option value="cocina" ${it.station === 'cocina' ? 'selected' : ''}>Cocina</option>
            <option value="barra" ${it.station === 'barra' ? 'selected' : ''}>Barra</option>
          </select></label>
        <label class="field full">Descripción (opcional)
          <input class="input" id="i-desc" value="${esc(it.description || '')}"></label>
      </div>`,
    footer: `<button class="btn btn-outline" data-cancel>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>`,
  });
  m.el.querySelector('[data-cancel]').addEventListener('click', () => m.close());
  m.el.querySelector('[data-save]').addEventListener('click', async () => {
    const body = {
      name: m.el.querySelector('#i-name').value.trim(),
      code: m.el.querySelector('#i-code').value.trim(),
      category_id: +m.el.querySelector('#i-cat').value || null,
      price: +m.el.querySelector('#i-price').value || 0,
      isv_rate: +m.el.querySelector('#i-isv').value,
      cost: +m.el.querySelector('#i-cost').value || 0,
      station: m.el.querySelector('#i-station').value,
      description: m.el.querySelector('#i-desc').value.trim(),
      available: item ? item.available : true,
      active: true,
    };
    if (!body.name) { toast('El nombre es obligatorio', 'error'); return; }
    try {
      if (item) await api.put(`/api/menu-items/${item.id}`, body);
      else await api.post('/api/menu-items', body);
      m.close(); toast('Platillo guardado'); render(page);
    } catch (err) { toastErr(err); }
  });
}

function catModal(cat, page) {
  const c = cat || { name: '', station: 'cocina', sort: 0, color: '' };
  const m = openModal({
    title: cat ? `Editar ${cat.name}` : 'Nueva categoría',
    body: `
      <div class="form-grid">
        <label class="field full">Nombre
          <input class="input" id="c-name" value="${esc(c.name)}" placeholder="Entradas, Bebidas…"></label>
        <label class="field">Estación
          <select class="input" id="c-station">
            <option value="cocina" ${c.station === 'cocina' ? 'selected' : ''}>Cocina</option>
            <option value="barra" ${c.station === 'barra' ? 'selected' : ''}>Barra</option>
          </select></label>
        <label class="field">Orden
          <input class="input" id="c-sort" type="number" value="${c.sort || 0}"></label>
      </div>`,
    footer: `<button class="btn btn-outline" data-cancel>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>`,
  });
  m.el.querySelector('[data-cancel]').addEventListener('click', () => m.close());
  m.el.querySelector('[data-save]').addEventListener('click', async () => {
    const body = { name: m.el.querySelector('#c-name').value.trim(), station: m.el.querySelector('#c-station').value, sort: +m.el.querySelector('#c-sort').value || 0, color: c.color };
    if (!body.name) { toast('El nombre es obligatorio', 'error'); return; }
    try {
      if (cat) await api.put(`/api/menu-categories/${cat.id}`, body);
      else await api.post('/api/menu-categories', body);
      m.close(); toast('Categoría guardada'); render(page);
    } catch (err) { toastErr(err); }
  });
}
