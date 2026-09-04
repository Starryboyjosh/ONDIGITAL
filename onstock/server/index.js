// OnStock — Sistema de inventario, ventas y reportes para tiendas (Honduras).
// Servidor HTTP + base de datos SQLite local + interfaz web servida desde disco.
//
// Traducción de main.go. La única diferencia de fondo: el binario de Go
// incrustaba web/ con go:embed y había que recompilar para ver un cambio de CSS;
// aquí web/ se sirve del disco, así que basta guardar y recargar.
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

import { open } from './store/index.js';
import { API, logMiddleware } from './api/index.js';
import { bootstrap } from './vito/host.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.resolve(AQUI, '..'); // la carpeta onstock/
const WEB_DIR = path.join(BASE_DIR, 'web');

// parseFlags acepta las mismas banderas que main.go, en los dos estilos que
// admite el paquete flag de Go (-port 8080 y -port=8080).
function parseFlags(argv) {
  const f = {
    port: 8080,
    host: '127.0.0.1',
    data: path.join(BASE_DIR, 'data'),
    'no-open': false,
    caja: false,
    'seed-demo': false,
    'seed-demo-force': false,
    backup: '',
    vacio: false,
  };
  const booleanas = new Set(['no-open', 'caja', 'seed-demo', 'seed-demo-force', 'vacio']);
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];
    if (!a.startsWith('-')) continue;
    a = a.replace(/^--?/, '');
    let value = null;
    const eq = a.indexOf('=');
    if (eq >= 0) {
      value = a.slice(eq + 1);
      a = a.slice(0, eq);
    }
    if (!(a in f)) continue;
    if (booleanas.has(a)) {
      f[a] = value === null ? true : !['0', 'false', 'no'].includes(value.toLowerCase());
      continue;
    }
    if (value === null) {
      value = argv[++i] ?? '';
    }
    f[a] = a === 'port' ? Number.parseInt(value, 10) : value;
  }
  return f;
}

function truncatePath(p, n) {
  return p.length <= n ? p : `…${p.slice(p.length - n + 1)}`;
}

function lanIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces ?? []) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return '';
}

// pad rellena a la derecha contando runas, no bytes: los recuadros de la consola
// llevan acentos y con longitud en bytes salían torcidos.
function pad(s, n) {
  const r = [...String(s)];
  return r.length >= n ? r.join('') : r.join('') + ' '.repeat(n - r.length);
}

function padNum(v, n) {
  return pad(String(v), n);
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const st = open(flags.data);

  try {
    st.ensureTenantDefaults();
  } catch (err) {
    console.log(`tenant: ${err.message}`);
  }

  if (flags.backup !== '') {
    const p = st.backup(flags.backup);
    console.log('Respaldo creado:', p);
    st.close();
    return;
  }

  if (flags['seed-demo'] || flags['seed-demo-force']) {
    let rep;
    try {
      rep = st.seedDemo(flags['seed-demo-force']);
    } catch (err) {
      console.error(`Seed demo: ${err.message}`);
      process.exit(1);
    }
    console.log('┌────────────────────────────────────────────────┐');
    console.log('│     OnStock — datos demostrativos listos       │');
    console.log('├────────────────────────────────────────────────┤');
    console.log(`│  Datos:       ${pad(truncatePath(flags.data, 32), 32)} │`);
    console.log(`│  Categorías:  ${padNum(rep.categories, 32)} │`);
    console.log(`│  Proveedores: ${padNum(rep.suppliers, 32)} │`);
    console.log(`│  Productos:   ${padNum(rep.products, 32)} │`);
    console.log(`│  Compras:     ${padNum(rep.purchases, 32)} │`);
    console.log(`│  Ventas:      ${padNum(rep.sales, 32)} │`);
    console.log(`│  Gastos:      ${padNum(rep.expenses, 32)} │`);
    console.log(`│  Stock bajo:  ${padNum(rep.low_stock, 32)} │`);
    console.log('│  Empresa: Abarrotes El Progreso (SPS)          │');
    console.log('└────────────────────────────────────────────────┘');
    console.log('Siguiente: make dev  →  http://localhost:8080/#/vito');
    st.close();
    return;
  }

  // Primer arranque: una base recién creada no tiene nada que mostrar, así que
  // cargamos el set de ejemplo (Abarrotes El Progreso) para que el sistema abra
  // con inventario, ventas, compras y reportes reales. Con -vacio se omite, y
  // si ya hay productos no se toca absolutamente nada.
  if (!flags.vacio && st.isEmpty()) {
    try {
      const rep = st.seedDemo(false);
      console.log(`Primer arranque: se cargaron datos de ejemplo (${rep.products} productos, ${rep.sales} ventas, ${rep.purchases} compras).`);
      console.log('Para empezar con el sistema en blanco: borre la carpeta de datos y ejecute con -vacio.');
    } catch (err) {
      console.log(`datos de ejemplo: ${err.message}`);
    }
  }

  const baseURL = `http://localhost:${flags.port}`;
  let handler;
  let openURL;

  if (flags.caja) {
    // Proceso del cajero: misma BD, solo API de cobro + caja.html
    handler = new API(st, null, null).router(WEB_DIR, { cajaOnly: true });
    openURL = `${baseURL}/caja.html`;

    console.log('┌────────────────────────────────────────────────┐');
    console.log('│        OnStock — CAJA (solo registradora)      │');
    console.log('├────────────────────────────────────────────────┤');
    console.log(`│  Caja:      ${pad(openURL, 34)} │`);
    if (flags.host !== '127.0.0.1' && flags.host !== 'localhost') {
      const lan = lanIP();
      if (lan !== '') console.log(`│  En la red: ${pad(`http://${lan}:${flags.port}/caja.html`, 34)} │`);
    }
    console.log(`│  Datos:     ${pad(truncatePath(flags.data, 34), 34)} │`);
    console.log('│  Sin finanzas · sin reportes · sin admin       │');
    console.log('│  Para apagar cierre esta ventana.              │');
    console.log('└────────────────────────────────────────────────┘');
  } else {
    // Vito: solo en modo admin (oficina). En -caja el cajero no ve ni usa Vito.
    const host = bootstrap(BASE_DIR, st);
    handler = new API(st, host.service, host.catalog).router(WEB_DIR);
    openURL = baseURL;

    let vitoLine = 'apagado';
    if (host.service && host.service.enabled()) {
      vitoLine = host.fallback ? 'activo (local)' : 'activo';
    }

    console.log('┌────────────────────────────────────────────────┐');
    console.log('│   OnStock — Administración (sistema completo)  │');
    console.log('├────────────────────────────────────────────────┤');
    console.log(`│  Interfaz:  ${pad(openURL, 34)} │`);
    if (flags.host !== '127.0.0.1' && flags.host !== 'localhost') {
      const lan = lanIP();
      if (lan !== '') console.log(`│  En la red: ${pad(`http://${lan}:${flags.port}`, 34)} │`);
    }
    console.log(`│  Datos:     ${pad(truncatePath(flags.data, 34), 34)} │`);
    console.log(`│  Vito:      ${pad(vitoLine, 34)} │`);
    console.log('│  Cajero en otro PC: make caja (o -caja)        │');
    console.log('│  Para apagar el sistema cierre esta ventana.   │');
    console.log('└────────────────────────────────────────────────┘');
  }

  const servidor = http.createServer(logMiddleware(handler));
  servidor.headersTimeout = 10000; // equivale a ReadHeaderTimeout
  servidor.on('error', (err) => {
    console.error(`Error del servidor: ${err.message}`);
    process.exit(1);
  });
  servidor.listen(flags.port, flags.host);

  // En Windows (PC de la tienda) abrimos el navegador automáticamente.
  if (!flags['no-open'] && process.platform === 'win32') {
    setTimeout(() => {
      execFile('rundll32', ['url.dll,FileProtocolHandler', openURL], () => {});
    }, 600);
  }

  const apagar = () => {
    servidor.close(() => {
      st.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', apagar);
  process.on('SIGTERM', apagar);
}

main().catch((err) => {
  console.error(`Error abriendo la base de datos: ${err.message}`);
  process.exit(1);
});
