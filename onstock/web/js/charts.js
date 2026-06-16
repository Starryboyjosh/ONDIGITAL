// Gráfica de barras SVG sin dependencias (ventas/utilidad por mes).
import { esc, money } from './ui.js';

function niceMax(v) {
  if (v <= 0) return 100;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * exp;
}

function compact(v) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(Math.round(v));
}

// series: [{label, ventas, utilidad}]
export function monthBarChart(container, series) {
  const W = 920, H = 260;
  const padL = 52, padR = 10, padT = 14, padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxVal = niceMax(Math.max(...series.map(p => Math.max(p.ventas, p.utilidad)), 1) * 1.08);
  const y = (v) => padT + innerH - (Math.max(v, 0) / maxVal) * innerH;

  const n = series.length;
  const slot = innerW / n;
  const barW = Math.min(slot * 0.32, 26);

  let bars = '';
  series.forEach((p, i) => {
    const cx = padL + slot * i + slot / 2;
    const yV = y(p.ventas), yU = y(p.utilidad);
    bars += `
      <g>
        <title>${esc(p.label)} — Ventas: ${esc(money(p.ventas))} · Utilidad bruta: ${esc(money(p.utilidad))}</title>
        <rect x="${cx - barW - 2}" y="${yV}" width="${barW}" height="${padT + innerH - yV}" rx="3.5" fill="#4f46e5"/>
        <rect x="${cx + 2}" y="${yU}" width="${barW}" height="${padT + innerH - yU}" rx="3.5" fill="#10b981"/>
        <text x="${cx}" y="${H - 9}" text-anchor="middle" font-size="10.5" fill="#9298b3">${esc(p.label)}</text>
      </g>`;
  });

  let grid = '';
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const v = (maxVal / steps) * i;
    const gy = y(v);
    grid += `
      <line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="#e9eaf2" stroke-width="1"/>
      <text x="${padL - 8}" y="${gy + 3.5}" text-anchor="end" font-size="10.5" fill="#9298b3">${compact(v)}</text>`;
  }

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; display:block">
      ${grid}${bars}
    </svg>`;
}
