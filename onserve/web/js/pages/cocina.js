// Cocina (KDS): tickets enviados en tiempo real. El cocinero marca cada platillo
// "en preparación", "listo" y "servido". Se refresca solo cada 5 s.
import { api } from '../api.js';
import { $, $$, esc, qty, icons, toastErr } from '../ui.js';

let station = '';

export async function render(page) {
  page.innerHTML = `
    <div class="page-head">
      <div><h1>Cocina</h1><div class="sub">Comandas enviadas · se actualiza automáticamente</div></div>
      <div class="page-actions">
        <div class="cat-tabs" id="st-tabs">
          <button class="cat-tab ${station === '' ? 'active' : ''}" data-st="">Todas</button>
          <button class="cat-tab ${station === 'cocina' ? 'active' : ''}" data-st="cocina">Cocina</button>
          <button class="cat-tab ${station === 'barra' ? 'active' : ''}" data-st="barra">Barra</button>
        </div>
      </div>
    </div>
    <div id="kds"></div>`;

  $$('#st-tabs .cat-tab', page).forEach(b => b.addEventListener('click', () => {
    station = b.dataset.st;
    $$('#st-tabs .cat-tab', page).forEach(x => x.classList.toggle('active', x === b));
    draw();
  }));

  async function draw() {
    let tickets;
    try { tickets = await api.get('/api/kitchen' + (station ? `?station=${station}` : '')); }
    catch (err) { $('#kds', page).innerHTML = `<div class="empty-state">${esc(err.message)}</div>`; return; }
    renderKDS($('#kds', page), tickets);
  }

  await draw();
  const timer = setInterval(draw, 5000);
  return () => clearInterval(timer);
}

function renderKDS(root, tickets) {
  if (!tickets.length) {
    root.innerHTML = '<div class="kds-empty"><b style="display:block; font-size:16px; margin-bottom:4px">Sin pendientes</b>No hay platillos en preparación.</div>';
    return;
  }
  // Agrupar por comanda.
  const groups = new Map();
  for (const t of tickets) {
    if (!groups.has(t.order_id)) groups.set(t.order_id, { order_number: t.order_number, table: t.table_name, items: [], wait: 0 });
    const g = groups.get(t.order_id);
    g.items.push(t);
    if (t.wait_minutes > g.wait) g.wait = t.wait_minutes;
  }

  root.className = 'kds-grid';
  root.innerHTML = [...groups.values()].map(g => {
    const ageCls = g.wait >= 20 ? 'age-late' : (g.wait >= 10 ? 'age-warn' : '');
    const timeCls = g.wait >= 20 ? 'late' : (g.wait >= 10 ? 'warn' : '');
    const allReady = g.items.every(i => i.kitchen_status === 'listo');
    return `
      <div class="kds-ticket ${ageCls} ${allReady ? 'done' : ''}">
        <div class="kds-head">
          <span class="k-table">${esc(g.table || g.order_number)}</span>
          <span class="k-time ${timeCls}">${icons.clock} ${g.wait} min</span>
        </div>
        ${g.items.map(it => kdsLine(it)).join('')}
      </div>`;
  }).join('');

  $$('[data-advance]', root).forEach(btn => btn.addEventListener('click', async () => {
    btn.disabled = true;
    try { await api.post(`/api/kitchen/items/${btn.dataset.item}/status`, { kitchen_status: btn.dataset.advance }); }
    catch (err) { toastErr(err); btn.disabled = false; return; }
    // refrescar de inmediato
    const station2 = station;
    const tickets = await api.get('/api/kitchen' + (station2 ? `?station=${station2}` : ''));
    renderKDS(root, tickets);
  }));
}

function kdsLine(it) {
  let actions = '';
  if (it.kitchen_status === 'pendiente') {
    actions = `<button class="btn btn-sm btn-outline" data-item="${it.item_id}" data-advance="en_preparacion">Preparar</button>
               <button class="btn btn-sm btn-green" data-item="${it.item_id}" data-advance="listo">Listo</button>`;
  } else if (it.kitchen_status === 'en_preparacion') {
    actions = `<button class="btn btn-sm btn-green" data-item="${it.item_id}" data-advance="listo">Listo</button>`;
  } else if (it.kitchen_status === 'listo') {
    actions = `<button class="btn btn-sm btn-primary" data-item="${it.item_id}" data-advance="servido">${icons.check} Servir</button>`;
  }
  const statusTag = it.kitchen_status === 'listo' ? '<span class="badge badge-green" style="margin-left:6px">Listo</span>'
    : (it.kitchen_status === 'en_preparacion' ? '<span class="badge badge-blue" style="margin-left:6px">Preparando</span>' : '');
  return `
    <div class="kds-line">
      <span class="k-qty">${qty(it.qty)}×</span>
      <div>
        <div class="k-name">${esc(it.name)}${statusTag}</div>
        ${it.notes ? `<div class="k-note">${esc(it.notes)}</div>` : ''}
      </div>
      <div class="k-actions">${actions}</div>
    </div>`;
}
