package vito

import (
	"context"
	"fmt"
	"sync"
)

// ToolFunc executes a tool in the host app (DB, APIs, etc.).
type ToolFunc func(ctx context.Context, args map[string]any) (ToolResult, error)

// Registry holds tools Vito may call. Hosts register domain tools at startup.
type Registry struct {
	mu    sync.RWMutex
	meta  map[string]Tool
	funcs map[string]ToolFunc
}

// NewRegistry returns an empty tool registry.
func NewRegistry() *Registry {
	return &Registry{
		meta:  make(map[string]Tool),
		funcs: make(map[string]ToolFunc),
	}
}

// Register adds or replaces a tool. Name must be non-empty and unique.
func (r *Registry) Register(tool Tool, fn ToolFunc) error {
	if tool.Name == "" {
		return fmt.Errorf("vito: tool name is required")
	}
	if fn == nil {
		return fmt.Errorf("vito: tool %q handler is nil", tool.Name)
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.meta[tool.Name] = tool
	r.funcs[tool.Name] = fn
	return nil
}

// List returns tool metadata for the provider (order not guaranteed).
func (r *Registry) List() []Tool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]Tool, 0, len(r.meta))
	for _, t := range r.meta {
		out = append(out, t)
	}
	return out
}

// Get returns metadata for a tool.
func (r *Registry) Get(name string) (Tool, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	t, ok := r.meta[name]
	return t, ok
}

// Run executes a registered tool by name.
func (r *Registry) Run(ctx context.Context, call ToolCall) (ToolResult, error) {
	r.mu.RLock()
	fn, ok := r.funcs[call.Name]
	r.mu.RUnlock()
	if !ok {
		return ToolResult{
			CallID: call.ID,
			Name:   call.Name,
			OK:     false,
			Error:  fmt.Sprintf("herramienta no registrada: %s", call.Name),
		}, fmt.Errorf("vito: unknown tool %q", call.Name)
	}
	res, err := fn(ctx, call.Arguments)
	if res.CallID == "" {
		res.CallID = call.ID
	}
	if res.Name == "" {
		res.Name = call.Name
	}
	return res, err
}
