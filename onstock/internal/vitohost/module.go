package vitohost

import (
	"ondigital.hn/modkit"
	"ondigital.hn/vito"
	"onstock/internal/store"
)

// OnStockModule adapts the OnStock store to the ONDIGITAL module contract (Fase 2).
type OnStockModule struct {
	st *store.Store
}

// NewOnStockModule returns the business module for this process.
func NewOnStockModule(st *store.Store) *OnStockModule {
	return &OnStockModule{st: st}
}

func (m *OnStockModule) ID() string      { return "onstock" }
func (m *OnStockModule) Name() string    { return "OnStock" }
func (m *OnStockModule) Version() string { return "1.0.0" }
func (m *OnStockModule) Description() string {
	return "Inventario, ventas, compras y reportes para tiendas (Honduras)."
}

func (m *OnStockModule) Capabilities() []modkit.Capability {
	return []modkit.Capability{
		{
			ID: "onstock.inventory.low_stock", Name: "Stock bajo",
			Description: "Productos activos con stock en o bajo el mínimo.",
			Kind:        modkit.KindQuery, VitoTool: "list_low_stock", ReadOnly: true,
		},
		{
			ID: "onstock.sales.summary", Name: "Resumen de ventas",
			Description: "Ventas netas, margen y utilidad en un periodo.",
			Kind:        modkit.KindQuery, VitoTool: "sales_summary", ReadOnly: true,
		},
		{
			ID: "onstock.sales.top_products", Name: "Top productos",
			Description: "Productos con más ingresos en un periodo.",
			Kind:        modkit.KindQuery, VitoTool: "top_products", ReadOnly: true,
		},
		{
			ID: "onstock.inventory.slow_movers", Name: "Rotación lenta",
			Description: "Productos con poca o nula venta y stock actual.",
			Kind:        modkit.KindQuery, VitoTool: "slow_products", ReadOnly: true,
		},
		{
			ID: "onstock.purchases.restock_po", Name: "Orden de reposición",
			Description: "Crea una OC en borrador para reponer stock bajo (requiere confirmación).",
			Kind:        modkit.KindAction, VitoTool: "create_restock_po", ReadOnly: false,
		},
	}
}

// RegisterVitoTools attaches OnStock domain tools. No-op if store is nil.
func (m *OnStockModule) RegisterVitoTools(reg *vito.Registry) error {
	if m == nil || m.st == nil || reg == nil {
		return nil
	}
	return RegisterOnStockTools(reg, m.st)
}

// Ensure interface compliance at compile time.
var _ modkit.Module = (*OnStockModule)(nil)
