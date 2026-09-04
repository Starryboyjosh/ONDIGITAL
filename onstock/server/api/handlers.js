// Traducción de internal/httpapi/handlers.go.
import { writeJSON, writeErr, readJSON, pathID, qInt, q, comoMapaDeGo } from './helpers.js';
import { ymd, primerDiaDelMes } from '../lib/fechas.js';

// ── Dashboard y configuración ───────────────────────────

export function getDashboard(a, ctx) {
  writeJSON(ctx.res, 200, a.st.dashboard());
}

export function getSettings(a, ctx) {
  writeJSON(ctx.res, 200, comoMapaDeGo(a.st.getSettings()));
}

export async function putSettings(a, ctx) {
  const values = await readJSON(ctx.req);
  // El original decodifica en map[string]string: un valor que no sea texto
  // rompe el decodificador y devuelve 400. Aquí se comprueba explícitamente
  // para no aceptar en silencio lo que la versión en Go rechazaba.
  if (values === null || typeof values !== 'object' || Array.isArray(values)) {
    throw new Error('se esperaba un objeto de configuración');
  }
  for (const [k, v] of Object.entries(values)) {
    if (typeof v !== 'string') {
      throw new Error(`el valor de "${k}" debe ser texto`);
    }
  }
  a.st.setSettings(values);
  writeJSON(ctx.res, 200, comoMapaDeGo(a.st.getSettings()));
}

// getSettingsCaja: settings de cobro sin secretos (PIN de salida, etc.).
export function getSettingsCaja(a, ctx) {
  const m = a.st.getSettings();
  // Solo campos que el POS necesita para cobrar y mostrar la marca.
  const out = {};
  for (const k of ['company_name', 'company_rtn', 'currency_symbol',
    'isv_rate_default', 'prices_include_isv', 'allow_negative_stock']) {
    if (k in m) out[k] = m[k];
  }
  writeJSON(ctx.res, 200, comoMapaDeGo(out));
}

// ── Productos ───────────────────────────────────────────

export function listProducts(a, ctx) {
  const { url } = ctx;
  writeJSON(ctx.res, 200, a.st.listProducts({
    query: q(url, 'q'),
    categoryID: qInt(url, 'category_id'),
    supplierID: qInt(url, 'supplier_id'),
    lowStock: q(url, 'low_stock') === '1',
    inactive: q(url, 'inactive') === '1',
  }));
}

export function getProduct(a, ctx) {
  writeJSON(ctx.res, 200, a.st.getProduct(pathID(ctx.params)));
}

export function productByCode(a, ctx) {
  writeJSON(ctx.res, 200, a.st.findProductByCode(ctx.params.code));
}

export function nextSKU(a, ctx) {
  const id = qInt(ctx.url, 'category_id');
  writeJSON(ctx.res, 200, { sku: a.st.nextSKU(id > 0 ? id : null) });
}

export async function createProduct(a, ctx) {
  writeJSON(ctx.res, 201, a.st.createProduct(await readJSON(ctx.req)));
}

export async function updateProduct(a, ctx) {
  const id = pathID(ctx.params);
  writeJSON(ctx.res, 200, a.st.updateProduct(id, await readJSON(ctx.req)));
}

export function deleteProduct(a, ctx) {
  // `ok` se mantiene por compatibilidad; `resultado` dice qué pasó de verdad
  // ("eliminado" o "desactivado") para que la pantalla no mienta al informar.
  const resultado = a.st.deleteProduct(pathID(ctx.params));
  writeJSON(ctx.res, 200, { ok: true, resultado });
}

// ── Categorías ──────────────────────────────────────────

export function listCategories(a, ctx) {
  writeJSON(ctx.res, 200, a.st.listCategories());
}

export async function createCategory(a, ctx) {
  writeJSON(ctx.res, 201, a.st.createCategory(await readJSON(ctx.req)));
}

export async function updateCategory(a, ctx) {
  const id = pathID(ctx.params);
  a.st.updateCategory(id, await readJSON(ctx.req));
  writeJSON(ctx.res, 200, { ok: true });
}

export function deleteCategory(a, ctx) {
  a.st.deleteCategory(pathID(ctx.params));
  writeJSON(ctx.res, 200, { ok: true });
}

// ── Proveedores ─────────────────────────────────────────

export function listSuppliers(a, ctx) {
  writeJSON(ctx.res, 200, a.st.listSuppliers(q(ctx.url, 'inactive') === '1'));
}

export function getSupplier(a, ctx) {
  writeJSON(ctx.res, 200, a.st.getSupplier(pathID(ctx.params)));
}

export async function createSupplier(a, ctx) {
  writeJSON(ctx.res, 201, a.st.createSupplier(await readJSON(ctx.req)));
}

export async function updateSupplier(a, ctx) {
  const id = pathID(ctx.params);
  writeJSON(ctx.res, 200, a.st.updateSupplier(id, await readJSON(ctx.req)));
}

export function deleteSupplier(a, ctx) {
  a.st.deleteSupplier(pathID(ctx.params));
  writeJSON(ctx.res, 200, { ok: true });
}

// ── Inventario ──────────────────────────────────────────

export function listMovements(a, ctx) {
  const { url } = ctx;
  writeJSON(ctx.res, 200, a.st.listMovements({
    productID: qInt(url, 'product_id'),
    type: q(url, 'type'),
    from: q(url, 'from'),
    to: q(url, 'to'),
    limit: qInt(url, 'limit'),
  }));
}

export async function createMovement(a, ctx) {
  const inp = await readJSON(ctx.req);
  writeJSON(ctx.res, 201, a.st.adjustStock(
    inp.product_id ?? 0, inp.type ?? '', inp.qty ?? 0, inp.notes ?? '',
  ));
}

// ── Ventas ──────────────────────────────────────────────

export function listSales(a, ctx) {
  const { url } = ctx;
  writeJSON(ctx.res, 200, a.st.listSales({
    query: q(url, 'q'),
    from: q(url, 'from'),
    to: q(url, 'to'),
    status: q(url, 'status'),
    limit: qInt(url, 'limit'),
  }));
}

export function getSale(a, ctx) {
  writeJSON(ctx.res, 200, a.st.getSale(pathID(ctx.params)));
}

export async function createSale(a, ctx) {
  writeJSON(ctx.res, 201, a.st.createSale(await readJSON(ctx.req)));
}

export function voidSale(a, ctx) {
  writeJSON(ctx.res, 200, a.st.voidSale(pathID(ctx.params)));
}

// ── Órdenes de compra ───────────────────────────────────

export function listPOs(a, ctx) {
  const { url } = ctx;
  writeJSON(ctx.res, 200, a.st.listPurchaseOrders({
    query: q(url, 'q'),
    supplierID: qInt(url, 'supplier_id'),
    status: q(url, 'status'),
    from: q(url, 'from'),
    to: q(url, 'to'),
    limit: qInt(url, 'limit'),
  }));
}

export function getPO(a, ctx) {
  writeJSON(ctx.res, 200, a.st.getPurchaseOrder(pathID(ctx.params)));
}

export async function createPO(a, ctx) {
  writeJSON(ctx.res, 201, a.st.createPurchaseOrder(await readJSON(ctx.req)));
}

export async function updatePO(a, ctx) {
  const id = pathID(ctx.params);
  writeJSON(ctx.res, 200, a.st.updatePurchaseOrder(id, await readJSON(ctx.req)));
}

export async function setPOStatus(a, ctx) {
  const id = pathID(ctx.params);
  const body = await readJSON(ctx.req);
  writeJSON(ctx.res, 200, a.st.setPOStatus(id, body.status ?? ''));
}

// POST /api/purchase-orders/{id}/revert — deshace una recepción equivocada.
export function revertPOReceipt(a, ctx) {
  writeJSON(ctx.res, 200, a.st.revertPOReceipt(pathID(ctx.params)));
}

export function deletePO(a, ctx) {
  a.st.deletePurchaseOrder(pathID(ctx.params));
  writeJSON(ctx.res, 200, { ok: true });
}

// ── Gastos ──────────────────────────────────────────────

export function listExpenses(a, ctx) {
  const { url } = ctx;
  writeJSON(ctx.res, 200, a.st.listExpenses({
    query: q(url, 'q'),
    category: q(url, 'category'),
    from: q(url, 'from'),
    to: q(url, 'to'),
    limit: qInt(url, 'limit'),
  }));
}

export async function createExpense(a, ctx) {
  writeJSON(ctx.res, 201, a.st.createExpense(await readJSON(ctx.req)));
}

export async function updateExpense(a, ctx) {
  const id = pathID(ctx.params);
  writeJSON(ctx.res, 200, a.st.updateExpense(id, await readJSON(ctx.req)));
}

export function deleteExpense(a, ctx) {
  a.st.deleteExpense(pathID(ctx.params));
  writeJSON(ctx.res, 200, { ok: true });
}

// ── Reportes (JSON) ─────────────────────────────────────

export function reportRange(url) {
  let from = q(url, 'from');
  let to = q(url, 'to');
  const now = new Date();
  if (from === '') from = ymd(primerDiaDelMes(now));
  if (to === '') to = ymd(now);
  return [from, to];
}

export function incomeStatement(a, ctx) {
  const [from, to] = reportRange(ctx.url);
  writeJSON(ctx.res, 200, a.st.incomeStatement(from, to));
}

export function monthlySummary(a, ctx) {
  let year = qInt(ctx.url, 'year');
  let month = qInt(ctx.url, 'month');
  const now = new Date();
  if (year === 0) year = now.getFullYear();
  if (month === 0) month = now.getMonth() + 1;
  writeJSON(ctx.res, 200, a.st.monthlySummary(year, month));
}

export function cajaForbidden(_a, ctx) {
  writeJSON(ctx.res, 403, {
    error: 'Este equipo solo tiene la caja (registradora). Use el sistema de administración en la oficina.',
  });
}

export { writeErr };
