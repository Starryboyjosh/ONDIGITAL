// Traducción de internal/httpapi/api.go: registro de rutas y despacho.
import { Router } from './router.js';
import { writeJSON, writeErr } from './helpers.js';
import * as h from './handlers.js';
import * as ex from './exports.js';
import * as bc from './barcode.js';
import * as vt from './vito.js';
import * as tn from './tenant.js';
import { serve, serveCaja } from './estaticos.js';

export class API {
  // vitoSvc y catalog pueden ser null.
  constructor(st, vitoSvc, catalog) {
    this.st = st;
    this.vito = vitoSvc;
    this.catalog = catalog;
  }

  // router arma el manejador según el modo del proceso (admin vs caja).
  router(webDir, opts = {}) {
    const mux = new Router();
    if (opts.cajaOnly) {
      this.#registerCajaRoutes(mux);
    } else {
      this.#registerAdminRoutes(mux);
    }
    // El servidor de estáticos se registra como el comodín "/" del enrutador, no
    // como un caso aparte fuera de él. Así es como main.go lo monta
    // (`mux.Handle("/", ...)`) y de ahí sale una diferencia visible: una ruta de
    // API pedida con el método equivocado cae en este comodín y contesta el 404
    // del servidor de archivos, no un 405.
    const estaticos = opts.cajaOnly
      ? (_a, ctx) => serveCaja(webDir, ctx.url.pathname, ctx.res)
      : (_a, ctx) => serve(webDir, ctx.url.pathname, ctx.res);
    mux.handle('/', estaticos);
    return async (req, res) => {
      const url = new URL(req.url, 'http://localhost');
      const m = mux.match(req.method, url.pathname);
      const ctx = { req, res, url, params: m.params };
      try {
        await m.fn(this, ctx);
      } catch (err) {
        if (res.headersSent) {
          res.end();
          return;
        }
        writeErr(res, err);
      }
    };
  }

  // registerCajaRoutes: solo lo que la registradora necesita para cobrar.
  #registerCajaRoutes(mux) {
    mux.handle('GET /api/settings', h.getSettingsCaja);
    mux.handle('GET /api/products', h.listProducts);
    mux.handle('GET /api/products/by-code/{code}', h.productByCode);
    mux.handle('GET /api/products/{id}', h.getProduct);
    mux.handle('POST /api/sales', h.createSale);
    // Cualquier otra /api/* → 403 (no filtrar finanzas vía URL)
    mux.handle('/api/', h.cajaForbidden);
  }

  // registerAdminRoutes: sistema completo (dueño / oficina).
  #registerAdminRoutes(mux) {
    // Tenant / plan comercial (Fase 4)
    mux.handle('GET /api/tenant', tn.getTenant);
    mux.handle('PUT /api/tenant', tn.putTenant);

    // Módulos de negocio (Fase 2)
    mux.handle('GET /api/modules', tn.getModules);

    // Vito (asistente white-label; opcional)
    mux.handle('GET /api/vito/status', vt.getVitoStatus);
    mux.handle('POST /api/vito/ask', vt.postVitoAsk);
    mux.handle('POST /api/vito/confirm', vt.postVitoConfirm);

    // Dashboard y configuración
    mux.handle('GET /api/dashboard', h.getDashboard);
    mux.handle('GET /api/settings', h.getSettings);
    mux.handle('PUT /api/settings', h.putSettings);

    // Productos y categorías
    mux.handle('GET /api/products', h.listProducts);
    mux.handle('POST /api/products', h.createProduct);
    mux.handle('GET /api/products/next-sku', h.nextSKU);
    mux.handle('GET /api/products/by-code/{code}', h.productByCode);
    mux.handle('GET /api/products/{id}', h.getProduct);
    mux.handle('PUT /api/products/{id}', h.updateProduct);
    mux.handle('DELETE /api/products/{id}', h.deleteProduct);
    mux.handle('GET /api/categories', h.listCategories);
    mux.handle('POST /api/categories', h.createCategory);
    mux.handle('PUT /api/categories/{id}', h.updateCategory);
    mux.handle('DELETE /api/categories/{id}', h.deleteCategory);

    // Proveedores
    mux.handle('GET /api/suppliers', h.listSuppliers);
    mux.handle('POST /api/suppliers', h.createSupplier);
    mux.handle('GET /api/suppliers/{id}', h.getSupplier);
    mux.handle('PUT /api/suppliers/{id}', h.updateSupplier);
    mux.handle('DELETE /api/suppliers/{id}', h.deleteSupplier);

    // Inventario
    mux.handle('GET /api/movements', h.listMovements);
    mux.handle('POST /api/movements', h.createMovement);

    // Ventas
    mux.handle('GET /api/sales', h.listSales);
    mux.handle('POST /api/sales', h.createSale);
    mux.handle('GET /api/sales/{id}', h.getSale);
    mux.handle('POST /api/sales/{id}/void', h.voidSale);

    // Órdenes de compra
    mux.handle('GET /api/purchase-orders', h.listPOs);
    mux.handle('POST /api/purchase-orders', h.createPO);
    mux.handle('GET /api/purchase-orders/{id}', h.getPO);
    mux.handle('PUT /api/purchase-orders/{id}', h.updatePO);
    mux.handle('POST /api/purchase-orders/{id}/status', h.setPOStatus);
    mux.handle('POST /api/purchase-orders/{id}/revert', h.revertPOReceipt);
    mux.handle('DELETE /api/purchase-orders/{id}', h.deletePO);

    // Gastos
    mux.handle('GET /api/expenses', h.listExpenses);
    mux.handle('POST /api/expenses', h.createExpense);
    mux.handle('PUT /api/expenses/{id}', h.updateExpense);
    mux.handle('DELETE /api/expenses/{id}', h.deleteExpense);

    // Reportes y exportaciones
    mux.handle('GET /api/reports/income-statement', h.incomeStatement);
    mux.handle('GET /api/reports/monthly-summary', h.monthlySummary);
    mux.handle('GET /api/reports/income-statement/export', ex.exportIncomeStatement);
    mux.handle('GET /api/reports/monthly-summary/export', ex.exportMonthlySummary);
    mux.handle('GET /api/reports/inventory/export', ex.exportInventory);
    mux.handle('GET /api/reports/sales/export', ex.exportSales);

    // Códigos de barras y etiquetas
    mux.handle('GET /api/barcode/{code}', bc.barcodePNG);
    mux.handle('GET /api/labels/pdf', bc.labelsPDF);
  }
}

// logMiddleware solo registra las peticiones que fallan. La consola del
// operador es donde se ven los problemas del negocio (respaldos, errores de
// arranque); llenarla con una línea por clic escondía justamente eso.
export function logMiddleware(next) {
  return async (req, res) => {
    const original = res.writeHead.bind(res);
    let status = 200;
    res.writeHead = (code, ...rest) => {
      status = code;
      return original(code, ...rest);
    };
    await next(req, res);
    if (status >= 400 && req.url.startsWith('/api/')) {
      console.log(`${req.method} ${new URL(req.url, 'http://localhost').pathname} → ${status}`);
    }
  };
}

export { writeJSON, writeErr };
