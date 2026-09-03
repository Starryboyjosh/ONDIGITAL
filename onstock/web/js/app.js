// Router de la SPA y arranque.
import { api } from './api.js';
import { state, $, $$ } from './ui.js';
import { applyTheme } from './theme.js';
import { applyShellMode, cajeroAllowed, isCajero } from './access.js';

import * as dashboard from './pages/dashboard.js';
import * as productos from './pages/productos.js';
import * as inventario from './pages/inventario.js';
import * as ventas from './pages/ventas.js';
import * as ventaNueva from './pages/venta_nueva.js';
import * as compras from './pages/compras.js';
import * as proveedores from './pages/proveedores.js';
import * as gastos from './pages/gastos.js';
import * as reportes from './pages/reportes.js';
import * as vito from './pages/vito.js';
import * as configuracion from './pages/configuracion.js';

const routes = [
  { re: /^#?\/?$/, page: dashboard, nav: 'dashboard', access: 'admin' },
  { re: /^#\/caja$/, page: ventaNueva, nav: 'caja', access: 'any' },
  { re: /^#\/ventas\/nueva$/, page: ventaNueva, nav: 'caja', access: 'any' },
  { re: /^#\/ventas$/, page: ventas, nav: 'ventas', access: 'admin' },
  { re: /^#\/productos$/, page: productos, nav: 'productos', access: 'admin' },
  { re: /^#\/inventario$/, page: inventario, nav: 'inventario', access: 'admin' },
  { re: /^#\/compras$/, page: compras, nav: 'compras', access: 'admin' },
  { re: /^#\/proveedores$/, page: proveedores, nav: 'proveedores', access: 'admin' },
  { re: /^#\/gastos$/, page: gastos, nav: 'gastos', access: 'admin' },
  { re: /^#\/reportes$/, page: reportes, nav: 'reportes', access: 'admin' },
  { re: /^#\/vito$/, page: vito, nav: 'vito', access: 'admin' },
  { re: /^#\/configuracion$/, page: configuracion, nav: 'configuracion', access: 'admin' },
];

async function navigate() {
  let hash = location.hash || '#/';

  // Cajero: solo caja (sin finanzas / reportes / config)
  if (isCajero() && !cajeroAllowed(hash)) {
    location.hash = '#/caja';
    return;
  }

  const route = routes.find(r => r.re.test(hash)) || routes[0];
  if (isCajero() && route.access === 'admin') {
    location.hash = '#/caja';
    return;
  }

  applyShellMode();
  closeNav();
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.route === route.nav));
  $('#modal-root').innerHTML = '';

  const page = $('#page');
  page.innerHTML = '<div class="skeleton"><div class="spin"></div>Cargando…</div>';
  try {
    await route.page.render(page);
  } catch (err) {
    page.innerHTML = `
      <div class="card card-pad">
        <b>Ocurrió un error al cargar la página.</b>
        <p class="muted">${err && err.message ? err.message : err}</p>
        <button class="btn btn-outline" onclick="location.reload()">Recargar</button>
      </div>`;
  }
  window.scrollTo(0, 0);
}

export async function refreshSettings() {
  state.settings = await api.get('/api/settings');
  const el = $('#brand-company');
  if (el) el.textContent = state.settings.company_name || 'Mi Empresa';
}

// ── Menú lateral en móvil ───────────────────────────────
// Debajo de 860px el sidebar es un cajón. Se cierra solo al navegar (arriba),
// al tocar el fondo y con Escape, para que nunca quede tapando la pantalla.
function setNav(open) {
  document.body.classList.toggle('nav-open', open);
  const btn = $('#nav-toggle');
  const back = $('#nav-backdrop');
  if (btn) {
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Cerrar el menú' : 'Abrir el menú');
  }
  if (back) back.hidden = !open;
}
function closeNav() { if (document.body.classList.contains('nav-open')) setNav(false); }

function initNav() {
  const btn = $('#nav-toggle');
  const back = $('#nav-backdrop');
  if (btn) btn.addEventListener('click', () => setNav(!document.body.classList.contains('nav-open')));
  if (back) back.addEventListener('click', closeNav);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });
}

window.addEventListener('hashchange', navigate);

(async function init() {
  applyTheme();
  applyShellMode();
  initNav();
  try { await refreshSettings(); } catch { /* el servidor mostrará el error en la página */ }
  // Si quedó en modo cajero de una sesión anterior, forzar caja
  if (isCajero() && !cajeroAllowed(location.hash || '#/')) {
    location.hash = '#/caja';
  }
  await navigate();
})();
