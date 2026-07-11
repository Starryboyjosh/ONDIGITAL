// Package billing is a lightweight subscription ledger for ONDIGITAL ops.
// Tracks which tenants are on which plan and monthly charges (not a payment gateway).
package billing

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"ondigital.hn/tenant"
)

// Status of a subscription.
type Status string

const (
	StatusTrial    Status = "trial"
	StatusActive   Status = "active"
	StatusPastDue  Status = "past_due"
	StatusCanceled Status = "canceled"
)

// Subscription is one client's plan relationship with ONDIGITAL.
type Subscription struct {
	ID         string      `json:"id"`
	TenantID   string      `json:"tenant_id"`
	TenantName string      `json:"tenant_name"`
	Plan       tenant.Plan `json:"plan"`
	Status     Status      `json:"status"`
	// AmountUSD is list price at signup (can be overridden for discounts).
	AmountUSD int       `json:"amount_usd"`
	Currency  string    `json:"currency"` // charge currency note, e.g. USD billed in HNL
	Modules   []string  `json:"modules"`
	StartDate string    `json:"start_date"` // YYYY-MM-DD
	NextBill  string    `json:"next_bill"`  // YYYY-MM-DD
	Notes     string    `json:"notes,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Ledger persists subscriptions as JSON (ops file, not client DB).
type Ledger struct {
	mu   sync.Mutex
	path string
	subs map[string]Subscription
}

// OpenLedger loads or creates a ledger file.
func OpenLedger(path string) (*Ledger, error) {
	l := &Ledger{path: path, subs: make(map[string]Subscription)}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}
	b, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return l, l.save()
		}
		return nil, err
	}
	if len(b) == 0 {
		return l, nil
	}
	var list []Subscription
	if err := json.Unmarshal(b, &list); err != nil {
		return nil, err
	}
	for _, s := range list {
		l.subs[s.ID] = s
	}
	return l, nil
}

// save writes the ledger. Caller must hold l.mu (or be single-threaded during Open).
func (l *Ledger) save() error {
	list := make([]Subscription, 0, len(l.subs))
	for _, s := range l.subs {
		list = append(list, s)
	}
	sort.Slice(list, func(i, j int) bool {
		return strings.ToLower(list[i].TenantName) < strings.ToLower(list[j].TenantName)
	})
	b, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return err
	}
	tmp := l.path + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, l.path)
}

// Create starts a subscription from a tenant + plan.
func (l *Ledger) Create(t tenant.Tenant, status Status, notes string) (Subscription, error) {
	if err := tenant.ValidateTenant(t); err != nil {
		return Subscription{}, err
	}
	plan, err := tenant.ParsePlan(string(t.Plan))
	if err != nil {
		return Subscription{}, err
	}
	if status == "" {
		status = StatusActive
	}
	now := time.Now()
	start := now.Format("2006-01-02")
	next := now.AddDate(0, 1, 0).Format("2006-01-02")
	id := fmt.Sprintf("sub_%s_%d", t.ID, now.Unix())
	s := Subscription{
		ID:         id,
		TenantID:   t.ID,
		TenantName: t.Name,
		Plan:       plan,
		Status:     status,
		AmountUSD:  plan.PriceUSDMonthly(),
		Currency:   "USD",
		Modules:    append([]string(nil), t.Modules...),
		StartDate:  start,
		NextBill:   next,
		Notes:      notes,
		CreatedAt:  now.UTC(),
		UpdatedAt:  now.UTC(),
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	l.subs[id] = s
	if err := l.save(); err != nil {
		return Subscription{}, err
	}
	return s, nil
}

// List returns all subscriptions sorted by tenant name.
func (l *Ledger) List() []Subscription {
	l.mu.Lock()
	defer l.mu.Unlock()
	out := make([]Subscription, 0, len(l.subs))
	for _, s := range l.subs {
		out = append(out, s)
	}
	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i].TenantName) < strings.ToLower(out[j].TenantName)
	})
	return out
}

// Get by id.
func (l *Ledger) Get(id string) (Subscription, bool) {
	l.mu.Lock()
	defer l.mu.Unlock()
	s, ok := l.subs[id]
	return s, ok
}

// SetStatus updates subscription status.
func (l *Ledger) SetStatus(id string, st Status) (Subscription, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	s, ok := l.subs[id]
	if !ok {
		return Subscription{}, fmt.Errorf("billing: suscripción no encontrada")
	}
	s.Status = st
	s.UpdatedAt = time.Now().UTC()
	l.subs[id] = s
	return s, l.save()
}

// MonthlyRecurringUSD sums active+trial amounts.
func (l *Ledger) MonthlyRecurringUSD() int {
	total := 0
	for _, s := range l.List() {
		if s.Status == StatusActive || s.Status == StatusTrial {
			total += s.AmountUSD
		}
	}
	return total
}
