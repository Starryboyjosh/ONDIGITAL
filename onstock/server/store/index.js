// Fachada del almacén: espeja los métodos de *store.Store del original en Go,
// para que la capa HTTP se lea igual que internal/httpapi.
import { open as openDB, ErrNotFound, BizError, round2 } from '../db.js';
import * as products from './products.js';
import * as suppliers from './suppliers.js';
import * as inventory from './inventory.js';
import * as sales from './sales.js';
import * as purchases from './purchases.js';
import * as expenses from './expenses.js';
import * as reports from './reports.js';
import * as tenant from './tenant.js';
import { backup } from './backup.js';
import { seedDemo } from './seedDemo.js';

export { ErrNotFound, BizError, round2 };
export { ExpenseCategories } from './expenses.js';

export class Store {
  constructor(db) {
    this.db = db;
  }

  close() { this.db.close(); }

  // ── Settings ──
  getSettings() { return this.db.getSettings(); }
  setSettings(v) { return this.db.setSettings(v); }

  // ── Productos y categorías ──
  listProducts(f) { return products.listProducts(this.db, f); }
  getProduct(id) { return products.getProduct(this.db, id); }
  findProductByCode(code) { return products.findProductByCode(this.db, code); }
  createProduct(p) { return products.createProduct(this.db, p); }
  updateProduct(id, p) { return products.updateProduct(this.db, id, p); }
  deleteProduct(id) { return products.deleteProduct(this.db, id); }
  nextSKU(catID) { return products.nextSKU(this.db, catID); }
  listCategories() { return products.listCategories(this.db); }
  createCategory(c) { return products.createCategory(this.db, c); }
  updateCategory(id, c) { return products.updateCategory(this.db, id, c); }
  deleteCategory(id) { return products.deleteCategory(this.db, id); }

  // ── Proveedores ──
  listSuppliers(inc) { return suppliers.listSuppliers(this.db, inc); }
  getSupplier(id) { return suppliers.getSupplier(this.db, id); }
  createSupplier(s) { return suppliers.createSupplier(this.db, s); }
  updateSupplier(id, s) { return suppliers.updateSupplier(this.db, id, s); }
  deleteSupplier(id) { return suppliers.deleteSupplier(this.db, id); }

  // ── Inventario ──
  listMovements(f) { return inventory.listMovements(this.db, f); }
  adjustStock(pid, type, qty, notes) { return inventory.adjustStock(this.db, pid, type, qty, notes); }
  inventoryValue() { return inventory.inventoryValue(this.db); }

  // ── Ventas ──
  listSales(f) { return sales.listSales(this.db, f); }
  getSale(id) { return sales.getSale(this.db, id); }
  createSale(input) { return sales.createSale(this.db, input); }
  voidSale(id) { return sales.voidSale(this.db, id); }

  // ── Órdenes de compra ──
  listPurchaseOrders(f) { return purchases.listPurchaseOrders(this.db, f); }
  getPurchaseOrder(id) { return purchases.getPurchaseOrder(this.db, id); }
  createPurchaseOrder(i) { return purchases.createPurchaseOrder(this.db, i); }
  updatePurchaseOrder(id, i) { return purchases.updatePurchaseOrder(this.db, id, i); }
  setPOStatus(id, s) { return purchases.setPOStatus(this.db, id, s); }
  revertPOReceipt(id) { return purchases.revertPOReceipt(this.db, id); }
  deletePurchaseOrder(id) { return purchases.deletePurchaseOrder(this.db, id); }

  // ── Gastos ──
  listExpenses(f) { return expenses.listExpenses(this.db, f); }
  getExpense(id) { return expenses.getExpense(this.db, id); }
  createExpense(e) { return expenses.createExpense(this.db, e); }
  updateExpense(id, e) { return expenses.updateExpense(this.db, id, e); }
  deleteExpense(id) { return expenses.deleteExpense(this.db, id); }

  // ── Reportes ──
  incomeStatement(from, to) { return reports.incomeStatement(this.db, from, to); }
  topProducts(from, to, limit) { return reports.topProducts(this.db, from, to, limit); }
  salesSeries(n) { return reports.salesSeries(this.db, n); }
  dashboard() { return reports.dashboard(this.db); }
  monthlySummary(y, m) { return reports.monthlySummary(this.db, y, m); }
  salesReportRows(from, to) { return reports.salesReportRows(this.db, from, to); }

  // ── Tenant / plan comercial ──
  tenantFromSettings() { return tenant.tenantFromSettings(this.db); }
  ensureTenantDefaults() { return tenant.ensureTenantDefaults(this.db); }
  publicTenantView() { return tenant.publicTenantView(this.db); }

  // ── Operaciones ──
  backup(dir) { return backup(this.db, dir); }
  seedDemo(force) { return seedDemo(this, force); }

  isEmpty() { return this.db.scalar('SELECT COUNT(*) FROM products') === 0; }
  hasDemoSeed() { return this.db.settingString('demo_seeded', '') === '1'; }
}

export function open(dataDir) {
  return new Store(openDB(dataDir));
}
