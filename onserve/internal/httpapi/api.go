// Package httpapi expone la API REST y sirve la SPA embebida (mismo patrón que OnStock).
package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"log"
	"net/http"
	"strconv"

	"onserve/internal/store"
)

type API struct {
	st *store.Store
}

func New(st *store.Store) *API { return &API{st: st} }

// Router registra todas las rutas de la API y la SPA estática.
func (a *API) Router(webFS fs.FS) http.Handler {
	mux := http.NewServeMux()

	// Dashboard y configuración
	mux.HandleFunc("GET /api/dashboard", a.getDashboard)
	mux.HandleFunc("GET /api/settings", a.getSettings)
	mux.HandleFunc("PUT /api/settings", a.putSettings)

	// Salón: mapa en vivo, zonas y mesas
	mux.HandleFunc("GET /api/floor", a.getFloor)
	mux.HandleFunc("GET /api/zones", a.listZones)
	mux.HandleFunc("POST /api/zones", a.createZone)
	mux.HandleFunc("PUT /api/zones/{id}", a.updateZone)
	mux.HandleFunc("DELETE /api/zones/{id}", a.deleteZone)
	mux.HandleFunc("GET /api/tables", a.listTables)
	mux.HandleFunc("POST /api/tables", a.createTable)
	mux.HandleFunc("PUT /api/tables/{id}", a.updateTable)
	mux.HandleFunc("DELETE /api/tables/{id}", a.deleteTable)
	mux.HandleFunc("PUT /api/tables/{id}/position", a.updateTablePosition)
	mux.HandleFunc("POST /api/tables/{id}/reserve", a.reserveTable)

	// Menú
	mux.HandleFunc("GET /api/menu", a.getMenu)
	mux.HandleFunc("GET /api/menu-categories", a.listCategories)
	mux.HandleFunc("POST /api/menu-categories", a.createCategory)
	mux.HandleFunc("PUT /api/menu-categories/{id}", a.updateCategory)
	mux.HandleFunc("DELETE /api/menu-categories/{id}", a.deleteCategory)
	mux.HandleFunc("GET /api/menu-items", a.listItems)
	mux.HandleFunc("POST /api/menu-items", a.createItem)
	mux.HandleFunc("GET /api/menu-items/{id}", a.getItem)
	mux.HandleFunc("PUT /api/menu-items/{id}", a.updateItem)
	mux.HandleFunc("DELETE /api/menu-items/{id}", a.deleteItem)
	mux.HandleFunc("POST /api/menu-items/{id}/available", a.setItemAvailable)

	// Comandas
	mux.HandleFunc("GET /api/orders", a.listOrders)
	mux.HandleFunc("POST /api/orders", a.openOrder)
	mux.HandleFunc("GET /api/orders/{id}", a.getOrder)
	mux.HandleFunc("POST /api/orders/{id}/items", a.addItem)
	mux.HandleFunc("PUT /api/orders/{id}/items/{itemId}", a.updateOrderItem)
	mux.HandleFunc("DELETE /api/orders/{id}/items/{itemId}", a.removeOrderItem)
	mux.HandleFunc("POST /api/orders/{id}/fire", a.fireOrder)
	mux.HandleFunc("POST /api/orders/{id}/request-bill", a.requestBill)
	mux.HandleFunc("POST /api/orders/{id}/pay", a.payOrder)
	mux.HandleFunc("POST /api/orders/{id}/void", a.voidOrder)
	mux.HandleFunc("GET /api/orders/{id}/receipt", a.orderReceipt)

	// Cocina (KDS)
	mux.HandleFunc("GET /api/kitchen", a.getKitchen)
	mux.HandleFunc("POST /api/kitchen/items/{id}/status", a.advanceKitchenItem)

	// Sesiones de caja
	mux.HandleFunc("GET /api/sessions", a.listSessions)
	mux.HandleFunc("GET /api/sessions/current", a.currentSession)
	mux.HandleFunc("POST /api/sessions/open", a.openSession)
	mux.HandleFunc("POST /api/sessions/close", a.closeSession)

	// SPA estática
	mux.Handle("/", http.FileServer(http.FS(webFS)))

	return securityHeaders(logMiddleware(mux))
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "same-origin")
		h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		next.ServeHTTP(w, r)
	})
}

func logMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
		if len(r.URL.Path) >= 5 && r.URL.Path[:5] == "/api/" {
			log.Printf("%s %s", r.Method, r.URL.Path)
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
	dec := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&v); err != nil {
		return v, err
	}
	var extra struct{}
	if err := dec.Decode(&extra); err != io.EOF {
		if err == nil {
			err = errors.New("el cuerpo JSON debe contener un solo valor")
		}
		return v, err
	}
	return v, nil
}

func pathID(r *http.Request) (int64, error) { return pathInt(r, "id") }

func pathInt(r *http.Request, name string) (int64, error) {
	id, err := strconv.ParseInt(r.PathValue(name), 10, 64)
	if err != nil || id <= 0 {
		return 0, errors.New("id inválido")
	}
	return id, nil
}

func qInt(r *http.Request, key string) int64 {
	n, _ := strconv.ParseInt(r.URL.Query().Get(key), 10, 64)
	return n
}
