package store

import (
	"database/sql"
	"errors"
)

// SeedPricing inserta/actualiza las reglas de precio (semilla desde config.json).
// Idempotente: se llama en cada arranque con la config vigente.
func (s *Store) SeedPricing(rules []PriceRule) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, r := range rules {
		if r.Margin == 0 {
			r.Margin = 1.0
		}
		if _, err := tx.Exec(`INSERT INTO pricing(provider, model, input_per_mtok, output_per_mtok, margin)
			VALUES(?,?,?,?,?)
			ON CONFLICT(provider, model) DO UPDATE SET
			  input_per_mtok=excluded.input_per_mtok,
			  output_per_mtok=excluded.output_per_mtok,
			  margin=excluded.margin`,
			r.Provider, r.Model, r.InputPerMTok, r.OutputPerMTok, r.Margin); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// GetPrice devuelve la regla de precio de un modelo, o ok=false si no existe.
func (s *Store) GetPrice(provider, model string) (PriceRule, bool, error) {
	var r PriceRule
	err := s.db.QueryRow(`SELECT provider, model, input_per_mtok, output_per_mtok, margin
		FROM pricing WHERE provider=? AND model=?`, provider, model).
		Scan(&r.Provider, &r.Model, &r.InputPerMTok, &r.OutputPerMTok, &r.Margin)
	if errors.Is(err, sql.ErrNoRows) {
		return PriceRule{}, false, nil
	}
	if err != nil {
		return PriceRule{}, false, err
	}
	return r, true, nil
}

// ListPrices devuelve todas las reglas de precio cargadas.
func (s *Store) ListPrices() ([]PriceRule, error) {
	rows, err := s.db.Query(`SELECT provider, model, input_per_mtok, output_per_mtok, margin
		FROM pricing ORDER BY provider, model`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PriceRule{}
	for rows.Next() {
		var r PriceRule
		if err := rows.Scan(&r.Provider, &r.Model, &r.InputPerMTok, &r.OutputPerMTok, &r.Margin); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}
