// Caja: apertura y cierre de sesión (arqueo), órdenes por cobrar y resumen del turno.
import { api } from '../api.js';
import { $, $$, money, esc, icons, fmtDate, fmtTime, toast, toastErr, openModal, orderStatusBadge, sym } from '../ui.js';

export async function render(page) {
  const session = await api.get('/api/sessions/current');

  if (!session) {
    page.innerHTML = `
      <div class="page-head"><div><h1>Caja</h1><div class="sub">No hay una sesión de caja abierta</div></div></div>
      <div class="card" style="max-width:460px">
        <h2>Abrir caja</h2>
        <div class="card-pad">
          <div class="form-grid">
            <label class="field">Cajero
              <input class="input" id="o-by" placeholder="Nombre"></label>
            <label class="field">Fondo de caja (${esc(sym())})
              <input class="input" id="o-cash" type="number" min="0" step="0.01" value="0"></label>
          </div>
          <button class="btn btn-primary" id="b-open" style="margin-top:14px">${icons.cash} Abrir caja</button>
        </div>
      </div>
      ${await sessionHistory()}`;
    $('#b-open', page).addEventListener('click', async () => {
      try {
        await api.post('/api/sessions/open', { opened_by: $('#o-by', page).value.trim(), opening_cash: +$('#o-cash', page).value || 0 });
        toast('Caja abierta'); render(page);
      } catch (err) { toastErr(err); }
    });
    return;
  }

  const open = await api.get('/api/orders?status=abierta');
  const toCharge = await api.get('/api/orders?status=por_cobrar');
  const pending = [...toCharge, ...open];

  page.innerHTML = `
    <div class="page-head"><div><h1>Caja</h1><div class="sub">${esc(session.session_number)} · abierta ${fmtDate(session.opened_at)}${session.opened_by ? ' · ' + esc(session.opened_by) : ''}</div></div>
      <div class="page-actions"><button class="btn btn-danger" id="b-close">Cerrar caja (arqueo)</button></div></div>

    <div class="session-banner open">
      <div><b>Caja abierta</b> · fondo inicial ${money(session.opening_cash)}</div>
      <div class="flex" style="gap:18px; flex-wrap:wrap">
        <span><b>${session.orders}</b> comandas</span>
        <span>Ventas <b>${money(session.sales_total)}</b></span>
        <span>Propinas <b>${money(session.tips_total)}</b></span>
      </div>
    </div>

    <div class="grid grid-4 mb">
      ${kpi('Efectivo', money(session.cash_sales), 'ventas en efectivo')}
      ${kpi('Tarjeta', money(session.card_sales), 'ventas con tarjeta')}
      ${kpi('Otros', money(session.other_sales), 'transferencias, etc.')}
      ${kpi('Efectivo esperado', money(session.opening_cash + session.cash_sales), 'fondo + efectivo')}
    </div>

    <div class="card">
      <h2>Comandas por cobrar <span class="muted">${pending.length}</span></h2>
      ${pending.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Comanda</th><th>Mesa</th><th>Abierta</th><th class="num">Total</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            ${pending.map(o => `
              <tr class="row-click" data-go="${o.id}">
                <td class="mono">${esc(o.order_number)}</td>
                <td>${esc(o.table_name || 'Para llevar')}</td>
                <td>${fmtTime(o.opened_at)}</td>
                <td class="num">${money(o.total)}</td>
                <td>${orderStatusBadge(o.status)}</td>
                <td class="actions-cell"><a class="btn btn-sm btn-green" href="#/comanda/${o.id}">${icons.cash} Cobrar</a></td>
              </tr>`).join('')}
          </tbody>
        </table></div>` : '<div class="empty-state">No hay comandas abiertas.</div>'}
    </div>

    ${await sessionHistory()}`;

  $$('.row-click', page).forEach(r => r.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    location.hash = `#/comanda/${r.dataset.go}`;
  }));

  $('#b-close', page).addEventListener('click', () => closeModal(session, page));
}

function kpi(label, value, foot) {
  return `<div class="card kpi"><div class="kpi-label">${esc(label)}</div><div class="kpi-value">${value}</div><div class="kpi-foot">${esc(foot)}</div></div>`;
}

function closeModal(session, page) {
  const expected = session.opening_cash + session.cash_sales;
  const m = openModal({
    title: `Cerrar ${session.session_number}`,
    body: `
      <p class="muted" style="margin-top:0">Cuenta el efectivo en caja y regístralo para el arqueo.</p>
      <div class="form-grid">
        <label class="field">Efectivo contado (L)
          <input class="input" id="c-cash" type="number" min="0" step="0.01" value="${expected.toFixed(2)}"></label>
        <label class="field">Efectivo esperado
          <input class="input" value="${money(expected)}" disabled></label>
        <label class="field full">Notas
          <input class="input" id="c-notes" placeholder="Observaciones del cierre"></label>
      </div>
      <div class="pos-total-row grand" id="c-diff" style="margin-top:8px"><span>Diferencia</span><span>${money(0)}</span></div>`,
    footer: `<button class="btn btn-outline" data-cancel>Cancelar</button><button class="btn btn-danger" data-confirm>Cerrar caja</button>`,
  });
  const recompute = () => {
    const counted = +m.el.querySelector('#c-cash').value || 0;
    const diff = Math.round((counted - expected) * 100) / 100;
    m.el.querySelector('#c-diff').innerHTML = `<span>Diferencia</span><span class="${diff < 0 ? 'text-red' : (diff > 0 ? 'text-green' : '')}">${money(diff)}</span>`;
  };
  m.el.querySelector('#c-cash').addEventListener('input', recompute);
  m.el.querySelector('[data-cancel]').addEventListener('click', () => m.close());
  m.el.querySelector('[data-confirm]').addEventListener('click', async () => {
    try {
      await api.post('/api/sessions/close', { closing_cash: +m.el.querySelector('#c-cash').value || 0, notes: m.el.querySelector('#c-notes').value.trim() });
      m.close(); toast('Caja cerrada'); render(page);
    } catch (err) { toastErr(err); }
  });
}

async function sessionHistory() {
  let sessions = [];
  try { sessions = await api.get('/api/sessions?limit=10'); } catch { /* noop */ }
  const closed = sessions.filter(s => s.status === 'cerrada');
  if (!closed.length) return '';
  return `
    <div class="card mt">
      <h2>Cierres anteriores</h2>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Caja</th><th>Cerrada</th><th class="num">Ventas</th><th class="num">Esperado</th><th class="num">Contado</th><th class="num">Diferencia</th></tr></thead>
        <tbody>
          ${closed.map(s => `
            <tr>
              <td class="mono">${esc(s.session_number)}</td>
              <td>${fmtDate(s.closed_at)}</td>
              <td class="num">${money(s.sales_total)}</td>
              <td class="num">${money(s.expected_cash)}</td>
              <td class="num">${money(s.closing_cash)}</td>
              <td class="num ${s.difference < 0 ? 'text-red' : (s.difference > 0 ? 'text-green' : '')}">${money(s.difference)}</td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
}
