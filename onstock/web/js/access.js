// Modo de acceso en este equipo: admin (todo) vs cajero (solo caja).
// No es auth multi-usuario completa; aísla la registradora de finanzas del negocio.

const KEY = 'onstock_access_mode';

/** @returns {'admin'|'cajero'} */
export function getMode() {
  try {
    const m = sessionStorage.getItem(KEY);
    return m === 'cajero' ? 'cajero' : 'admin';
  } catch {
    return 'admin';
  }
}

export function isCajero() {
  return getMode() === 'cajero';
}

export function setMode(mode) {
  const m = mode === 'cajero' ? 'cajero' : 'admin';
  try {
    sessionStorage.setItem(KEY, m);
  } catch { /* private mode */ }
  applyShellMode();
  return m;
}

/** Entra a modo cajero y navega a la caja. */
export function enterCajeroMode() {
  setMode('cajero');
  if (location.hash !== '#/caja' && location.hash !== '#/ventas/nueva') {
    location.hash = '#/caja';
  } else {
    // forzar re-render del shell
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

/** Sale a modo admin y vuelve al dashboard. */
export function exitCajeroMode() {
  setMode('admin');
  location.hash = '#/';
}

/** Rutas permitidas en modo cajero (solo punto de venta). */
export function cajeroAllowed(hash) {
  const h = hash || '#/';
  return /^#\/caja\/?$/.test(h) || /^#\/ventas\/nueva\/?$/.test(h);
}

/** Actualiza clases del body y visibilidad del menú. */
export function applyShellMode() {
  const cajero = isCajero();
  document.body.classList.toggle('mode-cajero', cajero);
  document.body.classList.toggle('mode-admin', !cajero);

  // Nav: ocultar enlaces admin
  document.querySelectorAll('[data-access="admin"]').forEach((el) => {
    el.hidden = cajero;
  });

  const badge = document.getElementById('access-mode-badge');
  if (badge) {
    badge.hidden = !cajero;
    badge.textContent = cajero ? 'Modo cajero · solo caja' : '';
  }

  const brandSub = document.getElementById('brand-mode-line');
  if (brandSub) {
    brandSub.hidden = !cajero;
  }
}

/**
 * Verifica PIN de salida de caja.
 * Si no hay PIN configurado, permite salir (con confirmación en UI).
 */
export function checkExitPin(input, configuredPin) {
  const pin = String(configuredPin || '').trim();
  if (!pin) return { ok: true, empty: true };
  if (String(input || '').trim() === pin) return { ok: true, empty: false };
  return { ok: false, empty: false };
}
