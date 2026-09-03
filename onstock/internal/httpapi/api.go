// Package httpapi expone la API REST y sirve la SPA embebida.
package httpapi

import (
	"encoding/json"
	"errors"
	"io/fs"
	"log"
	"net/http"
	"strconv"
	"strings"

	"ondigital.hn/modkit"
	"ondigital.hn/vito"
	"onstock/internal/store"
)

type API struct {
	st      *store.Store
	vito    *vito.Service   // optional; nil = Vito not mounted
	catalog *modkit.Catalog // optional module catalog (Fase 2)
}

// New builds the API. vitoSvc/catalog may be nil.
func New(st *store.Store, vitoSvc *vito.Service, catalog *modkit.Catalog) *API {
	return &API{st: st, vito: vitoSvc, catalog: catalog}
}

// RouterOpts controls which surfaces the process exposes.
type RouterOpts struct {
	// CajaOnly: PC del cajero — solo registradora (API POS + caja.html).
	// Bloquea finanzas, reportes, Vito, administración de productos, etc.
	CajaOnly bool
}

// Router registra rutas de la API y la SPA estática (modo admin completo).
func (a *API) Router(webFS fs.FS) http.Handler {
	return a.RouterWithOpts(webFS, RouterOpts{})
}

// RouterWithOpts registra rutas según el modo de proceso (admin vs caja).
func (a *API) RouterWithOpts(webFS fs.FS, opts RouterOpts) http.Handler {
	mux := http.NewServeMux()

	if opts.CajaOnly {
		a.registerCajaRoutes(mux)
		mux.Handle("/", cajaStaticHandler(webFS))
		return logMiddleware(mux)
	}

	a.registerAdminRoutes(mux)
	mux.Handle("/", http.FileServer(http.FS(webFS)))
	return logMiddleware(mux)
}

// registerCajaRoutes: solo lo que la registradora necesita para cobrar.
func (a *API) registerCajaRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/settings", a.getSettingsCaja)
	mux.HandleFunc("GET /api/products", a.listProducts)
	mux.HandleFunc("GET /api/products/by-code/{code}", a.productByCode)
	mux.HandleFunc("GET /api/products/{id}", a.getProduct)
	mux.HandleFunc("POST /api/sales", a.createSale)
	// Cualquier otra /api/* → 403 (no filtrar finanzas vía URL)
	mux.HandleFunc("/api/", a.cajaForbidden)
}

// registerAdminRoutes: sistema completo (dueño / oficina).
func (a *API) registerAdminRoutes(mux *http.ServeMux) {
	// Tenant / plan comercial (Fase 4)
	mux.HandleFunc("GET /api/tenant", a.getTenant)
	mux.HandleFunc("PUT /api/tenant", a.putTenant)

	// Módulos de negocio (Fase 2)
	mux.HandleFunc("GET /api/modules", a.getModules)

	// Vito (asistente white-label; opcional)
	mux.HandleFunc("GET /api/vito/status", a.getVitoStatus)
	mux.HandleFunc("POST /api/vito/ask", a.postVitoAsk)
	mux.HandleFunc("POST /api/vito/confirm", a.postVitoConfirm)

	// Dashboard y configuración
	mux.HandleFunc("GET /api/dashboard", a.getDashboard)
	mux.HandleFunc("GET /api/settings", a.getSettings)
	mux.HandleFunc("PUT /api/settings", a.putSettings)

	// Productos y categorías
	mux.HandleFunc("GET /api/products", a.listProducts)
	mux.HandleFunc("POST /api/products", a.createProduct)
	mux.HandleFunc("GET /api/products/next-sku", a.nextSKU)
	mux.HandleFunc("GET /api/products/by-code/{code}", a.productByCode)
	mux.HandleFunc("GET /api/products/{id}", a.getProduct)
	mux.HandleFunc("PUT /api/products/{id}", a.updateProduct)
	mux.HandleFunc("DELETE /api/products/{id}", a.deleteProduct)
	mux.HandleFunc("GET /api/categories", a.listCategories)
	mux.HandleFunc("POST /api/categories", a.createCategory)
	mux.HandleFunc("PUT /api/categories/{id}", a.updateCategory)
	mux.HandleFunc("DELETE /api/categories/{id}", a.deleteCategory)

	// Proveedores
	mux.HandleFunc("GET /api/suppliers", a.listSuppliers)
	mux.HandleFunc("POST /api/suppliers", a.createSupplier)
	mux.HandleFunc("GET /api/suppliers/{id}", a.getSupplier)
	mux.HandleFunc("PUT /api/suppliers/{id}", a.updateSupplier)
	mux.HandleFunc("DELETE /api/suppliers/{id}", a.deleteSupplier)

	// Inventario
	mux.HandleFunc("GET /api/movements", a.listMovements)
	mux.HandleFunc("POST /api/movements", a.createMovement)

	// Ventas
	mux.HandleFunc("GET /api/sales", a.listSales)
	mux.HandleFunc("POST /api/sales", a.createSale)
	mux.HandleFunc("GET /api/sales/{id}", a.getSale)
	mux.HandleFunc("POST /api/sales/{id}/void", a.voidSale)

	// Órdenes de compra
	mux.HandleFunc("GET /api/purchase-orders", a.listPOs)
	mux.HandleFunc("POST /api/purchase-orders", a.createPO)
	mux.HandleFunc("GET /api/purchase-orders/{id}", a.getPO)
	mux.HandleFunc("PUT /api/purchase-orders/{id}", a.updatePO)
	mux.HandleFunc("POST /api/purchase-orders/{id}/status", a.setPOStatus)
	mux.HandleFunc("DELETE /api/purchase-orders/{id}", a.deletePO)

	// Gastos
	mux.HandleFunc("GET /api/expenses", a.listExpenses)
	mux.HandleFunc("POST /api/expenses", a.createExpense)
	mux.HandleFunc("PUT /api/expenses/{id}", a.updateExpense)
	mux.HandleFunc("DELETE /api/expenses/{id}", a.deleteExpense)

	// Reportes y exportaciones
	mux.HandleFunc("GET /api/reports/income-statement", a.incomeStatement)
	mux.HandleFunc("GET /api/reports/monthly-summary", a.monthlySummary)
	mux.HandleFunc("GET /api/reports/income-statement/export", a.exportIncomeStatement)
	mux.HandleFunc("GET /api/reports/monthly-summary/export", a.exportMonthlySummary)
	mux.HandleFunc("GET /api/reports/inventory/export", a.exportInventory)
	mux.HandleFunc("GET /api/reports/sales/export", a.exportSales)

	// Códigos de barras y etiquetas
	mux.HandleFunc("GET /api/barcode/{code}", a.barcodePNG)
	mux.HandleFunc("GET /api/labels/pdf", a.labelsPDF)
}

func (a *API) cajaForbidden(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusForbidden, map[string]string{
		"error": "Este equipo solo tiene la caja (registradora). Use el sistema de administración en la oficina.",
	})
}

// getSettingsCaja: settings de cobro sin secretos (PIN de salida, etc.).
func (a *API) getSettingsCaja(w http.ResponseWriter, r *http.Request) {
	m, err := a.st.GetSettings()
	if err != nil {
		writeErr(w, err)
		return
	}
	// Solo campos que el POS necesita para cobrar y mostrar la marca.
	out := map[string]string{}
	for _, k := range []string{
		"company_name", "company_rtn", "currency_symbol",
		"isv_rate_default", "prices_include_isv", "allow_negative_stock",
	} {
		if v, ok := m[k]; ok {
			out[k] = v
		}
	}
	writeJSON(w, http.StatusOK, out)
}

// cajaStaticHandler sirve la UI de caja y redirige el admin SPA a /caja.html.
func cajaStaticHandler(webFS fs.FS) http.Handler {
	files := http.FileServer(http.FS(webFS))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		// Raíz y SPA admin → solo caja
		if path == "/" || path == "/index.html" || path == "/index.htm" {
			http.Redirect(w, r, "/caja.html", http.StatusFound)
			return
		}
		// No exponer el shell admin por error de tipeo
		if path == "/app.html" {
			http.Redirect(w, r, "/caja.html", http.StatusFound)
			return
		}
		files.ServeHTTP(w, r)
	})
}

// statusRecorder recuerda el código de respuesta para poder registrar solo lo
// que salió mal.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (w *statusRecorder) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

// logMiddleware solo registra las peticiones que fallan. La consola del
// operador es donde se ven los problemas del negocio (respaldos, errores de
// arranque); llenarla con una línea por clic escondía justamente eso.
func logMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		if rec.status >= 400 && strings.HasPrefix(r.URL.Path, "/api/") {
			log.Printf("%s %s → %d", r.Method, r.URL.Path, rec.status)
		}
	})
}

// ── Helpers ─────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, err error) {
	status := http.StatusBadRequest
	if errors.Is(err, store.ErrNotFound) {
		status = http.StatusNotFound
	}
	writeJSON(w, status, map[string]string{"error": err.Error()})
}

func decode[T any](r *http.Request) (T, error) {
	var v T
	err := json.NewDecoder(r.Body).Decode(&v)
	return v, err
}

func pathID(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		return 0, errors.New("id inválido")
	}
	return id, nil
}

func qInt(r *http.Request, key string) int64 {
	n, _ := strconv.ParseInt(r.URL.Query().Get(key), 10, 64)
	return n
}
