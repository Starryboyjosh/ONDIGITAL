#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const [html, css, js] = await Promise.all([
  readFile(join(root, 'index.html'), 'utf8'),
  readFile(join(root, 'styles.css'), 'utf8'),
  readFile(join(root, 'script.js'), 'utf8'),
]);

const failures = [];
const requirePattern = (source, pattern, message) => {
  if (!pattern.test(source)) failures.push(message);
};
const forbidPattern = (source, pattern, message) => {
  if (pattern.test(source)) failures.push(message);
};

// Quality gates for the static landing: structure, resilient motion and recurring visual pitfalls.
requirePattern(html, /<html[^>]+lang=["']es["']/i, 'Falta declarar el idioma principal en espanol.');
requirePattern(html, /<meta\s+name=["']viewport["']/i, 'Falta el meta viewport para dispositivos moviles.');
requirePattern(html, /<main\b/i, 'Falta el landmark <main>.');
requirePattern(html, /<h1\b/i, 'Falta un H1 para la jerarquia principal.');
requirePattern(css, /:focus-visible\b/, 'Faltan estados de foco visible para teclado.');
requirePattern(css, /prefers-reduced-motion\s*:\s*reduce/, 'Falta el modo de movimiento reducido.');
requirePattern(css, /@media\s*\(max-width:/, 'Faltan reglas responsivas para pantallas estrechas.');
requirePattern(js, /IntersectionObserver/, 'Falta una estrategia de revelado eficiente para el scroll.');
requirePattern(html, /data-count-to=["']19["'][\s\S]*data-count-to=["']49["'][\s\S]*data-count-to=["']99["']/i, 'Los precios principales deben ser 19, 49 y 99 USD/mes.');
forbidPattern(html, /<strong>\$(?:149|199)<\/strong>/i, 'El selector de contacto contiene precios antiguos.');

forbidPattern(css, /(?:-webkit-)?background-clip\s*:\s*text/i, 'No uses texto con gradiente; usa un color solido para mantener legibilidad.');
forbidPattern(css, /cubic-bezier\(\s*0\.34\s*,\s*1\.56\s*,\s*0\.64\s*,\s*1\s*\)/i, 'No uses curvas elasticas en la landing.');
forbidPattern(html, /class=["'][^"']*\bsvc-num\b/i, 'No uses numeracion decorativa como estructura de las tarjetas de servicio.');

if (failures.length) {
  console.error('Landing quality check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Landing quality check passed (structure, accessibility hooks, responsive and visual guardrails).');
}
