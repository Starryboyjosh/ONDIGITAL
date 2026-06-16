package httpapi

import (
	"net/http"
	"time"

	"onstock/internal/store"
)

// ── Dashboard y configuración ───────────────────────────

func (a *API) getDashboard(w http.ResponseWriter, r *http.Request) {
	d, err := a.st.Dashboard()
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, d)
}

func (a *API) getSettings(w http.ResponseWriter, r *http.Request) {
	s, err := a.st.GetSettings()
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, s)
}

func (a *API) putSettings(w http.ResponseWriter, r *http.Request) {
	values, err := decode[map[string]string](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	if err := a.st.SetSettings(values); err != nil {
		writeErr(w, err)
		return
	}
	s, _ := a.st.GetSettings()
	writeJSON(w, http.StatusOK, s)
}

// ── Productos ───────────────────────────────────────────

func (a *API) listProducts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	products, err := a.st.ListProducts(store.ProductFilter{
		Query:      q.Get("q"),
		CategoryID: qInt(r, "category_id"),
		SupplierID: qInt(r, "supplier_id"),
		LowStock:   q.Get("low_stock") == "1",
		Inactive:   q.Get("inactive") == "1",
	})
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, products)
}

func (a *API) getProduct(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	p, err := a.st.GetProduct(id)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (a *API) productByCode(w http.ResponseWriter, r *http.Request) {
	p, err := a.st.FindProductByCode(r.PathValue("code"))
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (a *API) nextSKU(w http.ResponseWriter, r *http.Request) {
	var catID *int64
	if id := qInt(r, "category_id"); id > 0 {
		catID = &id
	}
	sku, err := a.st.NextSKU(catID)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"sku": sku})
}

func (a *API) createProduct(w http.ResponseWriter, r *http.Request) {
	p, err := decode[store.Product](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	created, err := a.st.CreateProduct(p)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (a *API) updateProduct(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	p, err := decode[store.Product](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	updated, err := a.st.UpdateProduct(id, p)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (a *API) deleteProduct(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	if err := a.st.DeleteProduct(id); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ── Categorías ──────────────────────────────────────────

func (a *API) listCategories(w http.ResponseWriter, r *http.Request) {
	cats, err := a.st.ListCategories()
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, cats)
}

func (a *API) createCategory(w http.ResponseWriter, r *http.Request) {
	c, err := decode[store.Category](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	created, err := a.st.CreateCategory(c)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (a *API) updateCategory(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	c, err := decode[store.Category](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	if err := a.st.UpdateCategory(id, c); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *API) deleteCategory(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	if err := a.st.DeleteCategory(id); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ── Proveedores ─────────────────────────────────────────

func (a *API) listSuppliers(w http.ResponseWriter, r *http.Request) {
	list, err := a.st.ListSuppliers(r.URL.Query().Get("inactive") == "1")
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *API) getSupplier(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	sp, err := a.st.GetSupplier(id)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, sp)
}

func (a *API) createSupplier(w http.ResponseWriter, r *http.Request) {
	sp, err := decode[store.Supplier](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	created, err := a.st.CreateSupplier(sp)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (a *API) updateSupplier(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	sp, err := decode[store.Supplier](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	updated, err := a.st.UpdateSupplier(id, sp)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (a *API) deleteSupplier(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	if err := a.st.DeleteSupplier(id); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ── Inventario ──────────────────────────────────────────

func (a *API) listMovements(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	list, err := a.st.ListMovements(store.MovementFilter{
		ProductID: qInt(r, "product_id"),
		Type:      q.Get("type"),
		From:      q.Get("from"),
		To:        q.Get("to"),
		Limit:     int(qInt(r, "limit")),
	})
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *API) createMovement(w http.ResponseWriter, r *http.Request) {
	in, err := decode[struct {
		ProductID int64   `json:"product_id"`
		Type      string  `json:"type"`
		Qty       float64 `json:"qty"`
		Notes     string  `json:"notes"`
	}](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	p, err := a.st.AdjustStock(in.ProductID, in.Type, in.Qty, in.Notes)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

// ── Ventas ──────────────────────────────────────────────

func (a *API) listSales(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	list, err := a.st.ListSales(store.SaleFilter{
		Query:  q.Get("q"),
		From:   q.Get("from"),
		To:     q.Get("to"),
		Status: q.Get("status"),
		Limit:  int(qInt(r, "limit")),
	})
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *API) getSale(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	v, err := a.st.GetSale(id)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, v)
}

func (a *API) createSale(w http.ResponseWriter, r *http.Request) {
	in, err := decode[store.NewSaleInput](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	v, err := a.st.CreateSale(in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, v)
}

func (a *API) voidSale(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	v, err := a.st.VoidSale(id)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, v)
}

// ── Órdenes de compra ───────────────────────────────────

func (a *API) listPOs(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	list, err := a.st.ListPurchaseOrders(store.POFilter{
		Query:      q.Get("q"),
		SupplierID: qInt(r, "supplier_id"),
		Status:     q.Get("status"),
		From:       q.Get("from"),
		To:         q.Get("to"),
		Limit:      int(qInt(r, "limit")),
	})
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *API) getPO(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	o, err := a.st.GetPurchaseOrder(id)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (a *API) createPO(w http.ResponseWriter, r *http.Request) {
	in, err := decode[store.NewPOInput](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	o, err := a.st.CreatePurchaseOrder(in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, o)
}

func (a *API) updatePO(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	in, err := decode[store.NewPOInput](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	o, err := a.st.UpdatePurchaseOrder(id, in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (a *API) setPOStatus(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	in, err := decode[struct {
		Status string `json:"status"`
	}](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	o, err := a.st.SetPOStatus(id, in.Status)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (a *API) deletePO(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	if err := a.st.DeletePurchaseOrder(id); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ── Gastos ──────────────────────────────────────────────

func (a *API) listExpenses(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	list, err := a.st.ListExpenses(store.ExpenseFilter{
		Query:    q.Get("q"),
		Category: q.Get("category"),
		From:     q.Get("from"),
		To:       q.Get("to"),
		Limit:    int(qInt(r, "limit")),
	})
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *API) createExpense(w http.ResponseWriter, r *http.Request) {
	e, err := decode[store.Expense](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	created, err := a.st.CreateExpense(e)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (a *API) updateExpense(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	e, err := decode[store.Expense](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	updated, err := a.st.UpdateExpense(id, e)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (a *API) deleteExpense(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	if err := a.st.DeleteExpense(id); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ── Reportes (JSON) ─────────────────────────────────────

func reportRange(r *http.Request) (string, string) {
	q := r.URL.Query()
	from, to := q.Get("from"), q.Get("to")
	now := time.Now()
	if from == "" {
		from = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local).Format("2006-01-02")
	}
	if to == "" {
		to = now.Format("2006-01-02")
	}
	return from, to
}

func (a *API) incomeStatement(w http.ResponseWriter, r *http.Request) {
	from, to := reportRange(r)
	st, err := a.st.IncomeStatement(from, to)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, st)
}

func (a *API) monthlySummary(w http.ResponseWriter, r *http.Request) {
	year := int(qInt(r, "year"))
	month := int(qInt(r, "month"))
	now := time.Now()
	if year == 0 {
		year = now.Year()
	}
	if month == 0 {
		month = int(now.Month())
	}
	ms, err := a.st.MonthlySummary(year, month)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ms)
}
