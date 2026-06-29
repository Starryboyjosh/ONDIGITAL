package store

import (
	"database/sql"
	"encoding/json"
	"errors"
)

// CreateJob inserta un job en estado 'queued' con su spec ya normalizada.
func (s *Store) CreateJob(provider, model, templateID string, spec any) (Job, error) {
	specJSON, err := json.Marshal(spec)
	if err != nil {
		return Job{}, err
	}
	id := newID("j_")
	_, err = s.db.Exec(`INSERT INTO jobs(id, status, provider, model, template_id, spec_json)
		VALUES(?, 'queued', ?, ?, ?, ?)`, id, provider, model, templateID, string(specJSON))
	if err != nil {
		return Job{}, err
	}
	return s.GetJob(id)
}

func (s *Store) GetJob(id string) (Job, error) {
	var j Job
	err := s.db.QueryRow(`SELECT id, created_at, status, provider, model, template_id,
		spec_json, opencode_session, error_msg FROM jobs WHERE id=?`, id).
		Scan(&j.ID, &j.CreatedAt, &j.Status, &j.Provider, &j.Model, &j.TemplateID,
			&j.SpecJSON, &j.OpencodeSession, &j.ErrorMsg)
	if errors.Is(err, sql.ErrNoRows) {
		return Job{}, ErrNotFound
	}
	if err != nil {
		return Job{}, err
	}
	return j, nil
}

func (s *Store) ListJobs() ([]Job, error) {
	rows, err := s.db.Query(`SELECT id, created_at, status, provider, model, template_id,
		spec_json, opencode_session, error_msg FROM jobs ORDER BY created_at DESC, id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Job{}
	for rows.Next() {
		var j Job
		if err := rows.Scan(&j.ID, &j.CreatedAt, &j.Status, &j.Provider, &j.Model,
			&j.TemplateID, &j.SpecJSON, &j.OpencodeSession, &j.ErrorMsg); err != nil {
			return nil, err
		}
		out = append(out, j)
	}
	return out, rows.Err()
}

// SetJobStatus actualiza el estado del job (queued|running|done|error|canceled).
func (s *Store) SetJobStatus(id, status string) error {
	res, err := s.db.Exec(`UPDATE jobs SET status=? WHERE id=?`, status, id)
	if err != nil {
		return err
	}
	return mustAffect(res)
}

// SetJobSession guarda el id de sesión de OpenCode asociado al job (Phase 2).
func (s *Store) SetJobSession(id, session string) error {
	res, err := s.db.Exec(`UPDATE jobs SET opencode_session=? WHERE id=?`, session, id)
	if err != nil {
		return err
	}
	return mustAffect(res)
}

// SetJobError marca el job como 'error' con su mensaje.
func (s *Store) SetJobError(id, msg string) error {
	res, err := s.db.Exec(`UPDATE jobs SET status='error', error_msg=? WHERE id=?`, msg, id)
	if err != nil {
		return err
	}
	return mustAffect(res)
}

func mustAffect(res sql.Result) error {
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
