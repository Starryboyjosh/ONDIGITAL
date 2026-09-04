// equivalencia.mjs — compara el binario de Go (dist/onstock-linux) contra el
// servidor Node de server/ para demostrar que el port no cambió el comportamiento.
//
// El port de Go a Node se hizo a mano; esto es la prueba de que salió bien.
// Levanta los dos servidores contra COPIAS SEPARADAS de la misma base, pide los
// mismos endpoints a los dos y compara el JSON campo por campo. Después corre
// las mismas mutaciones en ambos y compara las tablas resultantes con SQL.
//
//   node server/tools/equivalencia.mjs                 # lecturas + mutaciones
//   node server/tools/equivalencia.mjs --solo-lecturas # sin tocar las bases
//   node server/tools/equivalencia.mjs --dir /ruta      # dónde montar las copias
//
// Sale con código 1 si aparece cualquier diferencia no declarada.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { filasXLSX, filasPDF, barrasPNG } from './artefactos.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..'); // onstock/
const BIN_GO = path.join(RAIZ, 'dist', 'onstock-linux');
const BD_ORIGEN = path.join(RAIZ, 'data', 'onstock.db');

const args = process.argv.slice(2);
const soloLecturas = args.includes('--solo-lecturas');
const iDir = args.indexOf('--dir');
const BASE = iDir >= 0 ? args[iDir + 1] : path.join(os.tmpdir(), 'onstock-equivalencia');
const PUERTO_GO = 8191;
const PUERTO_NODE = 8192;

// ── Diferencias conocidas y explicadas ──────────────────────────────────────
//
// AVISO IMPORTANTE SOBRE EL BINARIO DE REFERENCIA.
// dist/onstock-linux se compiló el 16 de agosto de 2026 y el árbol de Go siguió
// cambiando después: los commits 75060f9 y 0bbf41a tocaron internal/store y
// internal/httpapi. El port se hizo contra HEAD, así que en los sitios que esos
// dos commits cambiaron el binario y el port dicen cosas distintas *a propósito*:
// el que está desactualizado es el binario. Cada caso lleva abajo el commit que
// lo explica y qué línea de Go cambió, para que se pueda comprobar con
// `git diff d7d0b4b HEAD -- onstock/internal`.
//
// Si algún día se recompila el binario desde HEAD, estas entradas deben dejar de
// dispararse. Que una siga saltando querría decir que el port se desvió de veras.
const DECLARADAS = [
  {
    // No es cosa del binario viejo: es una decisión del port. Go contesta con el
    // `http.NotFound` de la biblioteca estándar, en inglés. Todo lo que ve el
    // usuario de OnStock está en español, y el cuerpo de un 404 también lo es.
    ruta: /./,
    campo: /^cuerpo$/,
    valorGo: /^404 page not found$/,
    razon: 'El 404 del servidor de estáticos va en español ("404 página no encontrada"). '
      + 'Divergencia deliberada del port: el original usaba el texto en inglés de la '
      + 'biblioteca estándar de Go.',
  },
  {
    ruta: /^\/api\/(sales|dashboard)/,
    campo: /^(id|sale_number|customer_name|customer_rtn|sale_date|subtotal|discount|discount_net|isv|total|cost_total|payment_method|status|notes|created_at|length)$/,
    razon: 'Orden de la lista de ventas. El binario ordena por id; HEAD ordena por '
      + '`sale_date DESC, id DESC` (0bbf41a, internal/store/sales.go). Son las mismas '
      + '16 ventas en distinto orden, no ventas distintas.',
  },
  {
    ruta: /^\/api\/reports\/monthly-summary/,
    campo: /^(revenue|profit)$/,
    razon: 'Reparto proporcional del subtotal entre las líneas de cada venta '
      + '(k = subtotal / SUM(qty*unit_price)), para que el top de productos cuadre con '
      + 'el estado de resultados (0bbf41a, internal/store/reports.go). El binario suma '
      + 'las líneas en bruto y se desvía unos centavos.',
  },
];

// Diferencias declaradas dentro del contenido de un artefacto (Excel o PDF).
const DECLARADAS_ARTEFACTO = [
  {
    ruta: /export/,
    par: { go: /(^|[^\d])-0\.00($|[^\d])/, node: /(^|[^\d-])0\.00($|[^\d])/ },
    razon: 'El binario imprime "-0.00" en una línea sin movimiento; HEAD la imprime '
      + '"0.00" (0bbf41a, función neg() en internal/httpapi/exports.go).',
  },
  {
    ruta: /^\/api\/reports\/monthly-summary\/export/,
    // Una fila del top de productos se reconoce por su SKU; así la excepción no
    // tapa ningún otro renglón del informe.
    par: { go: /[A-Z]{3}-\d{3}/, node: /[A-Z]{3}-\d{3}/ },
    razon: 'Importes del top de productos: el binario suma las líneas en bruto y HEAD '
      + 'reparte el subtotal real de cada venta en proporción a cada línea, para que el '
      + 'top cuadre con el estado de resultados (0bbf41a, internal/store/reports.go). '
      + 'Las cantidades y los productos coinciden; solo cambian centavos en importe y '
      + 'utilidad.',
  },
  {
    ruta: /^\/api\/reports\/(sales|monthly-summary)\/export/,
    valor: /^‹orden›$/,
    razon: 'Las mismas filas en otro orden: el binario ordena las ventas por id y '
      + 'HEAD por `sale_date DESC, id DESC` (0bbf41a, internal/store/sales.go). '
      + 'El contenido coincide línea por línea.',
  },
];

function declarada(ruta, camino, valorGo) {
  const hoja = camino.split('.').pop().replace(/\[\d+\]$/, '');
  return DECLARADAS.find((d) => d.ruta.test(ruta) && d.campo.test(hoja)
    && (d.valorGo === undefined || d.valorGo.test(String(valorGo).replace(/^"|"$/g, '')))) ?? null;
}

// declaradaArtefacto mira el contenido concreto de la diferencia. Una entrada con
// `valor` cubre un desajuste suelto (por ejemplo, el orden de las filas); una con
// `par` exige que la línea de Go Y la de Node encajen las dos, que es lo que evita
// que una excepción escrita para un caso tape cualquier otro parecido.
function declaradaArtefacto(ruta, d) {
  return DECLARADAS_ARTEFACTO.find((e) => {
    if (!e.ruta.test(ruta)) return false;
    if (e.valor) return e.valor.test(String(d.valor));
    return e.par.go.test(String(d.go)) && e.par.node.test(String(d.node));
  }) ?? null;
}

// ── Catálogo de lecturas ────────────────────────────────────────────────────
// Todos los endpoints GET que registra api/index.js, con los parámetros que la
// interfaz usa de verdad (web/js/api.js), incluidos los filtros y los límites.
function lecturas() {
  const L = [];
  const g = (ruta, nota = '') => L.push({ ruta, nota });

  // Dashboard y configuración
  g('/api/dashboard');
  g('/api/settings');

  // Tenant y módulos
  g('/api/tenant');
  g('/api/modules');

  // Productos — sin filtros y con cada filtro por separado
  g('/api/products');
  g('/api/products?q=arroz');
  g('/api/products?q=ZZZ-no-existe', 'lista vacía');
  g('/api/products?category_id=2');
  g('/api/products?supplier_id=1');
  g('/api/products?low_stock=1');
  g('/api/products?inactive=1');
  g('/api/products?q=a&category_id=2&low_stock=1', 'filtros combinados');
  g('/api/products/next-sku');
  g('/api/products/next-sku?category_id=2');
  for (const id of [1, 2, 3, 7, 21]) g(`/api/products/${id}`);
  g('/api/products/99999', '404 en ambos');
  g('/api/products/abc', '400 en ambos: id no numérico');

  // Categorías y proveedores
  g('/api/categories');
  g('/api/suppliers');
  for (const id of [1, 2, 3]) g(`/api/suppliers/${id}`);
  g('/api/suppliers/99999', '404 en ambos');

  // Inventario
  g('/api/movements');
  g('/api/movements?limit=5');
  g('/api/movements?type=entrada');
  g('/api/movements?type=salida');
  g('/api/movements?product_id=2');
  g('/api/movements?from=2026-07-01&to=2026-07-31');

  // Ventas
  g('/api/sales');
  g('/api/sales?limit=3');
  g('/api/sales?status=completada');
  g('/api/sales?status=anulada');
  g('/api/sales?from=2026-07-01&to=2026-07-31');
  g('/api/sales?q=V-000002');
  for (const id of [1, 2, 3]) g(`/api/sales/${id}`);
  g('/api/sales/99999', '404 en ambos');

  // Órdenes de compra
  g('/api/purchase-orders');
  g('/api/purchase-orders?status=pendiente');
  g('/api/purchase-orders?status=recibida');
  g('/api/purchase-orders?supplier_id=1');
  g('/api/purchase-orders?limit=2');
  for (const id of [1, 2]) g(`/api/purchase-orders/${id}`);
  g('/api/purchase-orders/99999', '404 en ambos');

  // Gastos
  g('/api/expenses');
  g('/api/expenses?limit=4');
  g('/api/expenses?category=administrativo');
  g('/api/expenses?from=2026-07-01&to=2026-07-31');

  // Reportes
  g('/api/reports/income-statement?from=2026-01-01&to=2026-12-31');
  g('/api/reports/income-statement?from=2026-07-01&to=2026-07-31');
  g('/api/reports/income-statement', 'rango por defecto: mes en curso');
  g('/api/reports/income-statement?from=2020-01-01&to=2020-12-31', 'periodo sin datos');
  g('/api/reports/monthly-summary?year=2026&month=7');
  g('/api/reports/monthly-summary?year=2026&month=8');
  g('/api/reports/monthly-summary', 'mes en curso por defecto');

  // Vito (estado; no se le pregunta nada para no llamar al motor)
  g('/api/vito/status');

  // Binarios: exportaciones, código de barras y etiquetas
  for (const f of ['', '&format=pdf']) {
    g(`/api/reports/income-statement/export?from=2026-01-01&to=2026-12-31${f}`);
    g(`/api/reports/sales/export?from=2026-01-01&to=2026-12-31${f}`);
    g(`/api/reports/monthly-summary/export?year=2026&month=7${f}`);
  }
  g('/api/reports/inventory/export');
  g('/api/reports/inventory/export?format=pdf');
  g('/api/barcode/7501234567890.png');
  g('/api/barcode/ABA-001.png?w=300&h=100');
  g('/api/labels/pdf?ids=1,2,3&copies=2');

  // Método equivocado sobre rutas que existen → 405 con la misma cabecera Allow
  L.push({ ruta: '/api/dashboard', metodo: 'DELETE', nota: '405 en ambos' });
  L.push({ ruta: '/api/products/1', metodo: 'PATCH', nota: '405 en ambos' });

  return L;
}

// ── Comparación ─────────────────────────────────────────────────────────────
const BINARIO = /^(application\/(vnd\.openxmlformats|pdf|zip)|image\/)/;

// difiere recorre dos valores en paralelo y devuelve la lista de caminos que no
// coinciden. Compara el ORDEN de las claves además del contenido: la interfaz
// no depende de él, pero un orden distinto delata que una struct se tradujo mal.
function difiere(a, b, camino = '', out = []) {
  if (a === b) return out;
  const ta = a === null ? 'null' : Array.isArray(a) ? 'array' : typeof a;
  const tb = b === null ? 'null' : Array.isArray(b) ? 'array' : typeof b;
  if (ta !== tb) {
    out.push({ camino, go: resumen(a), node: resumen(b), tipo: 'tipo distinto' });
    return out;
  }
  if (ta === 'array') {
    if (a.length !== b.length) {
      out.push({ camino: `${camino}.length`, go: a.length, node: b.length, tipo: 'largo' });
    }
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      difiere(a[i], b[i], `${camino}[${i}]`, out);
    }
    return out;
  }
  if (ta === 'object') {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    for (const k of ka) {
      if (!(k in b)) out.push({ camino: `${camino}.${k}`, go: resumen(a[k]), node: '‹ausente›', tipo: 'clave solo en Go' });
    }
    for (const k of kb) {
      if (!(k in a)) out.push({ camino: `${camino}.${k}`, go: '‹ausente›', node: resumen(b[k]), tipo: 'clave solo en Node' });
    }
    if (ka.length === kb.length && ka.join() !== kb.join()) {
      out.push({ camino, go: ka.join(','), node: kb.join(','), tipo: 'orden de claves' });
    }
    for (const k of ka) if (k in b) difiere(a[k], b[k], camino ? `${camino}.${k}` : k, out);
    return out;
  }
  out.push({ camino, go: resumen(a), node: resumen(b), tipo: 'valor' });
  return out;
}

function resumen(v) {
  const s = typeof v === 'string' ? JSON.stringify(v) : String(v);
  return s.length > 90 ? `${s.slice(0, 87)}…` : s;
}

async function pedir(base, l) {
  const r = await fetch(base + l.ruta, { method: l.metodo ?? 'GET' });
  const ct = r.headers.get('content-type') ?? '';
  const salida = {
    estado: r.status,
    tipo: ct.split(';')[0].trim(),
    allow: r.headers.get('allow') ?? undefined,
    disposicion: (r.headers.get('content-disposition') ?? '').replace(/\d{8}(-\d{6})?/g, '‹fecha›') || undefined,
  };
  if (BINARIO.test(ct)) {
    // Los bytes de un XLSX, un PDF o un PNG dependen del escritor, no del
    // contenido: excelize ordena el ZIP de otra manera, fpdf numera otros
    // objetos y png.Encode elige otra profundidad de bit. Comparar bytes solo
    // demuestra que son dos programas distintos. Lo que se compara es lo que el
    // archivo DICE: las celdas del Excel, el texto del PDF y las barras del PNG.
    const b = Buffer.from(await r.arrayBuffer());
    salida.bytes = b.length;
    try {
      if (ct.includes('spreadsheet')) salida.contenido = filasXLSX(b);
      else if (ct === 'application/pdf') salida.contenido = filasPDF(b);
      else if (ct === 'image/png') salida.contenido = [barrasPNG(b).patron];
      else salida.contenido = [`‹${b.length} bytes sin lector›`];
    } catch (e) {
      salida.contenido = [`‹no se pudo leer: ${e.message}›`];
    }
  } else {
    const t = await r.text();
    try { salida.cuerpo = JSON.parse(t); } catch { salida.cuerpo = t.trim(); }
  }
  return salida;
}

// normaliza borra lo que no es contenido: el tamaño en bytes de un artefacto
// depende del escritor que lo generó, no de lo que dice.
function normaliza(o) {
  const c = { ...o };
  delete c.bytes;
  delete c.contenido;
  return c;
}

// comparaContenido enfrenta lo que dicen dos artefactos, en tres escalones:
// mismo contenido en el mismo orden, mismo contenido en otro orden, o contenido
// distinto. El escalón del medio existe porque el binario de referencia ordena
// las ventas de otra manera que HEAD; separarlo evita que un simple reordenado
// se presente como cien líneas distintas, y evita también lo contrario, que un
// reordenado pase inadvertido por comparar sin orden.
function comparaContenido(go, node) {
  if (go.length === node.length && go.every((v, i) => v === node[i])) return [];
  const cuenta = (xs) => {
    const m = new Map();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return m;
  };
  const a = cuenta(go); const b = cuenta(node);
  const difs = [];
  for (const [k, n] of a) {
    const m = b.get(k) ?? 0;
    if (n > m) difs.push({ camino: 'contenido', go: k, node: '‹ausente›', tipo: 'solo en Go', valor: k });
  }
  for (const [k, n] of b) {
    const m = a.get(k) ?? 0;
    if (n > m) difs.push({ camino: 'contenido', go: '‹ausente›', node: k, tipo: 'solo en Node', valor: k });
  }
  if (difs.length === 0) {
    difs.push({
      camino: 'contenido',
      go: `${go.length} líneas`,
      node: `${node.length} líneas`,
      tipo: 'mismo contenido, otro orden',
      valor: '‹orden›',
    });
    return difs;
  }
  return emparejaCentavos(difs);
}

// esqueleto sustituye cada número por "#": dos líneas con el mismo esqueleto son
// la misma línea con otras cifras.
function esqueleto(linea) {
  return linea.replace(/-?\d+(?:[.,]\d+)*/g, '#');
}

function cifras(linea) {
  return [...linea.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}

// emparejaCentavos junta una línea que solo está en Go con la que solo está en
// Node cuando son la misma línea con las cifras corridas por menos de un lempira.
// Sin esto, siete productos cuyo importe cambia dos centavos se presentan como
// catorce líneas sueltas y no se ve que son siete parejas.
const TOLERANCIA = 1;

function emparejaCentavos(difs) {
  const soloGo = difs.filter((d) => d.tipo === 'solo en Go');
  const soloNode = difs.filter((d) => d.tipo === 'solo en Node');
  const resto = difs.filter((d) => d.tipo !== 'solo en Go' && d.tipo !== 'solo en Node');
  const usados = new Set();
  const out = [...resto];
  for (const g of soloGo) {
    const eg = esqueleto(g.go);
    const cg = cifras(g.go);
    // Una línea que es solo un número no se empareja con nada: sin texto
    // alrededor no hay forma de saber que las dos son la misma línea, y el
    // texto de un PDF viene partido en palabras sueltas.
    if (eg === '#') { out.push(g); continue; }
    const pareja = soloNode.find((n) => !usados.has(n)
      && esqueleto(n.node) === eg
      && cifras(n.node).length === cg.length
      && cifras(n.node).every((v, i) => Math.abs(v - cg[i]) < TOLERANCIA));
    if (!pareja) { out.push(g); continue; }
    usados.add(pareja);
    out.push({
      camino: 'contenido',
      go: g.go,
      node: pareja.node,
      tipo: 'misma línea, cifras corridas por centavos',
      valor: '‹centavos›',
    });
  }
  for (const n of soloNode) if (!usados.has(n)) out.push(n);
  return out;
}

async function compararLecturas(baseGo, baseNode) {
  const lista = lecturas();
  const filas = [];
  for (const l of lista) {
    let go; let node;
    try { go = await pedir(baseGo, l); } catch (e) { go = { error: String(e.message) }; }
    try { node = await pedir(baseNode, l); } catch (e) { node = { error: String(e.message) }; }
    const ds = difiere(normaliza(go), normaliza(node));
    if (go.contenido && node.contenido) ds.push(...comparaContenido(go.contenido, node.contenido));
    const declaradas = [];
    const reales = [];
    for (const d of ds) {
      const dec = d.camino === 'contenido'
        ? declaradaArtefacto(l.ruta, d)
        : declarada(l.ruta, d.camino, d.go);
      (dec ? declaradas : reales).push(dec ? { ...d, razon: dec.razon } : d);
    }
    filas.push({ ...l, metodo: l.metodo ?? 'GET', go, node, reales, declaradas });
  }
  return filas;
}

// ── Mutaciones ──────────────────────────────────────────────────────────────
// Las cinco operaciones que mueven dinero o existencias. Se mandan idénticas a
// los dos servidores; después se comparan las tablas, no las respuestas.
//
// Los nombres de campo son los de las structs de internal/store/models.go
// (`qty`, no `quantity`): el decodificador de Go descarta en silencio lo que no
// reconoce, así que un nombre equivocado no da error, da una fila en cero.
function mutaciones() {
  return [
    {
      nombre: 'venta con descuento',
      metodo: 'POST',
      ruta: '/api/sales',
      cuerpo: {
        customer_name: 'Cliente Equivalencia',
        customer_rtn: '08011999123456',
        payment_method: 'efectivo',
        discount: 25,
        notes: 'prueba de equivalencia',
        items: [
          { product_id: 2, qty: 3, unit_price: 59.13 },
          { product_id: 4, qty: 2 },
        ],
      },
    },
    {
      nombre: 'orden de compra',
      metodo: 'POST',
      ruta: '/api/purchase-orders',
      cuerpo: {
        supplier_id: 1,
        order_date: '2026-09-03',
        expected_date: '2026-09-20',
        notes: 'compra de equivalencia',
        items: [
          { product_id: 2, qty: 24, unit_cost: 41.5 },
          { product_id: 4, qty: 12, unit_cost: 36 },
        ],
      },
    },
    {
      nombre: 'recepción de la orden',
      metodo: 'POST',
      // {po} se sustituye por el id que devolvió la mutación anterior. Recibir
      // mueve existencias y recalcula el costo promedio ponderado.
      ruta: '/api/purchase-orders/{po}/status',
      cuerpo: { status: 'recibida' },
    },
    {
      nombre: 'gasto',
      metodo: 'POST',
      ruta: '/api/expenses',
      cuerpo: {
        expense_date: '2026-09-03',
        category: 'administrativo',
        description: 'Gasto de equivalencia',
        amount: 1234.56,
        supplier_id: 1,
        notes: 'prueba de equivalencia',
      },
    },
    {
      nombre: 'ajuste de inventario (salida)',
      metodo: 'POST',
      ruta: '/api/movements',
      cuerpo: {
        product_id: 3,
        type: 'salida',
        qty: 4,
        notes: 'merma verificada',
      },
    },
    {
      nombre: 'anulación de la venta',
      metodo: 'POST',
      // Repone existencias y saca la venta de los reportes: es la mutación que
      // más tablas toca a la vez.
      ruta: '/api/sales/{venta}/void',
      cuerpo: {},
    },
  ];
}

async function correrMutaciones(base) {
  const salidas = [];
  let poID = 0;
  let ventaID = 0;
  for (const m of mutaciones()) {
    const ruta = m.ruta.replace('{po}', String(poID)).replace('{venta}', String(ventaID));
    const r = await fetch(base + ruta, {
      method: m.metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(m.cuerpo),
    });
    const t = await r.text();
    let cuerpo;
    try { cuerpo = JSON.parse(t); } catch { cuerpo = t.trim(); }
    if (m.ruta === '/api/purchase-orders' && cuerpo && cuerpo.id) poID = cuerpo.id;
    if (m.ruta === '/api/sales' && cuerpo && cuerpo.id) ventaID = cuerpo.id;
    salidas.push({ nombre: m.nombre, ruta, estado: r.status, cuerpo });
  }
  return salidas;
}

// ── Comparación de tablas ───────────────────────────────────────────────────
const TABLAS = [
  ['products', 'id'],
  ['categories', 'id'],
  ['suppliers', 'id'],
  ['stock_movements', 'id'],
  ['sales', 'id'],
  ['sale_items', 'id'],
  ['purchase_orders', 'id'],
  ['purchase_order_items', 'id'],
  ['expenses', 'id'],
  ['settings', 'key'],
];

// Columnas cuyo valor es la hora del reloj: dos procesos no pueden coincidir en
// el segundo. Se compara que ESTÉN y que sean plausibles, no su valor.
const RELOJ = /_at$|^(sale_date|order_date|received_date|movement_date)$/;

function filasDe(bd, tabla, clave) {
  return bd.prepare(`SELECT * FROM ${tabla} ORDER BY ${clave}`).all();
}

function compararTablas(rutaGo, rutaNode) {
  const g = new DatabaseSync(rutaGo, { readOnly: true });
  const n = new DatabaseSync(rutaNode, { readOnly: true });
  const informe = [];
  for (const [tabla, clave] of TABLAS) {
    const fg = filasDe(g, tabla, clave);
    const fn = filasDe(n, tabla, clave);
    const difs = [];
    if (fg.length !== fn.length) {
      difs.push({ camino: `${tabla}.filas`, go: fg.length, node: fn.length, tipo: 'conteo' });
    }
    for (let i = 0; i < Math.min(fg.length, fn.length); i++) {
      const a = { ...fg[i] };
      const b = { ...fn[i] };
      for (const k of Object.keys(a)) {
        if (!RELOJ.test(k)) continue;
        // Se exige que ambos tengan valor no vacío; el instante en sí no.
        const va = a[k]; const vb = b[k];
        if ((va == null) !== (vb == null)) {
          difs.push({ camino: `${tabla}[${a[clave]}].${k}`, go: String(va), node: String(vb), tipo: 'una sí y la otra no' });
        }
        delete a[k]; delete b[k];
      }
      difiere(a, b, `${tabla}[${fg[i][clave]}]`, difs);
    }
    informe.push({ tabla, filasGo: fg.length, filasNode: fn.length, difs });
  }
  g.close();
  n.close();
  return informe;
}

// ── Arranque de los dos servidores ──────────────────────────────────────────
async function esperar(base, ms = 15000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    try {
      const r = await fetch(`${base}/api/settings`);
      if (r.ok) return true;
    } catch { /* todavía no levanta */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

function levantar(cmd, argv, cwd, log) {
  const salida = fs.openSync(log, 'w');
  const p = spawn(cmd, argv, { cwd, stdio: ['ignore', salida, salida], detached: false });
  return p;
}

async function main() {
  if (!fs.existsSync(BIN_GO)) {
    console.error(`No está el binario de referencia: ${BIN_GO}`);
    console.error('Sin él no hay contra qué comparar. Compílelo con `make build` donde haya Go.');
    process.exit(2);
  }
  if (!fs.existsSync(BD_ORIGEN)) {
    console.error(`No está la base de origen: ${BD_ORIGEN}`);
    process.exit(2);
  }

  fs.rmSync(BASE, { recursive: true, force: true });
  fs.mkdirSync(path.join(BASE, 'go'), { recursive: true });
  fs.mkdirSync(path.join(BASE, 'node'), { recursive: true });
  fs.copyFileSync(BD_ORIGEN, path.join(BASE, 'go', 'onstock.db'));
  fs.copyFileSync(BD_ORIGEN, path.join(BASE, 'node', 'onstock.db'));

  const baseGo = `http://127.0.0.1:${PUERTO_GO}`;
  const baseNode = `http://127.0.0.1:${PUERTO_NODE}`;
  const pGo = levantar(BIN_GO, ['-port', String(PUERTO_GO), '-no-open', '-data', path.join(BASE, 'go')], RAIZ, path.join(BASE, 'go.log'));
  const pNode = levantar(process.execPath, [path.join(RAIZ, 'server', 'index.js'), '-port', String(PUERTO_NODE), '-no-open', '-data', path.join(BASE, 'node')], RAIZ, path.join(BASE, 'node.log'));
  const cerrar = () => { try { pGo.kill('SIGTERM'); } catch {} try { pNode.kill('SIGTERM'); } catch {} };
  process.on('exit', cerrar);
  process.on('SIGINT', () => { cerrar(); process.exit(130); });

  if (!await esperar(baseGo)) { cerrar(); console.error('El binario de Go no respondió.'); process.exit(2); }
  if (!await esperar(baseNode)) { cerrar(); console.error('El servidor Node no respondió.'); process.exit(2); }

  console.log(`OnStock · equivalencia Go ↔ Node`);
  console.log(`  Go   ${baseGo}  ← ${path.join(BASE, 'go')}`);
  console.log(`  Node ${baseNode}  ← ${path.join(BASE, 'node')}`);
  console.log('');

  // ── Lecturas ──
  const filas = await compararLecturas(baseGo, baseNode);
  let iguales = 0; let conDif = 0; let conDeclaradas = 0;
  for (const f of filas) {
    if (f.reales.length === 0 && f.declaradas.length === 0) { iguales++; continue; }
    if (f.reales.length === 0) { conDeclaradas++; } else { conDif++; }
    console.log(`  ✗ ${f.metodo} ${f.ruta}${f.nota ? `   (${f.nota})` : ''}`);
    for (const d of f.reales) {
      console.log(`      ${d.tipo} · ${d.camino || '‹raíz›'}`);
      console.log(`        go   = ${d.go}`);
      console.log(`        node = ${d.node}`);
    }
    for (const d of f.declaradas) {
      console.log(`      declarada · ${d.camino}: go=${d.go} node=${d.node}`);
      console.log(`        ${d.razon}`);
    }
  }
  console.log('');
  console.log(`LECTURAS  ${filas.length} peticiones · ${iguales} idénticas · ${conDeclaradas} con diferencia declarada · ${conDif} con diferencia real`);

  let difsTabla = 0;
  let mutacionesMal = 0;
  if (!soloLecturas) {
    console.log('');
    const mg = await correrMutaciones(baseGo);
    const mn = await correrMutaciones(baseNode);
    for (let i = 0; i < mg.length; i++) {
      const igual = mg[i].estado === mn[i].estado;
      // Dos servidores que rechazan la misma petición coinciden, sí, pero no han
      // probado nada: la mutación tiene que haber entrado para que las tablas
      // signifiquen algo. Un 4xx cuenta como fallo aunque sea idéntico.
      const entro = mg[i].estado < 400;
      if (!igual || !entro) mutacionesMal++;
      console.log(`  ${igual && entro ? '·' : '✗'} ${mg[i].nombre}: go ${mg[i].estado} · node ${mn[i].estado}`);
      if (!igual || !entro) {
        console.log(`      go   ${JSON.stringify(mg[i].cuerpo).slice(0, 300)}`);
        console.log(`      node ${JSON.stringify(mn[i].cuerpo).slice(0, 300)}`);
      }
    }
    // Los dos servidores tienen que soltar la base antes de leerla con SQL.
    cerrar();
    await new Promise((r) => setTimeout(r, 1200));
    console.log('');
    const inf = compararTablas(path.join(BASE, 'go', 'onstock.db'), path.join(BASE, 'node', 'onstock.db'));
    for (const t of inf) {
      if (t.difs.length === 0) {
        console.log(`  · ${t.tabla.padEnd(22)} ${String(t.filasGo).padStart(5)} filas   idénticas`);
        continue;
      }
      difsTabla += t.difs.length;
      console.log(`  ✗ ${t.tabla.padEnd(22)} go ${t.filasGo} · node ${t.filasNode}`);
      for (const d of t.difs.slice(0, 12)) {
        console.log(`      ${d.tipo} · ${d.camino}: go=${d.go} node=${d.node}`);
      }
      if (t.difs.length > 12) console.log(`      … y ${t.difs.length - 12} más`);
    }
    console.log('');
    console.log(`TABLAS    ${inf.length} tablas · ${inf.filter((t) => t.difs.length === 0).length} idénticas · ${inf.filter((t) => t.difs.length > 0).length} con diferencias`);
  }

  cerrar();
  const fallo = conDif > 0 || difsTabla > 0 || mutacionesMal > 0;
  console.log('');
  console.log(fallo ? 'RESULTADO: hay diferencias sin explicar.' : 'RESULTADO: equivalente.');
  process.exit(fallo ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
