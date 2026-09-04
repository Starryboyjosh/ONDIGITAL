// Traducción de las pruebas de Go: store/seed_demo_test.go, store/reports_test.go,
// store/backup_test.go, httpapi/caja_test.go y vitohost/tools_test.go.
//
// Se corren con `node --test server/` (node:test es biblioteca estándar).
// Comprueban exactamente las mismas invariantes que exigía el binario: que el
// reporte de productos top cuadre con el estado de resultados, que una venta
// anulada desaparezca de los informes y reponga el stock, que una salida manual
// no deje el inventario en negativo sin permiso, y que el proceso de caja no
// filtre las finanzas.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

import { open } from './store/index.js';
import { API } from './api/index.js';
import { Registry } from './vito/registry.js';
import { Service } from './vito/service.js';
import { ProveedorLocal } from './vito/proveedorLocal.js';
import { registerOnStockTools } from './vito/herramientas.js';
import { ymd } from './lib/fechas.js';

const temporales = [];

function dirTemporal() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'onstock-prueba-'));
  temporales.push(d);
  return d;
}

function abrirStore() {
  const st = open(dirTemporal());
  temporales.push(st);
  return st;
}

test.after(() => {
  for (const t of temporales) {
    if (typeof t === 'string') fs.rmSync(t, { recursive: true, force: true });
    else t.close();
  }
});

// ── store/seed_demo_test.go ─────────────────────────────

test('seedDemo carga un set completo y solo se repite con force', () => {
  const st = abrirStore();
  const rep = st.seedDemo(false);
  assert.ok(rep.products >= 15 && rep.sales >= 10 && rep.low_stock >= 3,
    `set demasiado flaco: ${JSON.stringify(rep)}`);

  // Sembrar dos veces sin force tiene que fallar.
  assert.throws(() => st.seedDemo(false), /ya hay \d+ productos/);

  // Con force vuelve a sembrar el mismo catálogo.
  const rep2 = st.seedDemo(true);
  assert.equal(rep2.products, rep.products);

  const low = st.listProducts({ lowStock: true });
  assert.ok(low.length >= 3, `se esperaban varios productos en rojo, hay ${low.length}`);
});

// ── store/reports_test.go ───────────────────────────────

// El reporte "Top productos" y el Estado de Resultados se miran en la misma
// pantalla: si no suman lo mismo, el dueño deja de creerle al sistema.
test('top de productos cuadra con el estado de resultados', () => {
  const st = abrirStore();
  st.seedDemo(false);

  const from = '2000-01-01';
  const to = ymd(new Date());
  const is = st.incomeStatement(from, to);
  assert.ok(is.descuentos > 0,
    'el set de ejemplo no tiene ninguna venta con descuento; la prueba no probaría nada');

  const top = st.topProducts(from, to, 1000);
  assert.ok(top.length > 0, 'sin productos vendidos');

  let revenue = 0;
  let profit = 0;
  for (const p of top) {
    revenue += p.revenue;
    profit += p.profit;
  }
  // Cada fila viene redondeada a dos decimales; el error acumulable es el
  // redondeo, no la fórmula.
  const tol = 0.02 * top.length + 0.05;
  assert.ok(Math.abs(revenue - is.ventas_netas) <= tol,
    `ingresos de top productos ${revenue.toFixed(2)} != ventas netas ${is.ventas_netas.toFixed(2)} (tolerancia ${tol.toFixed(2)})`);
  // La utilidad arrastra además el redondeo de sales.cost_total (uno por venta).
  const tolCosto = tol + 0.01 * is.num_ventas;
  assert.ok(Math.abs(profit - is.utilidad_bruta) <= tolCosto,
    `utilidad de top productos ${profit.toFixed(2)} != utilidad bruta ${is.utilidad_bruta.toFixed(2)} (tolerancia ${tolCosto.toFixed(2)})`);
});

// Una venta anulada repone el stock y sale de todos los reportes.
test('una venta anulada no entra en los reportes', () => {
  const st = abrirStore();
  const p = st.createProduct({
    name: 'Producto de prueba', sku: 'TST-001',
    cost: 10, price: 23, isv_rate: 15, stock: 50, min_stock: 5, active: true,
  });
  const venta = st.createSale({
    customer_name: 'Cliente mostrador',
    items: [{ product_id: p.id, qty: 10 }],
  });
  const hoy = ymd(new Date());
  const antes = st.incomeStatement(hoy, hoy);
  assert.ok(antes.ventas_netas > 0, 'la venta no llegó al estado de resultados');

  st.voidSale(venta.id);

  const despues = st.incomeStatement(hoy, hoy);
  assert.ok(despues.ventas_netas === 0 && despues.costo_ventas === 0 && despues.num_ventas === 0,
    `la venta anulada sigue en el reporte: ${JSON.stringify(despues)}`);
  const top = st.topProducts(hoy, hoy, 10);
  assert.equal(top.length, 0, `la venta anulada sigue en top productos: ${JSON.stringify(top)}`);
  assert.equal(st.getProduct(p.id).stock, 50, 'el stock no se repuso');
});

// Una salida manual (merma) no puede dejar el inventario en negativo salvo que
// el dueño lo haya permitido explícitamente en Configuración.
test('la salida manual respeta el stock disponible', () => {
  const st = abrirStore();
  const p = st.createProduct({
    name: 'Merma', sku: 'TST-002', cost: 5, price: 12, isv_rate: 15, stock: 4, active: true,
  });
  assert.throws(() => st.adjustStock(p.id, 'salida', 9, 'Merma'), /stock insuficiente/,
    'se permitió sacar más de lo que hay con stock negativo deshabilitado');
  assert.equal(st.getProduct(p.id).stock, 4, 'la salida rechazada movió el stock');

  st.setSettings({ allow_negative_stock: '1' });
  st.adjustStock(p.id, 'salida', 9, 'Merma');
  assert.equal(st.getProduct(p.id).stock, -5);
});

// El costo promedio ponderado es la aritmética que más caro sale equivocar.
test('recibir una orden recalcula el costo promedio ponderado', () => {
  const st = abrirStore();
  const sp = st.createSupplier({ name: 'Proveedor de prueba', active: true });
  const p = st.createProduct({
    name: 'Ponderado', sku: 'TST-003', cost: 10, price: 20, isv_rate: 15,
    stock: 10, supplier_id: sp.id, active: true,
  });
  const po = st.createPurchaseOrder({
    supplier_id: sp.id,
    items: [{ product_id: p.id, qty: 30, unit_cost: 14 }],
  });
  st.setPOStatus(po.id, 'recibida');
  const after = st.getProduct(p.id);
  assert.equal(after.stock, 40);
  // (10×10 + 30×14) / 40 = 13
  assert.equal(after.cost, 13);
  // Una orden ya recibida no se vuelve a aplicar.
  assert.throws(() => st.setPOStatus(po.id, 'recibida'), /ya fue recibida/);
});

// ── Correcciones propias del port (no venían de Go) ─────

test('revertir una recepción devuelve stock y costo a como estaban', () => {
  const st = abrirStore();
  const sp = st.createSupplier({ name: 'Proveedor reversible', active: true });
  const p = st.createProduct({
    name: 'Revertible', sku: 'TST-010', cost: 10, price: 20, isv_rate: 15,
    stock: 10, supplier_id: sp.id, active: true,
  });
  const po = st.createPurchaseOrder({
    supplier_id: sp.id,
    items: [{ product_id: p.id, qty: 30, unit_cost: 14 }],
  });
  st.setPOStatus(po.id, 'recibida');
  assert.equal(st.getProduct(p.id).stock, 40);
  assert.equal(st.getProduct(p.id).cost, 13);

  const vuelto = st.revertPOReceipt(po.id);
  assert.equal(vuelto.status, 'enviada');
  const despues = st.getProduct(p.id);
  assert.equal(despues.stock, 10);
  assert.equal(despues.cost, 10);
  // Y se puede volver a recibir después de corregirla.
  st.setPOStatus(po.id, 'recibida');
  assert.equal(st.getProduct(p.id).stock, 40);
});

test('no se revierte una recepción si el producto ya se movió después', () => {
  const st = abrirStore();
  const sp = st.createSupplier({ name: 'Proveedor movido', active: true });
  const p = st.createProduct({
    name: 'Ya vendido', sku: 'TST-011', cost: 10, price: 20, isv_rate: 15,
    stock: 10, supplier_id: sp.id, active: true,
  });
  const po = st.createPurchaseOrder({
    supplier_id: sp.id,
    items: [{ product_id: p.id, qty: 30, unit_cost: 14 }],
  });
  st.setPOStatus(po.id, 'recibida');
  st.createSale({ payment_method: 'efectivo', items: [{ product_id: p.id, qty: 1 }] });
  assert.throws(() => st.revertPOReceipt(po.id), /ya se movió después/);
  // Y no dejó nada a medias: el stock sigue como estaba tras la venta.
  assert.equal(st.getProduct(p.id).stock, 39);
});

// Nada impide poner el mismo producto en dos renglones de la misma orden.
// Buscar el movimiento de entrada con MAX(id) por producto dejaba esa orden
// imposible de revertir: la salida que insertaba el primer renglón contaba como
// movimiento posterior para el segundo.
test('se revierte una recepción con el mismo producto en dos renglones', () => {
  const st = abrirStore();
  const sp = st.createSupplier({ name: 'Proveedor repetido', active: true });
  const p = st.createProduct({
    name: 'Repetido', sku: 'TST-014', cost: 10, price: 20, isv_rate: 15,
    stock: 10, supplier_id: sp.id, active: true,
  });
  const po = st.createPurchaseOrder({
    supplier_id: sp.id,
    items: [
      { product_id: p.id, qty: 10, unit_cost: 12 },
      { product_id: p.id, qty: 5, unit_cost: 14 },
    ],
  });
  st.setPOStatus(po.id, 'recibida');
  // (10×10 + 10×12) / 20 = 11, y sobre eso (20×11 + 5×14) / 25 = 11.6
  assert.equal(st.getProduct(p.id).stock, 25);
  assert.equal(st.getProduct(p.id).cost, 11.6);

  assert.equal(st.revertPOReceipt(po.id).status, 'enviada');
  const despues = st.getProduct(p.id);
  assert.equal(despues.stock, 10);
  assert.equal(despues.cost, 10);
});

// Y con renglones repetidos se sigue negando cuando el movimiento posterior es
// de verdad ajeno a la orden.
test('no se revierte una orden de renglones repetidos si hubo una venta', () => {
  const st = abrirStore();
  const sp = st.createSupplier({ name: 'Proveedor repetido y vendido', active: true });
  const p = st.createProduct({
    name: 'Repetido vendido', sku: 'TST-015', cost: 10, price: 20, isv_rate: 15,
    stock: 10, supplier_id: sp.id, active: true,
  });
  const po = st.createPurchaseOrder({
    supplier_id: sp.id,
    items: [
      { product_id: p.id, qty: 10, unit_cost: 12 },
      { product_id: p.id, qty: 5, unit_cost: 14 },
    ],
  });
  st.setPOStatus(po.id, 'recibida');
  st.createSale({ payment_method: 'efectivo', items: [{ product_id: p.id, qty: 2 }] });
  assert.throws(() => st.revertPOReceipt(po.id), /ya se movió después/);
  assert.equal(st.getProduct(p.id).stock, 23);
});

test('borrar un producto con kardex lo desactiva y conserva sus movimientos', () => {
  const st = abrirStore();
  const p = st.createProduct({
    name: 'Con kardex', sku: 'TST-012', cost: 10, price: 20, isv_rate: 15,
    stock: 0, active: true,
  });
  // Una entrada de inventario, sin ventas ni órdenes de compra: es justo el caso
  // que antes se borraba entero junto con su historial.
  st.adjustStock(p.id, 'entrada', 25, 'compra de contado');
  assert.equal(st.listMovements({ productID: p.id }).length, 1);

  assert.equal(st.deleteProduct(p.id), 'desactivado');
  const despues = st.getProduct(p.id);
  assert.equal(despues.active, false);
  assert.equal(despues.stock, 25);
  assert.equal(st.listMovements({ productID: p.id }).length, 1);
});

test('un producto que nunca se movió sí se borra', () => {
  const st = abrirStore();
  const p = st.createProduct({
    name: 'Nunca usado', sku: 'TST-013', cost: 10, price: 20, isv_rate: 15,
    stock: 0, active: true,
  });
  assert.equal(st.deleteProduct(p.id), 'eliminado');
  assert.throws(() => st.getProduct(p.id));
});

// ── store/backup_test.go ────────────────────────────────

test('el respaldo produce un archivo con contenido', () => {
  const dir = dirTemporal();
  const st = open(dir);
  temporales.push(st);
  st.ensureTenantDefaults();
  const out = path.join(dir, 'bak');
  const p = st.backup(out);
  const fi = fs.statSync(p);
  assert.ok(fi.size > 0, `archivo de respaldo vacío: ${p}`);
});

// ── httpapi/caja_test.go ────────────────────────────────

async function levantar(handler) {
  const srv = http.createServer(handler);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const { port } = srv.address();
  return { srv, url: `http://127.0.0.1:${port}` };
}

test('el modo caja bloquea la API de administración', async () => {
  const st = abrirStore();
  const webDir = dirTemporal();
  fs.writeFileSync(path.join(webDir, 'caja.html'), '<html>caja</html>');
  fs.writeFileSync(path.join(webDir, 'index.html'), '<html>admin</html>');

  const { srv, url } = await levantar(new API(st, null, null).router(webDir, { cajaOnly: true }));
  try {
    // Lo que la registradora necesita: permitido.
    for (const p of ['/api/settings', '/api/products']) {
      const res = await fetch(url + p);
      assert.equal(res.status, 200, `${p}: se esperaba 200`);
    }
    // Las superficies de administración: bloqueadas.
    for (const p of ['/api/dashboard', '/api/reports/income-statement', '/api/expenses',
      '/api/sales', '/api/vito/status', '/api/tenant']) {
      const res = await fetch(url + p);
      assert.equal(res.status, 403, `${p}: se esperaba 403`);
    }
    // El PIN de salida no puede salir por /api/settings.
    st.setSettings({ caja_exit_pin: '9999', company_name: 'Tienda Test' });
    const body = await (await fetch(`${url}/api/settings`)).text();
    assert.ok(!body.includes('9999') && !body.includes('caja_exit_pin'),
      `settings filtró el PIN: ${body}`);
    // La raíz redirige a caja.html.
    const raiz = await fetch(`${url}/`, { redirect: 'manual' });
    assert.equal(raiz.status, 302);
    assert.equal(raiz.headers.get('location'), '/caja.html');
    // Y la página de caja se sirve desde disco.
    const caja = await fetch(`${url}/caja.html`);
    assert.equal(caja.status, 200);
    assert.match(await caja.text(), /caja/);
  } finally {
    srv.close();
  }
});

// ── vitohost/tools_test.go ──────────────────────────────

function sembrarStockBajo(st) {
  const sp = st.createSupplier({ name: 'Distribuidora Demo', active: true });
  st.createProduct({
    sku: 'GLO-M', name: 'Guantes Nitrilo M', cost: 10, price: 25,
    stock: 2, min_stock: 10, supplier_id: sp.id, active: true,
  });
  st.createProduct({
    sku: 'GAS-E', name: 'Gasas estériles', cost: 5, price: 12,
    stock: 0, min_stock: 5, supplier_id: sp.id, active: true,
  });
}

function servicioLocal(st) {
  const reg = new Registry();
  registerOnStockTools(reg, st);
  return new Service({ enabled: true }, new ProveedorLocal(), reg);
}

test('Vito responde el stock bajo con datos reales y sin nombrar al proveedor', async () => {
  const st = abrirStore();
  sembrarStockBajo(st);
  const svc = servicioLocal(st);

  const res = await svc.ask({ message: '¿qué productos están por agotarse?' });
  assert.notEqual(res.reply, '', 'respuesta vacía');
  assert.ok(res.reply.includes('Guantes') || res.reply.toLowerCase().includes('agot')
    || res.reply.includes('Nitrilo'), `se esperaban datos del producto: ${res.reply}`);
  assert.ok(res.citations && res.citations.length > 0, 'se esperaban citas');
  assert.equal(res.citations[0].source, 'onstock.products.low_stock');
  for (const ban of ['claude', 'openai', 'opencode', 'chatgpt']) {
    assert.ok(!res.reply.toLowerCase().includes(ban), `se filtró el proveedor: ${ban}`);
  }
});

test('la orden de reposición queda pendiente hasta que se confirma', async () => {
  const st = abrirStore();
  sembrarStockBajo(st);
  const svc = servicioLocal(st);

  const ask = await svc.ask({ message: 'Genera la orden de compra de lo que falta' });
  assert.ok(ask.pending_action, `se esperaba una acción pendiente: ${ask.reply}`);
  assert.equal(ask.pending_action.tool_name, 'create_restock_po');

  // Todavía no existe.
  assert.equal(st.listPurchaseOrders({}).length, 0, 'la OC no debería existir antes de confirmar');

  const confirmed = await svc.confirmAction(ask.pending_action.tool_name, ask.pending_action.arguments);
  assert.ok(confirmed.reply.includes('OC-') || confirmed.reply.toLowerCase().includes('orden'),
    `respuesta de confirmación: ${confirmed.reply}`);
  assert.equal(st.listPurchaseOrders({}).length, 1);
});

test('la herramienta de resumen de ventas devuelve un payload con summary', async () => {
  const st = abrirStore();
  const reg = new Registry();
  registerOnStockTools(reg, st);
  const { res } = await reg.run({ id: '1', name: 'sales_summary', arguments: { period: '7d' } });
  assert.ok(res.ok, `no ok: ${res.error}`);
  const payload = JSON.parse(res.content);
  assert.ok(payload.summary, 'falta summary');
});

// ── Exportaciones y códigos de barras ───────────────────

test('las exportaciones producen archivos bien formados', async () => {
  const st = abrirStore();
  st.seedDemo(false);
  const webDir = dirTemporal();
  const { srv, url } = await levantar(new API(st, null, null).router(webDir));
  try {
    const xlsx = await fetch(`${url}/api/reports/income-statement/export?from=2000-01-01&to=2100-01-01`);
    assert.equal(xlsx.status, 200);
    assert.match(xlsx.headers.get('content-type'), /spreadsheetml\.sheet/);
    const zipBuf = Buffer.from(await xlsx.arrayBuffer());
    assert.equal(zipBuf.readUInt32LE(0), 0x04034b50, 'el .xlsx no empieza con la firma de un ZIP');

    const pdf = await fetch(`${url}/api/reports/sales/export?from=2000-01-01&to=2100-01-01&format=pdf`);
    assert.equal(pdf.status, 200);
    assert.equal(pdf.headers.get('content-type'), 'application/pdf');
    const pdfBuf = Buffer.from(await pdf.arrayBuffer());
    assert.equal(pdfBuf.subarray(0, 8).toString('latin1'), '%PDF-1.4');
    assert.ok(pdfBuf.subarray(-8).toString('latin1').includes('%%EOF'));

    // EAN-13 válido → PNG; y un código con letras cae a Code128.
    for (const code of ['7441210000016', 'ABA-001']) {
      const png = await fetch(`${url}/api/barcode/${code}`);
      assert.equal(png.status, 200, `código ${code}`);
      assert.equal(png.headers.get('content-type'), 'image/png');
      const b = Buffer.from(await png.arrayBuffer());
      assert.equal(b.subarray(0, 8).toString('latin1'), '\x89PNG\r\n\x1a\n');
    }
  } finally {
    srv.close();
  }
});
