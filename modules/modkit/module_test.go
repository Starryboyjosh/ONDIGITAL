package modkit_test

import (
	"context"
	"testing"

	"ondigital.hn/modkit"
	"ondigital.hn/vito"
)

type okMod struct{ id string }

func (m okMod) ID() string          { return m.id }
func (m okMod) Name() string        { return "OK" }
func (m okMod) Version() string     { return "1.0.0" }
func (m okMod) Description() string { return "ok module" }
func (m okMod) Capabilities() []modkit.Capability {
	return []modkit.Capability{
		{ID: m.id + ".q", Name: "Consulta", Kind: modkit.KindQuery, ReadOnly: true, VitoTool: "q"},
		{ID: m.id + ".a", Name: "Acción", Kind: modkit.KindAction, ReadOnly: false, VitoTool: "a"},
	}
}
func (m okMod) RegisterVitoTools(reg *vito.Registry) error {
	return reg.Register(vito.Tool{Name: "q_" + m.id, Description: "q", ReadOnly: true},
		func(ctx context.Context, args map[string]any) (vito.ToolResult, error) {
			return vito.ToolResult{OK: true, Content: `{"ok":true}`}, nil
		})
}

func TestCatalog_RegisterListInfos(t *testing.T) {
	c := modkit.NewCatalog()
	if err := c.Register(okMod{id: "alpha"}); err != nil {
		t.Fatal(err)
	}
	if err := c.Register(okMod{id: "beta"}); err != nil {
		t.Fatal(err)
	}
	if err := c.Register(okMod{id: "alpha"}); err == nil {
		t.Fatal("duplicate id should fail")
	}
	list := c.List()
	if len(list) != 2 || list[0].ID() != "alpha" {
		t.Fatalf("list = %+v", list)
	}
	infos := c.Infos()
	if len(infos) != 2 || len(infos[0].Capabilities) != 2 {
		t.Fatalf("infos = %+v", infos)
	}
	if infos[0].Capabilities[0].Kind != modkit.KindQuery {
		t.Fatalf("kind = %s", infos[0].Capabilities[0].Kind)
	}
}

func TestCatalog_RegisterAllVitoTools(t *testing.T) {
	c := modkit.NewCatalog()
	_ = c.Register(okMod{id: "m1"})
	reg := vito.NewRegistry()
	if err := c.RegisterAllVitoTools(reg); err != nil {
		t.Fatal(err)
	}
	if len(reg.List()) != 1 {
		t.Fatalf("tools = %d", len(reg.List()))
	}
}
