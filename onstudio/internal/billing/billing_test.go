package billing

import (
	"math"
	"testing"

	"onstudio/internal/config"
	"onstudio/internal/engine"
	"onstudio/internal/store"
)

func pricing(prefer bool) config.Pricing {
	return config.Pricing{Currency: "USD", HNLRate: 24.6, DefaultMargin: 2.0, PreferReportedCost: prefer}
}

func almost(a, b float64) bool { return math.Abs(a-b) < 1e-9 }

func TestComputePrefersReportedCost(t *testing.T) {
	u := engine.Usage{InputTokens: 1000, OutputTokens: 500, Cost: 0.03}
	rule := store.PriceRule{Provider: "anthropic", Model: "m", InputPerMTok: 3, OutputPerMTok: 15, Margin: 2}
	got := Compute(u, rule, true, pricing(true))
	if got.CostSource != "reported" {
		t.Errorf("source = %q, want reported", got.CostSource)
	}
	if !almost(got.ProviderCostUSD, 0.03) {
		t.Errorf("basis = %v, want 0.03", got.ProviderCostUSD)
	}
	if !almost(got.PriceUSD, 0.06) {
		t.Errorf("priceUSD = %v, want 0.06", got.PriceUSD)
	}
	if !almost(got.PriceHNL, 0.06*24.6) {
		t.Errorf("priceHNL = %v, want %v", got.PriceHNL, 0.06*24.6)
	}
}

func TestComputeFromTokensWhenNoReportedCost(t *testing.T) {
	// 1M input × $3/M + 2M output × $15/M = 3 + 30 = 33 USD base.
	u := engine.Usage{InputTokens: 1_000_000, OutputTokens: 2_000_000, Cost: 0}
	rule := store.PriceRule{InputPerMTok: 3, OutputPerMTok: 15, Margin: 2}
	got := Compute(u, rule, true, pricing(true))
	if got.CostSource != "tokens" {
		t.Errorf("source = %q, want tokens", got.CostSource)
	}
	if !almost(got.ProviderCostUSD, 33) {
		t.Errorf("basis = %v, want 33", got.ProviderCostUSD)
	}
	if !almost(got.PriceUSD, 66) {
		t.Errorf("priceUSD = %v, want 66", got.PriceUSD)
	}
}

func TestComputeTokensWhenPreferReportedIsOff(t *testing.T) {
	// Aunque haya costo reportado, prefer_reported_cost=false → usar tokens.
	u := engine.Usage{InputTokens: 1_000_000, OutputTokens: 0, Cost: 0.99}
	rule := store.PriceRule{InputPerMTok: 3, OutputPerMTok: 15, Margin: 1}
	got := Compute(u, rule, true, pricing(false))
	if got.CostSource != "tokens" || !almost(got.ProviderCostUSD, 3) {
		t.Errorf("got %+v, want tokens/3", got)
	}
}

func TestComputeDefaultMarginWhenRuleMarginZero(t *testing.T) {
	u := engine.Usage{Cost: 0.01}
	rule := store.PriceRule{Margin: 0} // sin margen propio
	got := Compute(u, rule, true, pricing(true))
	if !almost(got.Margin, 2.0) {
		t.Errorf("margin = %v, want default 2.0", got.Margin)
	}
	if !almost(got.PriceUSD, 0.02) {
		t.Errorf("priceUSD = %v, want 0.02", got.PriceUSD)
	}
}

func TestComputeNoRuleNoCost(t *testing.T) {
	got := Compute(engine.Usage{InputTokens: 100}, store.PriceRule{}, false, pricing(true))
	if got.CostSource != "unknown" || got.ProviderCostUSD != 0 || got.PriceUSD != 0 {
		t.Errorf("got %+v, want unknown/0/0", got)
	}
}

func TestComputeFallsBackToReportedWhenNoRule(t *testing.T) {
	// Sin regla en el registro, pero el proveedor reporta costo → usarlo.
	got := Compute(engine.Usage{Cost: 0.05}, store.PriceRule{}, false, pricing(true))
	if got.CostSource != "reported" || !almost(got.ProviderCostUSD, 0.05) {
		t.Errorf("got %+v, want reported/0.05", got)
	}
	if !almost(got.PriceUSD, 0.05*2.0) {
		t.Errorf("priceUSD = %v, want 0.10 (default margin)", got.PriceUSD)
	}
}
