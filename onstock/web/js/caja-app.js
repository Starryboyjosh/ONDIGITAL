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
    // Quien está delante de esta pantalla es la persona que cobra, no quien
    // instaló el sistema: no se le pide que ejecute un comando ni se le enseña
    // el error técnico. Se le dice qué pasa, qué puede hacer ella y a quién
    // avisar. El detalle técnico queda en la consola, para quien sí lo lea.
    console.error('OnStock · caja: no se pudo conectar con el servidor.', err);
    const page = $('#page');
    page.innerHTML = `
      <div class="card card-pad">
        <b>La caja no se está comunicando con la computadora principal.</b>
        <p class="muted">No se puede cobrar hasta que vuelva la conexión. Lo que ya
        cobró está guardado; no se perdió nada.</p>
        <p class="muted">Revise que la computadora donde está OnStock esté encendida
        y conectada a la misma red. Si sigue igual, avise al encargado del sistema.</p>
        <button class="btn btn-primary" onclick="location.reload()">Volver a intentar</button>
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
