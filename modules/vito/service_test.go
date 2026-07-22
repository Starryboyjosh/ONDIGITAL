package vito_test

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"ondigital.hn/vito"
)

type namedReplyProvider struct {
	name  string
	reply string
}

func (p namedReplyProvider) Name() string { return p.name }

func (p namedReplyProvider) Ask(context.Context, vito.ProviderRequest) (vito.ProviderResult, error) {
	return vito.ProviderResult{Content: p.reply}, nil
}

func TestNew_RequiresProvider(t *testing.T) {
	_, err := vito.New(vito.Config{Enabled: true}, nil, nil)
	if err == nil {
		t.Fatal("expected error when provider is nil")
	}
}

func TestAsk_EmptyMessage(t *testing.T) {
	svc := mustService(t, true, vito.NewRegistry())
	_, err := svc.Ask(context.Background(), vito.AskRequest{Message: "  "})
	if err == nil {
		t.Fatal("expected error for empty message")
	}
}

func TestAsk_Disabled(t *testing.T) {
	svc := mustService(t, false, vito.NewRegistry())
	res, err := svc.Ask(context.Background(), vito.AskRequest{Message: "hola"})
	if err != nil {
		t.Fatal(err)
	}
	if !res.Mock {
		t.Error("disabled path should set Mock")
	}
	if !strings.Contains(strings.ToLower(res.Reply), "vito") {
		t.Errorf("reply should mention Vito, got %q", res.Reply)
	}
	assertNoVendorLeak(t, res.Reply)
}

func TestAsk_MockGreeting(t *testing.T) {
	svc := mustService(t, true, vito.NewRegistry())
	res, err := svc.Ask(context.Background(), vito.AskRequest{Message: "¿quién eres?"})
	if err != nil {
		t.Fatal(err)
	}
	if res.Reply == "" {
		t.Fatal("empty reply")
	}
	if !res.Mock {
		t.Error("mock provider should mark Mock=true")
	}
	assertNoVendorLeak(t, res.Reply)
}

func TestAsk_LowStockWithTool(t *testing.T) {
	reg := vito.NewRegistry()
	err := reg.Register(vito.Tool{
		Name:        "list_low_stock",
		Description: "Lista productos con stock bajo o por agotarse",
		ReadOnly:    true,
	}, func(ctx context.Context, args map[string]any) (vito.ToolResult, error) {
		payload := []map[string]any{
			{"sku": "A-01", "name": "Guantes Nitrilo M", "stock": 2, "min": 10},
			{"sku": "B-02", "name": "Gasas estériles", "stock": 0, "min": 5},
		}
		raw, _ := json.Marshal(payload)
		return vito.ToolResult{
			OK:      true,
			Content: string(raw),
			Citations: []vito.Citation{{
				Source: "demo.products.low_stock",
				Label:  "Inventario · stock bajo",
				Detail: "2 productos",
			}},
		}, nil
	})
	if err != nil {
		t.Fatal(err)
	}

	svc := mustService(t, true, reg)
	res, err := svc.Ask(context.Background(), vito.AskRequest{
		Message: "¿qué productos están por agotarse?",
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.Reply == "" {
		t.Fatal("empty reply")
	}
	if !strings.Contains(res.Reply, "Guantes") && !strings.Contains(res.Reply, "Gasas") {
		t.Errorf("reply should include tool data, got %q", res.Reply)
	}
	if len(res.Citations) == 0 {
		t.Fatal("expected citations from tool")
	}
	if res.Citations[0].Source != "demo.products.low_stock" {
		t.Errorf("citation source = %q", res.Citations[0].Source)
	}
	if len(res.ToolCalls) == 0 || res.ToolCalls[0].Name != "list_low_stock" {
		t.Errorf("expected list_low_stock tool call, got %+v", res.ToolCalls)
	}
	assertNoVendorLeak(t, res.Reply)
}

func TestAsk_LowStockWithoutTool(t *testing.T) {
	svc := mustService(t, true, vito.NewRegistry())
	res, err := svc.Ask(context.Background(), vito.AskRequest{
		Message: "productos por agotarse",
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.Reply == "" {
		t.Fatal("empty reply")
	}
	assertNoVendorLeak(t, res.Reply)
}

func TestAsk_WriteToolPendingAction(t *testing.T) {
	reg := vito.NewRegistry()
	// Mock only auto-calls list_low_stock / sales_summary. Register a write tool
	// and force it via a tiny custom provider... use mock sales path is read-only.
	// Instead register list_low_stock as write to exercise the branch.
	err := reg.Register(vito.Tool{
		Name:        "list_low_stock",
		Description: "Generaría una orden de compra de faltantes",
		ReadOnly:    false,
	}, func(ctx context.Context, args map[string]any) (vito.ToolResult, error) {
		t.Fatal("write tool must not auto-run")
		return vito.ToolResult{}, nil
	})
	if err != nil {
		t.Fatal(err)
	}

	svc := mustService(t, true, reg)
	res, err := svc.Ask(context.Background(), vito.AskRequest{
		Message: "¿qué productos están por agotarse?",
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.PendingAction == nil {
		t.Fatalf("expected PendingAction, got reply %q", res.Reply)
	}
	if res.PendingAction.ToolName != "list_low_stock" {
		t.Errorf("tool = %q", res.PendingAction.ToolName)
	}
	assertNoVendorLeak(t, res.Reply)
}

func TestRegistry_UnknownTool(t *testing.T) {
	reg := vito.NewRegistry()
	_, err := reg.Run(context.Background(), vito.ToolCall{ID: "1", Name: "nope"})
	if err == nil {
		t.Fatal("expected error for unknown tool")
	}
}

func TestProviderName_InternalOnly(t *testing.T) {
	svc := mustService(t, true, vito.NewRegistry())
	if svc.ProviderName() != "mock" {
		t.Fatalf("ProviderName = %q", svc.ProviderName())
	}
	// Ensure Ask reply still does not expose it.
	res, err := svc.Ask(context.Background(), vito.AskRequest{Message: "hola Vito"})
	if err != nil {
		t.Fatal(err)
	}
	assertNoVendorLeak(t, res.Reply)
	if strings.Contains(strings.ToLower(res.Reply), "mock") {
		t.Errorf("reply must not expose provider id: %q", res.Reply)
	}
}

func TestAsk_MockGuidanceDoesNotLeakDeploymentDetails(t *testing.T) {
	reg := vito.NewRegistry()
	if err := reg.Register(vito.Tool{Name: "business_data", ReadOnly: true}, func(context.Context, map[string]any) (vito.ToolResult, error) {
		return vito.ToolResult{OK: true}, nil
	}); err != nil {
		t.Fatal(err)
	}
	svc := mustService(t, true, reg)
	res, err := svc.Ask(context.Background(), vito.AskRequest{Message: "Necesito una respuesta abierta"})
	if err != nil {
		t.Fatal(err)
	}
	for _, forbidden := range []string{"vito_", "api key", "opencode", "openai", "anthropic"} {
		if strings.Contains(strings.ToLower(res.Reply), forbidden) {
			t.Errorf("reply leaked %q: %q", forbidden, res.Reply)
		}
	}
}

func TestAsk_SanitizesProviderBranding(t *testing.T) {
	svc, err := vito.New(vito.Config{Enabled: true}, namedReplyProvider{
		name:  "internal-engine",
		reply: "Soy ChatGPT de OpenAI y uso internal-engine.",
	}, nil)
	if err != nil {
		t.Fatal(err)
	}
	res, err := svc.Ask(context.Background(), vito.AskRequest{Message: "quien eres"})
	if err != nil {
		t.Fatal(err)
	}
	for _, forbidden := range []string{"chatgpt", "openai", "internal-engine"} {
		if strings.Contains(strings.ToLower(res.Reply), forbidden) {
			t.Errorf("reply leaked %q: %q", forbidden, res.Reply)
		}
	}
}

func mustService(t *testing.T, enabled bool, reg *vito.Registry) *vito.Service {
	t.Helper()
	svc, err := vito.New(vito.Config{Enabled: enabled}, vito.NewMockProvider(), reg)
	if err != nil {
		t.Fatal(err)
	}
	return svc
}

func assertNoVendorLeak(t *testing.T, text string) {
	t.Helper()
	lower := strings.ToLower(text)
	banned := []string{"claude", "chatgpt", "openai", "opencode", "gpt-4", "anthropic", "nemotron"}
	for _, b := range banned {
		if strings.Contains(lower, b) {
			t.Errorf("vendor leak %q in %q", b, text)
		}
	}
}
