// Router de la SPA y arranque. Cada página exporta render(container, params) y, si necesita
// refresco en vivo (salón, cocina), puede devolver una función de limpieza (clear interval).
import { api } from './api.js';
import { state, $, $$ } from './ui.js';
import { applyTheme } from './theme.js';

import * as dashboard from './pages/dashboard.js';
import * as salon from './pages/salon.js';
import * as comanda from './pages/comanda.js';
import * as cocina from './pages/cocina.js';
import * as menu from './pages/menu.js';
import * as caja from './pages/caja.js';
import * as configuracion from './pages/configuracion.js';

const routes = [
  { re: /^#?\/?$/, page: dashboard, nav: 'dashboard' },
  { re: /^#\/salon$/, page: salon, nav: 'salon' },
  { re: /^#\/comanda\/(\d+)$/, page: comanda, nav: 'salon' },
  { re: /^#\/cocina$/, page: cocina, nav: 'cocina' },
  { re: /^#\/menu$/, page: menu, nav: 'menu' },
  { re: /^#\/caja$/, page: caja, nav: 'caja' },
  { re: /^#\/config$/, page: configuracion, nav: 'config' },
];

let cleanup = null;

async function navigate() {
  if (cleanup) { try { cleanup(); } catch { /* noop */ } cleanup = null; }
  setMobileNav(false);

  const hash = location.hash || '#/';
  let route = routes[0], match = null;
  for (const r of routes) {
    const m = r.re.exec(hash);
    if (m) { route = r; match = m; break; }
  }

  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.route === route.nav));
  $('#modal-root').innerHTML = '';

  const page = $('#page');
  page.innerHTML = '<div class="skeleton"><div class="spin"></div>Cargando…</div>';
  try {
    const c = await route.page.render(page, match ? match.slice(1) : []);
    if (typeof c === 'function') cleanup = c;
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
  $('#brand-company').textContent = state.settings.company_name || 'Mi Restaurante';
}

function setMobileNav(open) {
  document.body.classList.toggle('nav-open', open);
  $('#mobile-nav-toggle')?.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function setupMobileNav() {
  const btn = $('#mobile-nav-toggle');
  const backdrop = $('#sidebar-backdrop');
  if (!btn || !backdrop) return;
  btn.addEventListener('click', () => setMobileNav(!document.body.classList.contains('nav-open')));
  backdrop.addEventListener('click', () => setMobileNav(false));
  $$('.sidebar .nav a').forEach(a => a.addEventListener('click', () => setMobileNav(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMobileNav(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) setMobileNav(false);
  });
}

window.addEventListener('hashchange', navigate);

(async function init() {
  applyTheme();
  setupMobileNav();
  try { await refreshSettings(); } catch { /* el servidor mostrará el error en la página */ }
  await navigate();
})();
