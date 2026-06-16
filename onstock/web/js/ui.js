// Utilidades de interfaz: formato, modales, toasts, autocompletado.
import { api } from './api.js';

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

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
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
  barcode: '<svg viewBox="0 0 24 24"><path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14M21 5v14"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
  printer: '<svg viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M1 12s4-7.5 11-7.5S23 12 23 12s-4 7.5-11 7.5S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  cart: '<svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2.5 3.5h3l2.6 12h10.4l2-8.5H6.2"/></svg>',
  truck: '<svg viewBox="0 0 24 24"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.5 15"/></svg>',
  ban: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/></svg>',
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

export function openModal({ title, body, footer = '', size = '' , onClose = null }) {
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
    m.el.querySelector('[data-no]').addEventListener('click', () => { m.close(); });
    m.el.querySelector('[data-yes]').addEventListener('click', () => {
      m.el.querySelector('[data-yes]').disabled = true;
      resolve(true);
      m.el.remove();
      // quitar listener Escape del modal
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '' }));
    });
  });
}

// ── Badges de estado ────────────────────────────────────

export function statusBadge(status) {
  const map = {
    completada: ['badge-green', 'Completada'],
    anulada: ['badge-red', 'Anulada'],
    borrador: ['badge-gray', 'Borrador'],
    enviada: ['badge-blue', 'Enviada'],
    recibida: ['badge-green', 'Recibida'],
    cancelada: ['badge-red', 'Cancelada'],
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

export function movementBadge(type) {
  const map = {
    entrada: ['badge-green', 'Entrada'],
    salida: ['badge-red', 'Salida'],
    ajuste: ['badge-amber', 'Ajuste'],
    venta: ['badge-blue', 'Venta'],
    compra: ['badge-green', 'Compra'],
    anulacion: ['badge-amber', 'Anulación'],
  };
  const [cls, label] = map[type] || ['badge-gray', type];
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

export function expenseCatBadge(cat) {
  const map = {
    ventas: ['badge-blue', 'Gastos de venta'],
    administrativos: ['badge-amber', 'Administrativos'],
    financieros: ['badge-red', 'Financieros'],
    otros: ['badge-gray', 'Otros'],
  };
  const [cls, label] = map[cat] || ['badge-gray', cat];
  return `<span class="badge ${cls} badge-plain">${esc(label)}</span>`;
}

// ── Autocompletado de productos ─────────────────────────
// Convierte un <input> en buscador de productos. onPick(producto) al elegir.
export function productPicker(input, onPick, { clearOnPick = true } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'ac-wrap';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);

  let list = null;
  let items = [];
  let sel = -1;

  const closeList = () => { if (list) { list.remove(); list = null; items = []; sel = -1; } };

  const render = (products) => {
    closeList();
    list = document.createElement('div');
    list.className = 'ac-list';
    if (!products.length) {
      list.innerHTML = '<div class="ac-empty">Sin resultados</div>';
    } else {
      list.innerHTML = products.map((p, i) => `
        <div class="ac-item" data-i="${i}">
          <div>
            <div class="ac-name">${esc(p.name)}</div>
            <div class="ac-meta">${esc(p.sku)}${p.barcode ? ' · ' + esc(p.barcode) : ''}</div>
          </div>
          <div class="ac-right">
            <div>${money(p.price)}</div>
            <div class="${p.stock <= p.min_stock ? 'text-red' : 'muted'}">Stock: ${qty(p.stock)}</div>
          </div>
        </div>`).join('');
    }
    wrap.appendChild(list);
    items = products;
    list.addEventListener('mousedown', (e) => {
      const item = e.target.closest('.ac-item');
      if (!item) return;
      e.preventDefault();
      pick(items[+item.dataset.i]);
    });
  };

  const pick = (p) => {
    closeList();
    if (clearOnPick) input.value = '';
    onPick(p);
  };

  const search = debounce(async () => {
    const q = input.value.trim();
    if (q.length < 1) { closeList(); return; }
    try {
      const products = await api.get(`/api/products?q=${encodeURIComponent(q)}`);
      render(products.slice(0, 12));
    } catch { /* ignorar errores de búsqueda */ }
  }, 200);

  input.addEventListener('input', search);
  input.addEventListener('blur', () => setTimeout(closeList, 150));
  input.addEventListener('keydown', async (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!list || !items.length) return;
      e.preventDefault();
      sel = e.key === 'ArrowDown' ? Math.min(sel + 1, items.length - 1) : Math.max(sel - 1, 0);
      $$('.ac-item', list).forEach((el, i) => el.classList.toggle('sel', i === sel));
      return;
    }
    if (e.key === 'Escape') { closeList(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (sel >= 0 && items[sel]) { pick(items[sel]); return; }
      // Escáner de código de barras: busca coincidencia exacta primero.
      const code = input.value.trim();
      if (!code) return;
      try {
        const p = await api.get(`/api/products/by-code/${encodeURIComponent(code)}`);
        pick(p);
      } catch {
        if (items.length === 1) pick(items[0]);
        else if (items.length === 0) toast(`No se encontró el código "${code}"`, 'error');
      }
    }
  });

  return { close: closeList };
}

// ── Descargas ───────────────────────────────────────────
export function download(url) {
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
