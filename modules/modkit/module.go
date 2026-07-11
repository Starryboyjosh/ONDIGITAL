// Package modkit defines the business-module contract for ONDIGITAL suites.
// Apps (OnStock, Credental, …) implement Module; Vito and the platform
// discover capabilities through a Catalog without knowing vendor/AI details.
package modkit

import (
	"fmt"
	"sort"
	"sync"

	"ondigital.hn/vito"
)

// Kind classifies a capability.
type Kind string

const (
	KindQuery  Kind = "query"  // read-only data access
	KindAction Kind = "action" // mutates business state (needs confirmation when exposed to Vito)
)

// Capability is one thing a module can do for the platform and/or Vito.
type Capability struct {
	// ID is stable, namespaced, e.g. "onstock.inventory.low_stock".
	ID string `json:"id"`
	// Name is short Spanish label for UIs/catalog.
	Name string `json:"name"`
	// Description explains the capability (also useful for Vito tools).
	Description string `json:"description"`
	Kind        Kind   `json:"kind"`
	// VitoTool is the tool name registered on vito.Registry, if any.
	VitoTool string `json:"vito_tool,omitempty"`
	// ReadOnly mirrors Vito tool semantics (actions are false).
	ReadOnly bool `json:"read_only"`
}

// Info is public metadata about a module (safe for GET /api/modules).
type Info struct {
	ID           string       `json:"id"`
	Name         string       `json:"name"`
	Version      string       `json:"version"`
	Description  string       `json:"description,omitempty"`
	Capabilities []Capability `json:"capabilities"`
}

// Module is a reusable business building block.
// Implementations must work with Vito disabled (no RegisterVitoTools call).
type Module interface {
	// ID stable snake/id, e.g. "onstock".
	ID() string
	// Name human label, e.g. "OnStock".
	Name() string
	// Version semver-ish string for the module adapter.
	Version() string
	// Description short Spanish blurb.
	Description() string
	// Capabilities lists queries/actions the module exposes.
	Capabilities() []Capability
	// RegisterVitoTools attaches tools to Vito. No-op is allowed if module has no AI surface yet.
	// Must not panic if reg is non-nil; host may skip this when Vito is off.
	RegisterVitoTools(reg *vito.Registry) error
}

// Catalog holds registered modules for a running suite instance.
type Catalog struct {
	mu   sync.RWMutex
	byID map[string]Module
}

// NewCatalog returns an empty module catalog.
func NewCatalog() *Catalog {
	return &Catalog{byID: make(map[string]Module)}
}

// Register adds a module. Duplicate IDs return an error.
func (c *Catalog) Register(m Module) error {
	if m == nil {
		return fmt.Errorf("modkit: module is nil")
	}
	id := m.ID()
	if id == "" {
		return fmt.Errorf("modkit: module id is required")
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if _, ok := c.byID[id]; ok {
		return fmt.Errorf("modkit: module %q already registered", id)
	}
	c.byID[id] = m
	return nil
}

// Get returns a module by id.
func (c *Catalog) Get(id string) (Module, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	m, ok := c.byID[id]
	return m, ok
}

// List returns modules sorted by id.
func (c *Catalog) List() []Module {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := make([]Module, 0, len(c.byID))
	for _, m := range c.byID {
		out = append(out, m)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID() < out[j].ID() })
	return out
}

// Infos returns public metadata for all modules.
func (c *Catalog) Infos() []Info {
	mods := c.List()
	out := make([]Info, 0, len(mods))
	for _, m := range mods {
		caps := append([]Capability(nil), m.Capabilities()...)
		out = append(out, Info{
			ID:           m.ID(),
			Name:         m.Name(),
			Version:      m.Version(),
			Description:  m.Description(),
			Capabilities: caps,
		})
	}
	return out
}

// RegisterAllVitoTools registers every module's tools on reg.
// Safe to call with empty catalog. Stops on first error.
func (c *Catalog) RegisterAllVitoTools(reg *vito.Registry) error {
	if reg == nil {
		return fmt.Errorf("modkit: vito registry is nil")
	}
	for _, m := range c.List() {
		if err := m.RegisterVitoTools(reg); err != nil {
			return fmt.Errorf("modkit: module %q vito tools: %w", m.ID(), err)
		}
	}
	return nil
}
