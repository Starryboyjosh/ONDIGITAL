package store

// RecordUsage guarda una captura de uso de tokens y costo de un job. En Phase 1
// se usa desde tests; en Phase 2 lo alimentará el adaptador de OpenCode con los
// tokens reales del mensaje del asistente.
func (s *Store) RecordUsage(u Usage) (Usage, error) {
	if u.Currency == "" {
		u.Currency = "USD"
	}
	u.ID = newID("u_")
	_, err := s.db.Exec(`INSERT INTO usage(id, job_id, input_tokens, output_tokens,
		cache_read_tokens, cache_write_tokens, provider_cost, price, currency)
		VALUES(?,?,?,?,?,?,?,?,?)`,
		u.ID, u.JobID, u.InputTokens, u.OutputTokens, u.CacheReadTokens,
		u.CacheWriteTokens, u.ProviderCost, u.Price, u.Currency)
	if err != nil {
		return Usage{}, err
	}
	return s.GetUsageByJob(u.JobID)
}

// GetUsageByJob suma el uso de un job (puede haber varias capturas por job).
// Devuelve ErrNotFound si el job no tiene uso registrado todavía.
func (s *Store) GetUsageByJob(jobID string) (Usage, error) {
	var u Usage
	var n int
	err := s.db.QueryRow(`SELECT
		COUNT(*),
		COALESCE(SUM(input_tokens),0), COALESCE(SUM(output_tokens),0),
		COALESCE(SUM(cache_read_tokens),0), COALESCE(SUM(cache_write_tokens),0),
		COALESCE(SUM(provider_cost),0), COALESCE(SUM(price),0)
		FROM usage WHERE job_id=?`, jobID).
		Scan(&n, &u.InputTokens, &u.OutputTokens, &u.CacheReadTokens,
			&u.CacheWriteTokens, &u.ProviderCost, &u.Price)
	if err != nil {
		return Usage{}, err
	}
	if n == 0 {
		return Usage{}, ErrNotFound
	}
	u.JobID = jobID
	u.Currency = "USD"
	return u, nil
}
