// Gráfica de barras SVG sin dependencias (ventas/utilidad por mes).
// Los colores no se escriben aquí: las barras, la rejilla y las etiquetas
// llevan clase y se pintan desde app.css, para que la gráfica siga al tema
// (blanco por defecto / colores de la empresa) sin tocar este archivo.
import { esc, money } from './ui.js';

/**
 * Techo del eje Y. La escalera es fina a propósito: con los saltos clásicos
 * (1·2·5·10) un máximo de 28 500 saltaba a 50 000 y las barras se quedaban
 * usando la mitad de la altura del lienzo.
 */
function niceMax(v) {
  if (v <= 0) return 100;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const escalones = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  return (escalones.find((e) => f <= e + 1e-9) ?? 10) * exp;
}

/** Divisor que reparta el eje en líneas de valor redondo. */
function pasos(maxVal) {
  for (const n of [4, 5, 3, 6]) {
    const paso = maxVal / n;
    const exp = Math.pow(10, Math.floor(Math.log10(paso)));
    if (Math.abs(paso / exp - Math.round(paso / exp)) < 1e-9) return n;
  }
  return 4;
}

function compact(v) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(Math.round(v));
}

/**
 * series: [{label, ventas, utilidad}] — doce meses, el último es el mes en
 * curso. Ese se dibuja translúcido y con borde punteado: sin esa marca, un mes
 * que lleva dos días corridos se lee como un desplome de las ventas.
 */
export function monthBarChart(container, series) {
  if (!container) return;
  if (!Array.isArray(series) || series.length === 0) {
    container.innerHTML = '<div class="empty-state"><b>Sin historial todavía</b>La gráfica se llena conforme se registran ventas.</div>';
    return;
  }

  const W = 920, H = 260;
  const padL = 52, padR = 10, padT = 14, padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxVal = niceMax(Math.max(...series.map(p => Math.max(p.ventas, p.utilidad)), 1) * 1.08);
  const y = (v) => padT + innerH - (Math.max(v, 0) / maxVal) * innerH;
  const base = padT + innerH;

  const n = series.length;
  const slot = innerW / n;
  const barW = Math.min(slot * 0.32, 26);
  const ultimo = n - 1;

  let grid = '';
  const steps = pasos(maxVal);
  for (let i = 0; i <= steps; i++) {
    const v = (maxVal / steps) * i;
    const gy = y(v);
    grid += `
      <line class="ch-grid" x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}"/>
      <text class="ch-axis" x="${padL - 8}" y="${gy + 3.5}" text-anchor="end">${compact(v)}</text>`;
  }

  let bars = '';
  series.forEach((p, i) => {
    const cx = padL + slot * i + slot / 2;
    const enCurso = i === ultimo;
    const marca = enCurso ? ' is-parcial' : '';
    const nota = enCurso ? ' · mes en curso' : '';
    const yV = y(p.ventas), yU = y(p.utilidad);
    // Altura mínima de 2 px: un mes con ventas muy bajas debe verse como una
    // barra corta, no desaparecer y confundirse con un mes sin datos.
    const hV = Math.max(base - yV, p.ventas > 0 ? 2 : 0);
    const hU = Math.max(base - yU, p.utilidad > 0 ? 2 : 0);
    bars += `
      <g>
        <title>${esc(p.label)}${nota} — Ventas: ${esc(money(p.ventas))} · Utilidad bruta: ${esc(money(p.utilidad))}</title>
        <rect class="ch-bar ch-bar-ventas${marca}" x="${cx - barW - 2}" y="${base - hV}" width="${barW}" height="${hV}" rx="3.5"/>
        <rect class="ch-bar ch-bar-utilidad${marca}" x="${cx + 2}" y="${base - hU}" width="${barW}" height="${hU}" rx="3.5"/>
        <text class="ch-axis${marca}" x="${cx}" y="${H - 9}" text-anchor="middle">${esc(p.label)}</text>
      </g>`;
  });

  container.innerHTML = `
    <svg class="ch" viewBox="0 0 ${W} ${H}" role="img"
         aria-label="Ventas netas y utilidad bruta de los últimos ${n} meses"
         style="width:100%; height:auto; display:block">
      ${grid}
      <line class="ch-base" x1="${padL}" y1="${base}" x2="${W - padR}" y2="${base}"/>
      ${bars}
    </svg>`;
}
