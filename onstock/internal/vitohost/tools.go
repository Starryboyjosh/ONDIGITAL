package vitohost

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"ondigital.hn/vito"
	"onstock/internal/store"
)

// RegisterOnStockTools attaches read + action tools for the OnStock domain.
func RegisterOnStockTools(reg *vito.Registry, st *store.Store) error {
	if reg == nil || st == nil {
		return fmt.Errorf("vitohost: registry and store are required")
	}
	tools := []struct {
		meta vito.Tool
		fn   vito.ToolFunc
	}{
		{
			meta: vito.Tool{
				Name:        "list_low_stock",
				Description: "Lista productos activos con stock en o por debajo del mínimo (por agotarse).",
				ReadOnly:    true,
				Parameters: map[string]any{
					"type": "object",
					"properties": map[string]any{
						"limit": map[string]any{"type": "integer", "description": "Máximo de productos (default 20)"},
					},
				},
			},
			fn: toolListLowStock(st),
		},
		{
			meta: vito.Tool{
				Name:        "sales_summary",
				Description: "Resumen de ventas y margen del negocio en un periodo (7d, 30d, mes).",
				ReadOnly:    true,
				Parameters: map[string]any{
					"type": "object",
					"properties": map[string]any{
						"period": map[string]any{
							"type":        "string",
							"description": "7d | 30d | month (mes actual)",
						},
					},
				},
			},
			fn: toolSalesSummary(st),
		},
		{
			meta: vito.Tool{
				Name:        "top_products",
				Description: "Productos con más ventas (ingresos) en un periodo.",
				ReadOnly:    true,
				Parameters: map[string]any{
					"type": "object",
					"properties": map[string]any{
						"period": map[string]any{"type": "string"},
						"limit":  map[string]any{"type": "integer"},
					},
				},
			},
			fn: toolTopProducts(st),
		},
		{
			meta: vito.Tool{
				Name:        "slow_products",
				Description: "Productos que se mueven más lento (poca o ninguna venta) en el periodo, con stock actual.",
				ReadOnly:    true,
				Parameters: map[string]any{
					"type": "object",
					"properties": map[string]any{
						"period": map[string]any{"type": "string"},
						"limit":  map[string]any{"type": "integer"},
					},
				},
			},
			fn: toolSlowProducts(st),
		},
		{
			meta: vito.Tool{
				Name:        "create_restock_po",
				Description: "Crea una orden de compra en borrador para reponer productos con stock bajo. Requiere confirmación del usuario.",
				ReadOnly:    false,
				Parameters: map[string]any{
					"type": "object",
					"properties": map[string]any{
						"supplier_id": map[string]any{
							"type":        "integer",
							"description": "ID de proveedor (opcional: se infiere del primer producto con proveedor)",
						},
						"notes": map[string]any{"type": "string"},
					},
				},
			},
			fn: toolCreateRestockPO(st),
		},
	}
	for _, t := range tools {
		if err := reg.Register(t.meta, t.fn); err != nil {
			return err
		}
	}
	return nil
}

func toolListLowStock(st *store.Store) vito.ToolFunc {
	return func(ctx context.Context, args map[string]any) (vito.ToolResult, error) {
		limit := argInt(args, "limit", 20)
		if limit <= 0 {
			limit = 20
		}
		products, err := st.ListProducts(store.ProductFilter{LowStock: true})
		if err != nil {
			return failTool("list_low_stock", err)
		}
		if len(products) > limit {
			products = products[:limit]
		}
		type row struct {
			ID       int64   `json:"id"`
			SKU      string  `json:"sku"`
			Name     string  `json:"name"`
			Stock    float64 `json:"stock"`
			MinStock float64 `json:"min_stock"`
			Need     float64 `json:"qty_to_restock"`
			Supplier string  `json:"supplier,omitempty"`
		}
		rows := make([]row, 0, len(products))
		var lines []string
		for _, p := range products {
			need := p.MinStock - p.Stock
			if need < 1 {
				need = 1
			}
			rows = append(rows, row{
				ID: p.ID, SKU: p.SKU, Name: p.Name,
				Stock: p.Stock, MinStock: p.MinStock, Need: need, Supplier: p.SupplierName,
			})
			lines = append(lines, fmt.Sprintf("• %s (%s): stock %g / mín %g → reponer %g",
				p.Name, p.SKU, p.Stock, p.MinStock, need))
		}
		text := "No hay productos por debajo del mínimo de stock."
		if len(lines) > 0 {
			text = fmt.Sprintf("Productos por agotarse (%d):\n%s", len(lines), strings.Join(lines, "\n"))
		}
		payload, _ := json.Marshal(map[string]any{"count": len(rows), "products": rows, "summary": text})
		return vito.ToolResult{
			OK:      true,
			Content: string(payload),
			Citations: []vito.Citation{{
				Source: "onstock.products.low_stock",
				Label:  "Inventario · stock bajo",
				Detail: fmt.Sprintf("%d producto(s)", len(rows)),
			}},
		}, nil
	}
}

func toolSalesSummary(st *store.Store) vito.ToolFunc {
	return func(ctx context.Context, args map[string]any) (vito.ToolResult, error) {
		from, to, label := periodRange(argString(args, "period", "7d"))
		stt, err := st.IncomeStatement(from, to)
		if err != nil {
			return failTool("sales_summary", err)
		}
		text := fmt.Sprintf(
			"Ventas %s (%s → %s):\n• Ventas netas: L %.2f\n• Costo de ventas: L %.2f\n• Utilidad bruta: L %.2f (margen %.1f%%)\n• Utilidad neta: L %.2f\n• Nº ventas: %d\n• ISV cobrado: L %.2f",
			label, from, to,
			stt.VentasNetas, stt.CostoVentas, stt.UtilidadBruta, stt.MargenBruto,
			stt.UtilidadNeta, stt.NumVentas, stt.ISVCobrado,
		)
		payload, _ := json.Marshal(map[string]any{
			"period": label, "from": from, "to": to,
			"ventas_netas": stt.VentasNetas, "utilidad_bruta": stt.UtilidadBruta,
			"margen_bruto": stt.MargenBruto, "utilidad_neta": stt.UtilidadNeta,
			"num_ventas": stt.NumVentas, "summary": text,
		})
		return vito.ToolResult{
			OK:      true,
			Content: string(payload),
			Citations: []vito.Citation{{
				Source: "onstock.reports.income_statement",
				Label:  "Reportes · estado de resultados",
				Detail: fmt.Sprintf("%s a %s", from, to),
			}},
		}, nil
	}
}

func toolTopProducts(st *store.Store) vito.ToolFunc {
	return func(ctx context.Context, args map[string]any) (vito.ToolResult, error) {
		from, to, label := periodRange(argString(args, "period", "30d"))
		limit := argInt(args, "limit", 5)
		if limit <= 0 {
			limit = 5
		}
		top, err := st.TopProducts(from, to, limit)
		if err != nil {
			return failTool("top_products", err)
		}
		var lines []string
		for i, p := range top {
			lines = append(lines, fmt.Sprintf("%d. %s (%s): qty %g · ingresos L %.2f · utilidad L %.2f",
				i+1, p.Name, p.SKU, p.Qty, p.Revenue, p.Profit))
		}
		text := "No hay ventas en el periodo."
		if len(lines) > 0 {
			text = fmt.Sprintf("Top productos %s:\n%s", label, strings.Join(lines, "\n"))
		}
		payload, _ := json.Marshal(map[string]any{"period": label, "from": from, "to": to, "products": top, "summary": text})
		return vito.ToolResult{
			OK:      true,
			Content: string(payload),
			Citations: []vito.Citation{{
				Source: "onstock.reports.top_products",
				Label:  "Reportes · productos top",
				Detail: fmt.Sprintf("%s a %s", from, to),
			}},
		}, nil
	}
}

func toolSlowProducts(st *store.Store) vito.ToolFunc {
	return func(ctx context.Context, args map[string]any) (vito.ToolResult, error) {
		from, to, label := periodRange(argString(args, "period", "30d"))
		limit := argInt(args, "limit", 8)
		if limit <= 0 {
			limit = 8
		}
		products, err := st.ListProducts(store.ProductFilter{})
		if err != nil {
			return failTool("slow_products", err)
		}
		// Sold qty map from top (wide limit)
		top, err := st.TopProducts(from, to, 500)
		if err != nil {
			return failTool("slow_products", err)
		}
		sold := map[int64]float64{}
		for _, t := range top {
			sold[t.ProductID] = t.Qty
		}
		type slow struct {
			ID    int64   `json:"id"`
			SKU   string  `json:"sku"`
			Name  string  `json:"name"`
			Stock float64 `json:"stock"`
			Sold  float64 `json:"qty_sold"`
		}
		var list []slow
		for _, p := range products {
			list = append(list, slow{ID: p.ID, SKU: p.SKU, Name: p.Name, Stock: p.Stock, Sold: sold[p.ID]})
		}
		sort.Slice(list, func(i, j int) bool {
			if list[i].Sold == list[j].Sold {
				return list[i].Stock > list[j].Stock
			}
			return list[i].Sold < list[j].Sold
		})
		if len(list) > limit {
			list = list[:limit]
		}
		var lines []string
		for _, p := range list {
			lines = append(lines, fmt.Sprintf("• %s (%s): vendido %g · stock actual %g", p.Name, p.SKU, p.Sold, p.Stock))
		}
		text := fmt.Sprintf("Productos de movimiento lento (%s):\n%s", label, strings.Join(lines, "\n"))
		if len(lines) == 0 {
			text = "No hay productos para analizar."
		}
		payload, _ := json.Marshal(map[string]any{"period": label, "from": from, "to": to, "products": list, "summary": text})
		return vito.ToolResult{
			OK:      true,
			Content: string(payload),
			Citations: []vito.Citation{{
				Source: "onstock.products.slow_movers",
				Label:  "Inventario · rotación lenta",
				Detail: fmt.Sprintf("%s a %s", from, to),
			}},
		}, nil
	}
}

func toolCreateRestockPO(st *store.Store) vito.ToolFunc {
	return func(ctx context.Context, args map[string]any) (vito.ToolResult, error) {
		products, err := st.ListProducts(store.ProductFilter{LowStock: true})
		if err != nil {
			return failTool("create_restock_po", err)
		}
		if len(products) == 0 {
			return vito.ToolResult{
				OK:      true,
				Content: `{"summary":"No hay productos con stock bajo; no se creó orden de compra."}`,
				Citations: []vito.Citation{{
					Source: "onstock.products.low_stock",
					Label:  "Inventario · stock bajo",
					Detail: "0 productos",
				}},
			}, nil
		}

		// Group by supplier; pick supplier_id from args or majority/first with supplier.
		supplierID := int64(argInt(args, "supplier_id", 0))
		if supplierID == 0 {
			counts := map[int64]int{}
			for _, p := range products {
				if p.SupplierID != nil && *p.SupplierID > 0 {
					counts[*p.SupplierID]++
				}
			}
			best, bestN := int64(0), 0
			for id, n := range counts {
				if n > bestN {
					best, bestN = id, n
				}
			}
			supplierID = best
		}
		if supplierID == 0 {
			return vito.ToolResult{
				OK:      false,
				Error:   "ningún producto con stock bajo tiene proveedor asignado; indícalo en supplier_id",
				Content: `{"error":"falta proveedor"}`,
			}, fmt.Errorf("falta proveedor")
		}

		var items []store.NewPOItemIn
		var lines []string
		for _, p := range products {
			if p.SupplierID != nil && *p.SupplierID != supplierID {
				continue // una OC por proveedor
			}
			if p.SupplierID == nil {
				continue
			}
			need := p.MinStock - p.Stock
			if need < 1 {
				need = 1
			}
			// redondear hacia arriba a entero de compra
			need = math.Ceil(need)
			items = append(items, store.NewPOItemIn{
				ProductID: p.ID,
				Qty:       need,
				UnitCost:  p.Cost,
			})
			lines = append(lines, fmt.Sprintf("• %s × %g @ L %.2f", p.Name, need, p.Cost))
		}
		if len(items) == 0 {
			// include all low stock under chosen supplier even if only that supplier
			for _, p := range products {
				need := math.Ceil(math.Max(1, p.MinStock-p.Stock))
				items = append(items, store.NewPOItemIn{ProductID: p.ID, Qty: need, UnitCost: p.Cost})
				lines = append(lines, fmt.Sprintf("• %s × %g @ L %.2f", p.Name, need, p.Cost))
			}
		}
		notes := argString(args, "notes", "Generada por Vito · reposición de stock bajo")
		po, err := st.CreatePurchaseOrder(store.NewPOInput{
			SupplierID: supplierID,
			Notes:      notes,
			Items:      items,
		})
		if err != nil {
			return failTool("create_restock_po", err)
		}
		text := fmt.Sprintf("Orden de compra %s creada (estado: %s) para %s.\nÍtems:\n%s\nTotal estimado: L %.2f",
			po.PONumber, po.Status, po.SupplierName, strings.Join(lines, "\n"), po.Total)
		payload, _ := json.Marshal(map[string]any{
			"po_id": po.ID, "po_number": po.PONumber, "status": po.Status,
			"supplier": po.SupplierName, "total": po.Total, "summary": text,
		})
		return vito.ToolResult{
			OK:      true,
			Content: string(payload),
			Citations: []vito.Citation{{
				Source: "onstock.purchase_orders.create",
				Label:  "Compras · orden creada",
				Detail: po.PONumber,
			}},
		}, nil
	}
}

func failTool(name string, err error) (vito.ToolResult, error) {
	return vito.ToolResult{
		Name:    name,
		OK:      false,
		Error:   err.Error(),
		Content: fmt.Sprintf(`{"error":%q}`, err.Error()),
	}, err
}

func periodRange(period string) (from, to, label string) {
	now := time.Now()
	to = now.Format("2006-01-02")
	switch strings.ToLower(strings.TrimSpace(period)) {
	case "30d", "30", "mes_movil":
		from = now.AddDate(0, 0, -30).Format("2006-01-02")
		label = "últimos 30 días"
	case "month", "mes", "this_month":
		from = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")
		label = "mes actual"
	default: // 7d
		from = now.AddDate(0, 0, -7).Format("2006-01-02")
		label = "últimos 7 días"
	}
	return from, to, label
}

func argString(args map[string]any, key, def string) string {
	if args == nil {
		return def
	}
	v, ok := args[key]
	if !ok || v == nil {
		return def
	}
	switch t := v.(type) {
	case string:
		if strings.TrimSpace(t) == "" {
			return def
		}
		return t
	default:
		return fmt.Sprint(t)
	}
}

func argInt(args map[string]any, key string, def int) int {
	if args == nil {
		return def
	}
	v, ok := args[key]
	if !ok || v == nil {
		return def
	}
	switch t := v.(type) {
	case float64:
		return int(t)
	case int:
		return t
	case int64:
		return int(t)
	case json.Number:
		n, err := t.Int64()
		if err != nil {
			return def
		}
		return int(n)
	case string:
		var n int
		if _, err := fmt.Sscanf(t, "%d", &n); err == nil {
			return n
		}
	}
	return def
}
