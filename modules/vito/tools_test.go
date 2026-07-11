package vito_test

import (
	"context"
	"testing"

	"ondigital.hn/vito"
)

func TestRegistry_RegisterAndList(t *testing.T) {
	reg := vito.NewRegistry()
	err := reg.Register(vito.Tool{
		Name:        "ping",
		Description: "eco",
		ReadOnly:    true,
	}, func(ctx context.Context, args map[string]any) (vito.ToolResult, error) {
		return vito.ToolResult{OK: true, Content: `{"pong":true}`}, nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := reg.Register(vito.Tool{Name: ""}, func(ctx context.Context, args map[string]any) (vito.ToolResult, error) {
		return vito.ToolResult{}, nil
	}); err == nil {
		t.Fatal("empty name should fail")
	}

	list := reg.List()
	if len(list) != 1 || list[0].Name != "ping" {
		t.Fatalf("list = %+v", list)
	}

	res, err := reg.Run(context.Background(), vito.ToolCall{ID: "c1", Name: "ping"})
	if err != nil {
		t.Fatal(err)
	}
	if !res.OK || res.CallID != "c1" || res.Name != "ping" {
		t.Fatalf("result = %+v", res)
	}
}
