package httpapi

import (
	"errors"
	"fmt"
	"html"
	"net/http"
	"strings"

	"onserve/internal/store"
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
	a.getSettings(w, r)
}

// ── Salón ───────────────────────────────────────────────

func (a *API) getFloor(w http.ResponseWriter, r *http.Request) {
	f, err := a.st.Floor()
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, f)
}

func (a *API) listZones(w http.ResponseWriter, r *http.Request) {
	z, err := a.st.ListZones()
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, z)
}

func (a *API) createZone(w http.ResponseWriter, r *http.Request) {
	in, err := decode[store.Zone](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	z, err := a.st.CreateZone(in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, z)
}

func (a *API) updateZone(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	in, err := decode[store.Zone](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	z, err := a.st.UpdateZone(id, in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, z)
}

func (a *API) deleteZone(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	if err := a.st.DeleteZone(id); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *API) listTables(w http.ResponseWriter, r *http.Request) {
	t, err := a.st.ListTables()
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (a *API) createTable(w http.ResponseWriter, r *http.Request) {
	in, err := decode[store.Table](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	t, err := a.st.CreateTable(in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

func (a *API) updateTable(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	in, err := decode[store.Table](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	t, err := a.st.UpdateTable(id, in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (a *API) deleteTable(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	if err := a.st.DeleteTable(id); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *API) updateTablePosition(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	in, err := decode[struct {
		X float64 `json:"pos_x"`
		Y float64 `json:"pos_y"`
	}](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	if err := a.st.UpdateTablePosition(id, in.X, in.Y); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *API) reserveTable(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	in, err := decode[struct {
		Reserved bool   `json:"reserved"`
		Note     string `json:"reserved_note"`
	}](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	t, err := a.st.SetTableReserved(id, in.Reserved, in.Note)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

// ── Menú ────────────────────────────────────────────────

func (a *API) getMenu(w http.ResponseWriter, r *http.Request) {
	m, err := a.st.Menu()
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (a *API) listCategories(w http.ResponseWriter, r *http.Request) {
	c, err := a.st.ListMenuCategories()
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (a *API) createCategory(w http.ResponseWriter, r *http.Request) {
	in, err := decode[store.MenuCategory](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	c, err := a.st.CreateMenuCategory(in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (a *API) updateCategory(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	in, err := decode[store.MenuCategory](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	c, err := a.st.UpdateMenuCategory(id, in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (a *API) deleteCategory(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	if err := a.st.DeleteMenuCategory(id); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *API) listItems(w http.ResponseWriter, r *http.Request) {
	f := store.MenuItemFilter{
		Query:      r.URL.Query().Get("q"),
		CategoryID: qInt(r, "category_id"),
		OnlyActive: r.URL.Query().Get("active") == "1",
	}
	items, err := a.st.ListMenuItems(f)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *API) getItem(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	m, err := a.st.GetMenuItem(id)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (a *API) createItem(w http.ResponseWriter, r *http.Request) {
	in, err := decode[store.MenuItem](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	m, err := a.st.CreateMenuItem(in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, m)
}

func (a *API) updateItem(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	in, err := decode[store.MenuItem](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	m, err := a.st.UpdateMenuItem(id, in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (a *API) deleteItem(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	if err := a.st.DeleteMenuItem(id); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *API) setItemAvailable(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	in, err := decode[struct {
		Available bool `json:"available"`
	}](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	m, err := a.st.SetItemAvailable(id, in.Available)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

// ── Comandas ────────────────────────────────────────────

func (a *API) listOrders(w http.ResponseWriter, r *http.Request) {
	f := store.OrderFilter{
		Status:    r.URL.Query().Get("status"),
		TableID:   qInt(r, "table_id"),
		SessionID: qInt(r, "session_id"),
		From:      r.URL.Query().Get("from"),
		To:        r.URL.Query().Get("to"),
		Limit:     int(qInt(r, "limit")),
	}
	o, err := a.st.ListOrders(f)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (a *API) openOrder(w http.ResponseWriter, r *http.Request) {
	in, err := decode[store.NewOrderInput](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	o, err := a.st.OpenOrder(in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, o)
}

func (a *API) getOrder(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	o, err := a.st.GetOrder(id)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (a *API) addItem(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	in, err := decode[store.AddItemInput](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	o, err := a.st.AddItem(id, in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (a *API) updateOrderItem(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	itemID, err := pathInt(r, "itemId")
	if err != nil {
		writeErr(w, err)
		return
	}
	in, err := decode[store.UpdateItemInput](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	o, err := a.st.UpdateItem(id, itemID, in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (a *API) removeOrderItem(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	itemID, err := pathInt(r, "itemId")
	if err != nil {
		writeErr(w, err)
		return
	}
	o, err := a.st.RemoveItem(id, itemID)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (a *API) fireOrder(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	o, err := a.st.Fire(id)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (a *API) requestBill(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	o, err := a.st.RequestBill(id)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (a *API) payOrder(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	in, err := decode[store.PayInput](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	o, err := a.st.Pay(id, in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (a *API) voidOrder(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	o, err := a.st.Void(id)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

// ── Cocina (KDS) ────────────────────────────────────────

func (a *API) getKitchen(w http.ResponseWriter, r *http.Request) {
	q, err := a.st.KitchenQueue(r.URL.Query().Get("station"))
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, q)
}

func (a *API) advanceKitchenItem(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	in, err := decode[struct {
		Status string `json:"kitchen_status"`
	}](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	it, err := a.st.AdvanceItem(id, in.Status)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, it)
}

// ── Sesiones de caja ────────────────────────────────────

func (a *API) listSessions(w http.ResponseWriter, r *http.Request) {
	s, err := a.st.ListSessions(int(qInt(r, "limit")))
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, s)
}

func (a *API) currentSession(w http.ResponseWriter, r *http.Request) {
	s, err := a.st.CurrentSession()
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusOK, nil) // sin caja abierta: el frontend lo interpreta
		return
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, s)
}

func (a *API) openSession(w http.ResponseWriter, r *http.Request) {
	in, err := decode[store.OpenSessionInput](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	s, err := a.st.OpenSession(in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, s)
}

func (a *API) closeSession(w http.ResponseWriter, r *http.Request) {
	in, err := decode[store.CloseSessionInput](r)
	if err != nil {
		writeErr(w, err)
		return
	}
	s, err := a.st.CloseSession(in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, s)
}

// ── Cuenta / factura imprimible (HTML) ──────────────────

func (a *API) orderReceipt(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	o, err := a.st.GetOrder(id)
	if err != nil {
		writeErr(w, err)
		return
	}
	settings, err := a.st.GetSettings()
	if err != nil {
		writeErr(w, err)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(renderReceipt(o, settings, a.st)))
}

func renderReceipt(o store.Order, s map[string]string, st *store.Store) string {
	sym := s["currency_symbol"]
	if sym == "" {
		sym = "L"
	}
	money := func(v float64) string { return fmt.Sprintf("%s %.2f", sym, v) }
	esc := html.EscapeString

	var rows strings.Builder
	for _, it := range o.Items {
		note := ""
		if it.Notes != "" {
			note = `<div class="note">` + esc(it.Notes) + `</div>`
		}
		rows.WriteString(fmt.Sprintf(
			`<tr><td>%g× %s%s</td><td class="r">%s</td></tr>`,
			it.Qty, esc(it.Name), note, money(it.UnitPrice*it.Qty)))
	}

	company := s["company_name"]
	if company == "" {
		company = "Mi Restaurante"
	}

	// Segunda línea: RTN y teléfono de la empresa (si están configurados).
	var sub []string
	if rtn := strings.TrimSpace(s["company_rtn"]); rtn != "" {
		sub = append(sub, "RTN "+esc(rtn))
	}
	if phone := strings.TrimSpace(s["company_phone"]); phone != "" {
		sub = append(sub, esc(phone))
	}
	subLine := strings.Join(sub, " · ")

	fiscal := ""
	if inv, err := st.GetInvoiceByOrder(o.ID); err == nil {
		fiscal = fmt.Sprintf(`<div class="fiscal">
		  <div><b>%s</b> N° %s</div>
		  <div>CAI: %s</div>
		  <div>RTN Cliente: %s</div>
		</div>`, esc(strings.ToUpper(inv.DocType)), esc(inv.Sequence), esc(orDash(inv.CAI)), esc(orDash(inv.BuyerRTN)))
	}

	tipRow := ""
	if o.Tip > 0 {
		tipRow = fmt.Sprintf(`<tr><td>Propina (no gravable)</td><td class="r">%s</td></tr>`, money(o.Tip))
	}
	grandTotal := o.Total + o.Tip

	ref := "Comanda " + esc(o.OrderNumber)
	if o.TableName != "" {
		ref = "Mesa " + esc(o.TableName) + " · " + ref
	}

	return fmt.Sprintf(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Cuenta %s</title>
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;max-width:320px;margin:0 auto;padding:16px;color:#111}
  h1{font-size:18px;text-align:center;margin:0 0 2px}
  .muted{color:#666;font-size:12px;text-align:center;margin:0}
  table{width:100%%;border-collapse:collapse;margin:12px 0;font-size:13px}
  td{padding:3px 0;vertical-align:top}
  .r{text-align:right;white-space:nowrap}
  .note{color:#666;font-size:11px;font-style:italic}
  .sep{border-top:1px dashed #bbb;margin:8px 0}
  .tot td{font-weight:700;font-size:15px}
  .fiscal{font-size:11px;border:1px solid #ddd;padding:6px;margin:8px 0;border-radius:6px}
  .foot{text-align:center;color:#666;font-size:11px;margin-top:14px}
  @media print{button{display:none}}
  button{display:block;margin:14px auto 0;padding:8px 18px;cursor:pointer}
</style></head><body>
<h1>%s</h1>
<p class="muted">%s</p>
<p class="muted">%s · %s</p>
%s
<table>%s</table>
<div class="sep"></div>
<table>
  <tr><td>Subtotal (sin ISV)</td><td class="r">%s</td></tr>
  <tr><td>ISV</td><td class="r">%s</td></tr>
  %s
  <tr class="tot"><td>TOTAL A PAGAR</td><td class="r">%s</td></tr>
</table>
<p class="foot">¡Gracias por su visita!<br>La propina es para el personal de servicio.</p>
<button onclick="window.print()">Imprimir</button>
</body></html>`,
		esc(o.OrderNumber), esc(company), subLine,
		ref, esc(o.OpenedAt),
		fiscal, rows.String(),
		money(o.Subtotal), money(o.ISV), tipRow, money(grandTotal))
}

func orDash(s string) string {
	if strings.TrimSpace(s) == "" {
		return "—"
	}
	return s
}
