// Package billing convierte el uso de tokens de un turno en una línea de factura:
// costo base (preferir el costo reportado por el proveedor; si no, tokens × tarifa
// del registro de precios) × margen del modelo, con su equivalente en HNL. USD es
// la moneda base del registro; HNL es solo presentación.
//
// Ver docs/onstudio/token-billing.md para la política completa.
package billing

import (
	"onstudio/internal/config"
	"onstudio/internal/engine"
	"onstudio/internal/store"
)

// Line es el resultado del cálculo de facturación de un turno.
type Line struct {
	InputTokens      int64
	OutputTokens     int64
	ReasoningTokens  int64
	CacheReadTokens  int64
	CacheWriteTokens int64
	ProviderCostUSD  float64 // base de cobro en USD
	Margin           float64 // margen aplicado
	PriceUSD         float64 // ProviderCostUSD × Margin
	PriceHNL         float64 // PriceUSD × hnl_rate
	CostSource       string  // "reported" | "tokens" | "unknown"
}

// Compute calcula la línea de factura a partir del uso del turno. `rule`/`found`
// provienen de store.GetPrice(provider, model).
func Compute(u engine.Usage, rule store.PriceRule, found bool, p config.Pricing) Line {
	// Margen: el del modelo; si no hay regla o viene en cero, el margen por defecto.
	margin := 0.0
	if found {
		margin = rule.Margin
	}
	if margin <= 0 {
		margin = p.DefaultMargin
	}
	if margin <= 0 {
		margin = 1.0
	}

	// Base de costo: preferir el costo reportado por el proveedor cuando aplique;
	// si no, calcular desde tokens con la tarifa del registro.
	basis := 0.0
	source := "unknown"
	switch {
	case p.PreferReportedCost && u.Cost > 0:
		basis, source = u.Cost, "reported"
	case found && (rule.InputPerMTok > 0 || rule.OutputPerMTok > 0):
		basis = float64(u.InputTokens)/1e6*rule.InputPerMTok + float64(u.OutputTokens)/1e6*rule.OutputPerMTok
		source = "tokens"
	case u.Cost > 0:
		// Sin tarifa utilizable, pero el proveedor sí reportó costo: úsalo.
		basis, source = u.Cost, "reported"
	}

	rate := p.HNLRate
	if rate <= 0 {
		rate = 24.6
	}
	price := basis * margin

	return Line{
		InputTokens:      u.InputTokens,
		OutputTokens:     u.OutputTokens,
		ReasoningTokens:  u.ReasoningTokens,
		CacheReadTokens:  u.CacheReadTokens,
		CacheWriteTokens: u.CacheWriteTokens,
		ProviderCostUSD:  basis,
		Margin:           margin,
		PriceUSD:         price,
		PriceHNL:         price * rate,
		CostSource:       source,
	}
}
