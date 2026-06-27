// Tema visual: "light" (blanco, por defecto) o "company" (colores de la empresa, paleta
// ONDIGITAL). Solo apariencia; se guarda por equipo en localStorage. No toca el servidor.
const KEY = 'onserve-theme';

export function getTheme() {
  try { return localStorage.getItem(KEY) === 'company' ? 'company' : 'light'; }
  catch { return 'light'; }
}

export function applyTheme(t = getTheme()) {
  const v = t === 'company' ? 'company' : 'light';
  document.documentElement.setAttribute('data-theme', v);
  return v;
}

export function setTheme(t) {
  const v = t === 'company' ? 'company' : 'light';
  try { localStorage.setItem(KEY, v); } catch { /* sin persistencia: solo sesión */ }
  return applyTheme(v);
}
