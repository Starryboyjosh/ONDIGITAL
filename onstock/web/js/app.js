// Router de la SPA y arranque.
import { api } from './api.js';
import { state, $, $$ } from './ui.js';
import { applyTheme } from './theme.js';

import * as dashboard from './pages/dashboard.js';
import * as productos from './pages/productos.js';
import * as inventario from './pages/inventario.js';
import * as ventas from './pages/ventas.js';
import * as ventaNueva from './pages/venta_nueva.js';
import * as compras from './pages/compras.js';
import * as proveedores from './pages/proveedores.js';
import * as gastos from './pages/gastos.js';
import * as reportes from './pages/reportes.js';
import * as configuracion from './pages/configuracion.js';

const routes = [
  { re: /^#?\/?$/, page: dashboard, nav: 'dashboard' },
  { re: /^#\/ventas\/nueva$/, page: ventaNueva, nav: 'ventas' },
  { re: /^#\/ventas$/, page: ventas, nav: 'ventas' },
  { re: /^#\/productos$/, page: productos, nav: 'productos' },
  { re: /^#\/inventario$/, page: inventario, nav: 'inventario' },
  { re: /^#\/compras$/, page: compras, nav: 'compras' },
  { re: /^#\/proveedores$/, page: proveedores, nav: 'proveedores' },
  { re: /^#\/gastos$/, page: gastos, nav: 'gastos' },
  { re: /^#\/reportes$/, page: reportes, nav: 'reportes' },
  { re: /^#\/configuracion$/, page: configuracion, nav: 'configuracion' },
];

async function navigate() {
  const hash = location.hash || '#/';
  const route = routes.find(r => r.re.test(hash)) || routes[0];

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
  $('#brand-company').textContent = state.settings.company_name || 'Mi Empresa';
}

window.addEventListener('hashchange', navigate);

(async function init() {
  applyTheme();
  try { await refreshSettings(); } catch { /* el servidor mostrará el error en la página */ }
  await navigate();
  
  // Sincronizar todos los datos locales a Firebase Firestore en segundo plano
  import('./firebase/sync.js').then(({ syncAllToFirebase }) => {
    syncAllToFirebase().catch(err => console.error("Error en la sincronización inicial de Firebase:", err));
  }).catch(err => console.error("No se pudo cargar el script de sincronización de Firebase:", err));
})();
