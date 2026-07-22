package vito

import (
	"context"
	"fmt"
	"strings"
)

// MockProvider answers offline without any network or API key.
// Used for tests, demos without credentials, and local development.
type MockProvider struct{}

func NewMockProvider() *MockProvider { return &MockProvider{} }

func (m *MockProvider) Name() string { return "mock" }

func (m *MockProvider) Ask(ctx context.Context, req ProviderRequest) (ProviderResult, error) {
	if err := ctx.Err(); err != nil {
		return ProviderResult{}, err
	}

	user := lastUserText(req.Messages)
	lower := strings.ToLower(user)

	// Prefer tool use when low-stock intent and the tool is registered.
	if looksLikeLowStock(lower) {
		if hasTool(req.Tools, "list_low_stock") {
			return ProviderResult{
				Content: "",
				ToolCalls: []ToolCall{{
					ID:   "call_low_stock_1",
					Name: "list_low_stock",
					Arguments: map[string]any{
						"limit": 20,
					},
				}},
			}, nil
		}
		return ProviderResult{
			Content: "Puedo ayudarte con el inventario cuando el sistema me dé acceso a los datos de stock. Por ahora no tengo esa herramienta conectada.",
		}, nil
	}

	if looksLikeSales(lower) {
		if hasTool(req.Tools, "sales_summary") {
			period := "7d"
			if strings.Contains(lower, "mes") || strings.Contains(lower, "30") {
				period = "30d"
			}
			return ProviderResult{
				ToolCalls: []ToolCall{{
					ID:   "call_sales_1",
					Name: "sales_summary",
					Arguments: map[string]any{
						"period": period,
					},
				}},
			}, nil
		}
	}

	if looksLikeSlow(lower) {
		if hasTool(req.Tools, "slow_products") {
			return ProviderResult{
				ToolCalls: []ToolCall{{
					ID:        "call_slow_1",
					Name:      "slow_products",
					Arguments: map[string]any{"period": "30d", "limit": 8},
				}},
			}, nil
		}
	}

	if looksLikeRestockPO(lower) {
		if hasTool(req.Tools, "create_restock_po") {
			return ProviderResult{
				ToolCalls: []ToolCall{{
					ID:   "call_po_1",
					Name: "create_restock_po",
					Arguments: map[string]any{
						"notes": "Generada por Vito · reposición de stock bajo",
					},
				}},
			}, nil
		}
	}

	// Pérdidas / cómo mejorar: juntar ventas + stock bajo + rotación lenta
	if looksLikeLossOrAdvice(lower) {
		var calls []ToolCall
		if hasTool(req.Tools, "sales_summary") {
			calls = append(calls, ToolCall{
				ID: "call_sales_loss", Name: "sales_summary",
				Arguments: map[string]any{"period": "30d"},
			})
		}
		if hasTool(req.Tools, "list_low_stock") {
			calls = append(calls, ToolCall{
				ID: "call_stock_loss", Name: "list_low_stock",
				Arguments: map[string]any{"limit": 15},
			})
		}
		if hasTool(req.Tools, "slow_products") {
			calls = append(calls, ToolCall{
				ID: "call_slow_loss", Name: "slow_products",
				Arguments: map[string]any{"period": "30d", "limit": 6},
			})
		}
		if len(calls) > 0 {
			return ProviderResult{ToolCalls: calls}, nil
		}
	}

	// If tool results already present, prefer a short grounded wrap-up.
	if note := lastToolContent(req.Messages); note != "" {
		return ProviderResult{
			Content: "Con base en los datos del sistema: revisa el resumen anterior. " +
				"Para reducir pérdidas suele ayudar reponer lo que se agota, empujar lo de rotación lenta y vigilar el margen de las ventas del mes.",
		}, nil
	}

	if user == "" {
		return ProviderResult{
			Content: "Hola, soy Vito. Pregúntame sobre tu inventario, ventas o lo que necesites del negocio.",
		}, nil
	}

	// Tools sí están conectadas: el mock no entendió la frase — orientar, no mentir.
	if len(req.Tools) > 0 {
		return ProviderResult{
			Content: fmt.Sprintf(
				"Entendí: «%s». Puedo consultar datos reales de tu OnStock. Prueba por ejemplo:\n"+
					"• ¿Qué productos están por agotarse?\n"+
					"• ¿Cuánto vendí esta semana y cuál fue mi margen?\n"+
					"• ¿Qué producto se mueve más lento?\n"+
					"• ¿Cómo puedo evitar pérdidas?\n"+
					"• Genera la orden de compra de lo que falta\n\n"+
					"Para ampliar el tipo de consultas disponibles, contacta al administrador del sistema.",
				truncateRunes(user, 120),
			),
		}, nil
	}

	return ProviderResult{
		Content: fmt.Sprintf(
			"Entendí tu consulta: «%s». Aún no hay herramientas de datos conectadas en este host.",
			truncateRunes(user, 160),
		),
	}, nil
}

func lastUserText(msgs []Message) string {
	for i := len(msgs) - 1; i >= 0; i-- {
		if msgs[i].Role == RoleUser {
			return strings.TrimSpace(msgs[i].Content)
		}
	}
	return ""
}

func hasTool(tools []Tool, name string) bool {
	for _, t := range tools {
		if t.Name == name {
			return true
		}
	}
	return false
}

func looksLikeLowStock(s string) bool {
	keys := []string{
		"agot", "stock bajo", "reposición", "reposicion",
		"faltante", "por acabarse", "pocas unidades", "sin stock",
		"low stock", "inventario bajo",
	}
	for _, k := range keys {
		if strings.Contains(s, k) {
			return true
		}
	}
	return strings.Contains(s, "productos") && (strings.Contains(s, "falta") || strings.Contains(s, "bajo"))
}

func looksLikeSales(s string) bool {
	keys := []string{"vend", "venta", "margen", "ingreso", "factur", "utilidad", "gananc"}
	for _, k := range keys {
		if strings.Contains(s, k) {
			return true
		}
	}
	return false
}

func looksLikeLossOrAdvice(s string) bool {
	keys := []string{
		"perdida", "pérdida", "perdidas", "pérdidas",
		"evitar", "reducir costos", "mejorar margen", "merma",
		"cómo gano", "como gano", "rentab", "optimizar",
	}
	for _, k := range keys {
		if strings.Contains(s, k) {
			return true
		}
	}
	return false
}

func looksLikeSlow(s string) bool {
	keys := []string{"lento", "lenta", "no se mueve", "poco movimiento", "rotación", "rotacion", "estancad"}
	for _, k := range keys {
		if strings.Contains(s, k) {
			return true
		}
	}
	return false
}

func looksLikeRestockPO(s string) bool {
	keys := []string{
		"orden de compra", "orden de reposición", "orden de reposicion",
		"genera la orden", "generar la orden", "crea la orden", "crear orden",
		"compra de lo que falta", "reponer lo que falta",
	}
	for _, k := range keys {
		if strings.Contains(s, k) {
			return true
		}
	}
	return strings.Contains(s, "orden") && (strings.Contains(s, "falta") || strings.Contains(s, "stock"))
}

func lastToolContent(msgs []Message) string {
	for i := len(msgs) - 1; i >= 0; i-- {
		if msgs[i].Role == RoleTool && strings.TrimSpace(msgs[i].Content) != "" {
			return msgs[i].Content
		}
	}
	return ""
}

func truncateRunes(s string, max int) string {
	r := []rune(s)
	if len(r) <= max {
		return s
	}
	return string(r[:max]) + "…"
}
