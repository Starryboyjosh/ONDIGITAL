/**
 * Entrada SOLO CAJA — para el PC del cajero.
 * No carga el menú de finanzas ni rutas admin.
 */
import { api } from './api.js';
import { state, $ } from './ui.js';
import { applyTheme } from './theme.js';
import * as ventaNueva from './pages/venta_nueva.js';

function tickClock() {
  const el = $('#caja-clock');
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleString('es-HN', {
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

async function boot() {
  applyTheme();
  document.body.classList.add('mode-caja-standalone');

  try {
    state.settings = await api.get('/api/settings');
    const brand = $('#brand-company');
    if (brand) brand.textContent = state.settings.company_name || 'Registradora';
  } catch (err) {
    const page = $('#page');
    page.innerHTML = `
      <div class="card card-pad">
        <b>No se pudo conectar con el servidor de OnStock.</b>
        <p class="muted">${err && err.message ? err.message : err}</p>
        <p class="muted">En el PC de la tienda debe estar corriendo <code>make caja</code> (o el ejecutable con <code>-caja</code>).</p>
        <button class="btn btn-outline" onclick="location.reload()">Reintentar</button>
      </div>`;
    return;
  }

  tickClock();
  setInterval(tickClock, 30_000);

  const page = $('#page');
  page.innerHTML = '<div class="skeleton"><div class="spin"></div>Abriendo caja…</div>';
  try {
    await ventaNueva.render(page, { standalone: true });
  } catch (err) {
    page.innerHTML = `
      <div class="card card-pad">
        <b>Error al abrir la caja.</b>
        <p class="muted">${err && err.message ? err.message : err}</p>
        <button class="btn btn-outline" onclick="location.reload()">Reintentar</button>
      </div>`;
  }
}

boot();
