// Utilidades de interfaz: formato, modales, toasts, badges. (Patrón de OnStock.)

export const state = {
  settings: {},
};

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ── Formato ─────────────────────────────────────────────

const nf = new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfQty = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 2 });

export function sym() { return state.settings.currency_symbol || 'L'; }
export function money(v) { return `${sym()} ${nf.format(+v || 0)}`; }
export function num(v) { return nf.format(+v || 0); }
export function qty(v) { return nfQty.format(+v || 0); }

export function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function fmtDate(s) {
  if (!s) return '';
  const str = String(s);
  const [d, t] = str.split(' ');
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return str;
  return t ? `${day}/${m}/${y} ${t.slice(0, 5)}` : `${day}/${m}/${y}`;
}

export function fmtTime(s) {
  if (!s) return '';
  const t = String(s).split(' ')[1] || '';
  return t.slice(0, 5);
}

// minutesSince interpreta 'YYYY-MM-DD HH:MM:SS' como hora local y devuelve los minutos transcurridos.
export function minutesSince(s) {
  if (!s) return 0;
  const [d, t] = String(s).split(' ');
  if (!d) return 0;
  const [y, m, day] = d.split('-').map(Number);
  const [hh = 0, mm = 0, ss = 0] = (t || '').split(':').map(Number);
  const then = new Date(y, (m || 1) - 1, day, hh, mm, ss);
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / 60000));
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function debounce(fn, ms = 250) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── Iconos (svg inline) ─────────────────────────────────

export const icons = {
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
  printer: '<svg viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M1 12s4-7.5 11-7.5S23 12 23 12s-4 7.5-11 7.5S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.5 15"/></svg>',
  ban: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/></svg>',
  users: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path d="M12 2c1 4 5 5 5 9a5 5 0 01-10 0c0-2 1-3 1-3 .5 2 2 2 2 2-1-3 0-6 2-8z"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  receipt: '<svg viewBox="0 0 24 24"><path d="M4 2v20l3-2 3 2 2-2 2 2 3-2 2 2V2l-2 2-3-2-2 2-2-2-3 2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
  cash: '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>',
  table: '<svg viewBox="0 0 24 24"><path d="M3 10h18M5 10V6h14v4M7 10v8M17 10v8"/></svg>',
};

// ── Toasts ──────────────────────────────────────────────

export function toast(msg, type = 'success', ms = 3200) {
  const root = $('#toast-root');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .25s, transform .25s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(24px)';
    setTimeout(() => el.remove(), 260);
  }, ms);
}

export function toastErr(err) {
  toast(err && err.message ? err.message : String(err), 'error', 5000);
}

// ── Modales ─────────────────────────────────────────────

export function openModal({ title, body, footer = '', size = '', onClose = null }) {
  const root = $('#modal-root');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal ${size}">
      <div class="modal-head">
        <h3>${esc(title)}</h3>
        <button class="modal-close" data-close>${icons.x}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`;
  root.appendChild(overlay);

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    if (onClose) onClose();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('[data-close]').addEventListener('click', close);

  const firstInput = overlay.querySelector('input, select, textarea');
  if (firstInput) setTimeout(() => firstInput.focus(), 40);

  return { el: overlay, close };
}

export function confirmDialog(message, { title = 'Confirmar', okText = 'Confirmar', danger = false } = {}) {
  return new Promise((resolve) => {
    const m = openModal({
      title,
      body: `<p style="margin:4px 0 0; line-height:1.55">${esc(message)}</p>`,
      footer: `
        <button class="btn btn-outline" data-no>Cancelar</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${esc(okText)}</button>`,
      onClose: () => resolve(false),
    });
    m.el.querySelector('[data-no]').addEventListener('click', () => m.close());
    m.el.querySelector('[data-yes]').addEventListener('click', () => {
      resolve(true);
      m.close();
    });
  });
}

// ── Badges ──────────────────────────────────────────────

export function orderStatusBadge(status) {
  const map = {
    abierta: ['badge-blue', 'Abierta'],
    por_cobrar: ['badge-amber', 'Por cobrar'],
    pagada: ['badge-green', 'Pagada'],
    anulada: ['badge-red', 'Anulada'],
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

export function kitchenStatusBadge(status) {
  const map = {
    pendiente: ['badge-amber', 'Pendiente'],
    en_preparacion: ['badge-blue', 'En preparación'],
    listo: ['badge-green', 'Listo'],
    servido: ['badge-gray', 'Servido'],
    cancelado: ['badge-red', 'Cancelado'],
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

export const COURSES = [
  ['entrada', 'Entrada'],
  ['fuerte', 'Plato fuerte'],
  ['bebida', 'Bebida'],
  ['postre', 'Postre'],
];

export function courseLabel(c) {
  const found = COURSES.find(x => x[0] === c);
  return found ? found[1] : c;
}

// ── Descargas / impresión ───────────────────────────────
export function openPrint(url) {
  window.open(url, '_blank', 'noopener');
}
