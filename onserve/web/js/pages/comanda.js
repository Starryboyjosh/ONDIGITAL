// Comanda: pedido por mesa. Menú a la izquierda, cuenta a la derecha. Permite agregar
// platillos, enviarlos a cocina, dividir el pago y cobrar con propina (no gravable).
import { api } from '../api.js';
import {
  $, $$, money, qty, esc, icons, toast, toastErr, openModal, confirmDialog,
  COURSES, courseLabel, kitchenStatusBadge, orderStatusBadge, openPrint, state, fmtTime,
} from '../ui.js';

function inferCourse(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('entrada')) return 'entrada';
  if (n.includes('bebida') || n.includes('barra') || n.includes('refresco')) return 'bebida';
  if (n.includes('postre')) return 'postre';
  return 'fuerte';
}

export async function render(page, params) {
  const orderId = +params[0];
  let order = await api.get(`/api/orders/${orderId}`);
  const menuView = await api.get('/api/menu');

  // Aplana el menú con el curso inferido por categoría.
  const cats = menuView.map(z => ({ id: z.category.id, name: z.category.name, course: inferCourse(z.category.name) }));
  const dishes = [];
  menuView.forEach(z => {
    const course = inferCourse(z.category.name);
    z.items.forEach(it => dishes.push({ ...it, course, catId: z.category.id }));
  });
  let activeCat = cats.length ? cats[0].id : 0;

  page.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Comanda ${esc(order.order_number)}</h1>
        <div class="sub" id="cmd-sub"></div>
      </div>
      <div class="page-actions">
        <a href="#/salon" class="btn btn-outline">${icons.back} Salón</a>
      </div>
    </div>
    <div class="comanda-grid">
      <div>
        <div class="cat-tabs" id="cat-tabs"></div>
        <div class="dish-grid" id="dish-grid"></div>
      </div>
      <div class="card ticket">
        <div class="ticket-head">
          <div class="t-title" id="t-title"></div>
          <div class="muted" id="t-meta" style="font-size:12.5px; margin-top:2px"></div>
        </div>
        <div class="ticket-body" id="ticket-body"></div>
        <div class="ticket-foot" id="ticket-foot"></div>
      </div>
    </div>`;

  function renderTabs() {
    $('#cat-tabs', page).innerHTML = cats.map(c =>
      `<button class="cat-tab ${c.id === activeCat ? 'active' : ''}" data-cat="${c.id}">${esc(c.name)}</button>`).join('');
    $$('#cat-tabs .cat-tab', page).forEach(b => b.addEventListener('click', () => { activeCat = +b.dataset.cat; renderTabs(); renderDishes(); }));
  }

  function renderDishes() {
    const list = dishes.filter(d => d.catId === activeCat);
    $('#dish-grid', page).innerHTML = list.length ? list.map(d => `
      <div class="dish-card ${d.available ? '' : 'unavailable'}" data-dish="${d.id}">
        <div class="dish-name">${esc(d.name)}</div>
        <div class="dish-station">${esc(d.station || '')}</div>
        <div class="dish-price">${money(d.price)}</div>
      </div>`).join('') : '<div class="empty-state">Sin platillos en esta categoría.</div>';
    $$('#dish-grid .dish-card', page).forEach(card => card.addEventListener('click', () => {
      const d = dishes.find(x => x.id === +card.dataset.dish);
      if (!d) return;
      if (!d.available) { toast(`"${d.name}" no está disponible`, 'error'); return; }
      addDish(d);
    }));
  }

  async function addDish(d) {
    try { order = await api.post(`/api/orders/${orderId}/items`, { menu_item_id: d.id, qty: 1, course: d.course }); renderTicket(); }
    catch (err) { toastErr(err); }
  }

  async function mutateItem(itemId, body) {
    try { order = await api.put(`/api/orders/${orderId}/items/${itemId}`, body); renderTicket(); }
    catch (err) { toastErr(err); }
  }

  async function removeItem(itemId) {
    try { order = await api.del(`/api/orders/${orderId}/items/${itemId}`); renderTicket(); }
    catch (err) { toastErr(err); }
  }

  function editable() { return order.status === 'abierta' || order.status === 'por_cobrar'; }

  function renderTicket() {
    const tableLabel = order.table_name ? `Mesa ${esc(order.table_name)}` : 'Para llevar';
    $('#cmd-sub', page).innerHTML = `${tableLabel} · ${order.guests} comensal${order.guests === 1 ? '' : 'es'} ${order.waiter ? '· ' + esc(order.waiter) : ''} · ${orderStatusBadge(order.status)}`;
    $('#t-title', page).textContent = tableLabel;
    $('#t-meta', page).innerHTML = `${order.items.length} línea${order.items.length === 1 ? '' : 's'} · abierta ${fmtTime(order.opened_at)}`;

    const body = $('#ticket-body', page);
    if (!order.items.length) {
      body.innerHTML = '<div class="empty-state" style="padding:30px 16px"><b>Comanda vacía</b>Toca un platillo del menú para agregarlo.</div>';
    } else {
      let html = '';
      for (const [key, label] of COURSES) {
        const lines = order.items.filter(i => i.course === key);
        if (!lines.length) continue;
        html += `<div class="course-head">${esc(label)}</div>`;
        html += lines.map(it => {
          const sent = it.sent_at
            ? `<span class="tl-fire sent">✓ ${it.kitchen_status === 'servido' ? 'servido' : (it.kitchen_status === 'listo' ? 'listo' : 'en cocina')}</span>`
            : '<span class="tl-fire pend">por enviar</span>';
          return `
            <div class="ticket-line" data-item="${it.id}">
              <div class="tl-qty">${qty(it.qty)}×</div>
              <div class="tl-main">
                <div class="tl-name">${esc(it.name)}</div>
                ${it.notes ? `<div class="tl-note">${esc(it.notes)}</div>` : ''}
                ${sent}
              </div>
              <div class="tl-amount">${money(it.unit_price * it.qty)}</div>
              ${editable() ? `<div style="display:flex; gap:3px; margin-left:6px">
                <button class="btn btn-sm btn-ghost btn-icon" data-dec title="Quitar uno">−</button>
                <button class="btn btn-sm btn-ghost btn-icon" data-inc title="Agregar uno">+</button>
                <button class="btn btn-sm btn-ghost btn-icon" data-note title="Nota">${icons.edit}</button>
                <button class="btn btn-sm btn-ghost btn-icon" data-del title="Eliminar">${icons.x}</button>
              </div>` : ''}
            </div>`;
        }).join('');
      }
      body.innerHTML = html;
      $$('.ticket-line', body).forEach(row => {
        const id = +row.dataset.item;
        const it = order.items.find(x => x.id === id);
        row.querySelector('[data-inc]')?.addEventListener('click', () => mutateItem(id, { qty: it.qty + 1 }));
        row.querySelector('[data-dec]')?.addEventListener('click', () => mutateItem(id, { qty: it.qty - 1 }));
        row.querySelector('[data-del]')?.addEventListener('click', () => removeItem(id));
        row.querySelector('[data-note]')?.addEventListener('click', () => noteModal(it));
      });
    }

    renderFoot();
  }

  function noteModal(it) {
    const m = openModal({
      title: `Nota — ${it.name}`,
      body: `<label class="field full">Indicación para la cocina
        <input class="input" id="n-note" value="${esc(it.notes)}" placeholder="Sin cebolla, término medio…"></label>`,
      footer: `<button class="btn btn-outline" data-close2>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button>`,
    });
    m.el.querySelector('[data-close2]').addEventListener('click', () => m.close());
    m.el.querySelector('[data-save]').addEventListener('click', async () => { await mutateItem(it.id, { notes: m.el.querySelector('#n-note').value }); m.close(); });
  }

  function renderFoot() {
    const foot = $('#ticket-foot', page);
    if (order.status === 'pagada') {
      foot.innerHTML = `
        <div class="pos-total-row grand"><span>Pagada</span><span>${money(order.total + order.tip)}</span></div>
        <button class="btn btn-outline" style="width:100%; margin-top:10px" id="b-print">${icons.printer} Imprimir cuenta</button>`;
      $('#b-print', foot).addEventListener('click', () => openPrint(`/api/orders/${orderId}/receipt`));
      return;
    }
    if (order.status === 'anulada') {
      foot.innerHTML = `<div class="pos-total-row grand"><span>Anulada</span><span>—</span></div>`;
      return;
    }
    const unsent = order.items.some(i => !i.sent_at);
    foot.innerHTML = `
      <div class="pos-total-row"><span>Subtotal (sin ISV)</span><span>${money(order.subtotal)}</span></div>
      <div class="pos-total-row"><span>ISV</span><span>${money(order.isv)}</span></div>
      <div class="pos-total-row grand"><span>Total</span><span>${money(order.total)}</span></div>
      <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px">
        <button class="btn ${unsent ? 'btn-primary' : 'btn-outline'}" id="b-fire" ${order.items.length ? '' : 'disabled'}>${icons.send} Enviar a cocina${unsent ? '' : ' (todo enviado)'}</button>
        <button class="btn btn-green" id="b-pay" ${order.items.length ? '' : 'disabled'}>${icons.cash} Cobrar</button>
        <div style="display:flex; gap:8px">
          <button class="btn btn-outline" style="flex:1" id="b-print">${icons.printer} Cuenta</button>
          <button class="btn btn-ghost" style="flex:1" id="b-void">${icons.ban} Anular</button>
        </div>
      </div>`;
    $('#b-fire', foot).addEventListener('click', fire);
    $('#b-pay', foot).addEventListener('click', payModal);
    $('#b-print', foot).addEventListener('click', () => openPrint(`/api/orders/${orderId}/receipt`));
    $('#b-void', foot).addEventListener('click', voidOrder);
  }

  async function fire() {
    try { order = await api.post(`/api/orders/${orderId}/fire`, {}); toast('Enviado a cocina'); renderTicket(); }
    catch (err) { toastErr(err); }
  }

  async function voidOrder() {
    const ok = await confirmDialog('¿Anular esta comanda? Se liberará la mesa y no contará en los reportes.', { title: 'Anular comanda', okText: 'Anular', danger: true });
    if (!ok) return;
    try { await api.post(`/api/orders/${orderId}/void`, {}); toast('Comanda anulada'); location.hash = '#/salon'; }
    catch (err) { toastErr(err); }
  }

  function payModal() {
    const tipRate = parseFloat(state.settings.tip_suggest_rate) || 0;
    let discount = 0;
    let tip = 0;
    let payments = [{ method: 'efectivo', amount: order.total }];

    const billTotal = () => Math.max(0, Math.round((order.total - discount) * 100) / 100);
    const paidSum = () => payments.reduce((s, p) => s + (+p.amount || 0), 0);

    const m = openModal({
      title: `Cobrar comanda ${order.order_number}`,
      size: 'modal-lg',
      body: `
        <div class="form-grid">
          <label class="field">Descuento (${esc(state.settings.currency_symbol || 'L')})
            <input class="input" id="p-disc" type="number" min="0" step="0.01" value="0"></label>
          <label class="field">Propina
            <input class="input" id="p-tip" type="number" min="0" step="0.01" value="0"></label>
        </div>
        <div class="tip-chips" id="tip-chips">
          <span class="tip-chip" data-tip="0">Sin propina</span>
          ${tipRate ? `<span class="tip-chip" data-tip="${tipRate}">${tipRate}% (sugerido)</span>` : ''}
          <span class="tip-chip" data-tip="10">10%</span>
          <span class="tip-chip" data-tip="15">15%</span>
        </div>
        <hr class="sep">
        <div class="flex-between"><b>Pagos</b><button class="btn btn-sm btn-outline" id="p-add">${icons.plus} Dividir</button></div>
        <div id="pay-rows" style="margin-top:8px"></div>
        <div class="muted" id="pay-remaining" style="font-size:12.5px; margin-top:6px"></div>
        <hr class="sep">
        <label class="checkbox"><input type="checkbox" id="p-invoice"> Emitir factura (datos fiscales)</label>
        <div class="form-grid" id="inv-fields" style="display:none; margin-top:10px">
          <label class="field">Cliente
            <input class="input" id="p-cname" placeholder="Consumidor final"></label>
          <label class="field">RTN
            <input class="input" id="p-crtn" placeholder="0801…"></label>
        </div>`,
      footer: `<button class="btn btn-outline" data-cancel>Cancelar</button>
               <button class="btn btn-green" data-charge id="p-charge"></button>`,
    });

    const renderRows = () => {
      const root = m.el.querySelector('#pay-rows');
      root.innerHTML = payments.map((p, i) => `
        <div class="split-row" data-row="${i}">
          <select class="input" data-method style="width:150px">
            <option value="efectivo" ${p.method === 'efectivo' ? 'selected' : ''}>Efectivo</option>
            <option value="tarjeta" ${p.method === 'tarjeta' ? 'selected' : ''}>Tarjeta</option>
            <option value="transferencia" ${p.method === 'transferencia' ? 'selected' : ''}>Transferencia</option>
          </select>
          <input class="input" data-amount type="number" min="0" step="0.01" value="${p.amount}" style="flex:1">
          ${payments.length > 1 ? `<button class="btn btn-sm btn-ghost btn-icon" data-rm>${icons.x}</button>` : ''}
        </div>`).join('');
      $$('.split-row', root).forEach(row => {
        const i = +row.dataset.row;
        row.querySelector('[data-method]').addEventListener('change', e => { payments[i].method = e.target.value; });
        row.querySelector('[data-amount]').addEventListener('input', e => { payments[i].amount = +e.target.value || 0; updateTotals(); });
        row.querySelector('[data-rm]')?.addEventListener('click', () => { payments.splice(i, 1); renderRows(); updateTotals(); });
      });
    };

    const updateTotals = () => {
      const bt = billTotal();
      const remaining = Math.round((bt - paidSum()) * 100) / 100;
      const rem = m.el.querySelector('#pay-remaining');
      rem.innerHTML = remaining > 0.001
        ? `Faltan <b class="text-red">${money(remaining)}</b> de ${money(bt)}`
        : `Pagos cubren el total (${money(bt)})${remaining < -0.001 ? ' · cambio ' + money(-remaining) : ''}`;
      m.el.querySelector('#p-charge').textContent = `Cobrar ${money(bt + tip)}`;
    };

    m.el.querySelector('#p-disc').addEventListener('input', e => {
      discount = +e.target.value || 0;
      if (payments.length === 1) { payments[0].amount = billTotal(); renderRows(); }
      updateTotals();
    });
    const tipInput = m.el.querySelector('#p-tip');
    tipInput.addEventListener('input', e => { tip = +e.target.value || 0; updateTotals(); });
    $$('#tip-chips .tip-chip', m.el).forEach(chip => chip.addEventListener('click', () => {
      const pct = +chip.dataset.tip;
      tip = Math.round(billTotal() * pct) / 100;
      tipInput.value = tip.toFixed(2);
      $$('#tip-chips .tip-chip', m.el).forEach(c => c.classList.toggle('active', c === chip));
      updateTotals();
    }));
    m.el.querySelector('#p-add').addEventListener('click', () => {
      const remaining = Math.max(0, billTotal() - paidSum());
      payments.push({ method: 'tarjeta', amount: Math.round(remaining * 100) / 100 });
      renderRows(); updateTotals();
    });
    m.el.querySelector('#p-invoice').addEventListener('change', e => {
      m.el.querySelector('#inv-fields').style.display = e.target.checked ? 'grid' : 'none';
    });
    m.el.querySelector('[data-cancel]').addEventListener('click', () => m.close());
    m.el.querySelector('[data-charge]').addEventListener('click', async () => {
      const invoice = m.el.querySelector('#p-invoice').checked;
      const body = {
        discount,
        invoice,
        customer_name: m.el.querySelector('#p-cname').value.trim(),
        customer_rtn: m.el.querySelector('#p-crtn').value.trim(),
        payments: payments.map((p, i) => ({ method: p.method, amount: +p.amount || 0, tip: i === 0 ? tip : 0 })),
      };
      const btn = m.el.querySelector('[data-charge]');
      btn.disabled = true;
      try {
        order = await api.post(`/api/orders/${orderId}/pay`, body);
        m.close();
        paidConfirm();
      } catch (err) { toastErr(err); btn.disabled = false; }
    });

    renderRows(); updateTotals();
  }

  function paidConfirm() {
    const m = openModal({
      title: '✓ Comanda pagada',
      body: `<div style="text-align:center; padding:8px 0">
          <div style="font-size:34px; font-weight:800; margin:8px 0">${money(order.total + order.tip)}</div>
          <div class="muted">Total ${money(order.total)} · ISV ${money(order.isv)}${order.tip ? ' · Propina ' + money(order.tip) : ''}</div>
        </div>`,
      footer: `<button class="btn btn-outline" data-print>${icons.printer} Imprimir</button>
               <a href="#/salon" class="btn btn-primary">Volver al salón</a>`,
      onClose: () => { renderTicket(); },
    });
    m.el.querySelector('[data-print]').addEventListener('click', () => openPrint(`/api/orders/${orderId}/receipt`));
  }

  renderTabs();
  renderDishes();
  renderTicket();
}
