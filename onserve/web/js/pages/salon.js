// Salón: mapa de mesas en vivo. Click en mesa libre abre comanda; en mesa ocupada va a su
// comanda. Arrastrar reubica la mesa (se guarda). Refresco automático cada 5 s.
import { api } from '../api.js';
import { $, $$, money, esc, icons, toast, toastErr, openModal, fmtTime, minutesSince } from '../ui.js';

let dragging = false;

export async function render(page) {
  page.innerHTML = `
    <div class="page-head">
      <div><h1>Salón</h1><div class="sub">Toca una mesa para abrir o continuar su comanda</div></div>
      <div class="page-actions">
        <a href="#/comanda/llevar" class="btn btn-outline" id="btn-llevar">${icons.receipt} Para llevar</a>
        <a href="#/cocina" class="btn btn-outline">${icons.flame} Cocina</a>
      </div>
    </div>
    <div class="floor-legend">
      <span class="lg-libre"><i></i> Libre</span>
      <span class="lg-ocupada"><i></i> Ocupada</span>
      <span class="lg-por_cobrar"><i></i> Por cobrar</span>
      <span class="lg-reservada"><i></i> Reservada</span>
    </div>
    <div id="floor"></div>`;

  // "Para llevar": el enlace no existe como ruta directa; lo manejamos abriendo una comanda sin mesa.
  $('#btn-llevar', page).addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const o = await api.post('/api/orders', { type: 'llevar', guests: 1 });
      location.hash = `#/comanda/${o.id}`;
    } catch (err) { toastErr(err); }
  });

  const draw = async () => {
    if (dragging) return;
    let floor;
    try { floor = await api.get('/api/floor'); }
    catch (err) { $('#floor', page).innerHTML = `<div class="empty-state">${esc(err.message)}</div>`; return; }
    renderFloor($('#floor', page), floor);
  };

  await draw();
  const timer = setInterval(draw, 5000);
  return () => clearInterval(timer);
}

function renderFloor(root, floor) {
  if (!floor.length) {
    root.innerHTML = '<div class="empty-state"><b>Sin mesas</b>Crea zonas y mesas para empezar.</div>';
    return;
  }
  root.innerHTML = floor.map(z => `
    <div class="zone-block">
      <div class="zone-head">
        <span class="zone-dot" style="background:${esc(z.zone.color || '#d8a24a')}"></span>
        <h2>${esc(z.zone.name)}</h2>
        <span class="muted">${z.tables.length} mesa${z.tables.length === 1 ? '' : 's'}</span>
      </div>
      <div class="floor-canvas" data-zone="${z.zone.id}">
        ${z.tables.map(t => tableChip(t)).join('')}
      </div>
    </div>`).join('');

  $$('.table-chip', root).forEach(chip => wireChip(chip, root));
}

function tableChip(t) {
  const shape = t.shape === 'round' ? 'shape-round' : '';
  const total = (t.status === 'ocupada' || t.status === 'por_cobrar')
    ? `<div class="tc-total">${money(t.order_total)}</div>` : '';
  const time = t.opened_at && (t.status === 'ocupada' || t.status === 'por_cobrar')
    ? `<div class="tc-time">${minutesSince(t.opened_at)} min</div>` : '';
  const reservedNote = t.status === 'reservada' && t.reserved_note
    ? `<div class="tc-time">${esc(t.reserved_note)}</div>` : '';
  return `
    <div class="table-chip st-${t.status} ${shape}" style="left:${t.pos_x}px; top:${t.pos_y}px"
         data-id="${t.id}" data-order="${t.order_id || ''}" data-status="${t.status}">
      <div class="tc-name">${esc(t.name)}</div>
      <div class="tc-seats">${icons.users} ${t.seats}</div>
      ${total}${time}${reservedNote}
    </div>`;
}

function wireChip(chip, root) {
  let startX, startY, origX, origY, moved = false;

  const onClick = () => {
    if (moved) return;
    const id = +chip.dataset.id;
    const orderId = chip.dataset.order;
    const status = chip.dataset.status;
    if (orderId) { location.hash = `#/comanda/${orderId}`; return; }
    openTableModal({ id, name: chip.querySelector('.tc-name').textContent, status });
  };

  chip.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    startX = e.clientX; startY = e.clientY;
    origX = parseFloat(chip.style.left) || 0;
    origY = parseFloat(chip.style.top) || 0;
    moved = false;
    const canvas = chip.closest('.floor-canvas');

    const onMove = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) { moved = true; dragging = true; chip.style.zIndex = 50; }
      if (!moved) return;
      const rect = canvas.getBoundingClientRect();
      let nx = Math.max(0, Math.min(origX + dx, rect.width - chip.offsetWidth));
      let ny = Math.max(0, Math.min(origY + dy, rect.height - chip.offsetHeight));
      chip.style.left = nx + 'px';
      chip.style.top = ny + 'px';
    };
    const onUp = async () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      chip.style.zIndex = '';
      if (moved) {
        const id = +chip.dataset.id;
        try {
          await api.put(`/api/tables/${id}/position`, {
            pos_x: parseFloat(chip.style.left) || 0,
            pos_y: parseFloat(chip.style.top) || 0,
          });
        } catch (err) { toastErr(err); }
        setTimeout(() => { dragging = false; }, 60);
      }
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });

  chip.addEventListener('click', onClick);
}

function openTableModal({ id, name, status }) {
  const isReserved = status === 'reservada';
  const m = openModal({
    title: `Mesa ${name}`,
    body: `
      <div class="form-grid">
        <label class="field">Comensales
          <input class="input" id="t-guests" type="number" min="1" value="2"></label>
        <label class="field">Mesero
          <input class="input" id="t-waiter" placeholder="Nombre"></label>
        <label class="field full">Nota de reserva (opcional)
          <input class="input" id="t-resnote" placeholder="Reserva 8:00pm — Familia López" value="${esc(isReserved ? '' : '')}"></label>
      </div>`,
    footer: `
      ${isReserved ? '<button class="btn btn-outline" data-free>Quitar reserva</button>' : '<button class="btn btn-outline" data-reserve>Reservar</button>'}
      <button class="btn btn-primary" data-open>${icons.receipt} Abrir comanda</button>`,
  });

  m.el.querySelector('[data-open]').addEventListener('click', async () => {
    const guests = +m.el.querySelector('#t-guests').value || 1;
    const waiter = m.el.querySelector('#t-waiter').value.trim();
    try {
      const o = await api.post('/api/orders', { table_id: id, guests, waiter });
      m.close();
      location.hash = `#/comanda/${o.id}`;
    } catch (err) { toastErr(err); }
  });

  const reserveBtn = m.el.querySelector('[data-reserve]');
  if (reserveBtn) reserveBtn.addEventListener('click', async () => {
    const note = m.el.querySelector('#t-resnote').value.trim();
    try { await api.post(`/api/tables/${id}/reserve`, { reserved: true, reserved_note: note }); m.close(); toast('Mesa reservada'); }
    catch (err) { toastErr(err); }
  });
  const freeBtn = m.el.querySelector('[data-free]');
  if (freeBtn) freeBtn.addEventListener('click', async () => {
    try { await api.post(`/api/tables/${id}/reserve`, { reserved: false, reserved_note: '' }); m.close(); toast('Reserva quitada'); }
    catch (err) { toastErr(err); }
  });
}
