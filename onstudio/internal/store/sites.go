package store

import (
	"database/sql"
	"errors"
)

// CreateSite registra el sitio producido por un job (Phase 3 lo poblará de verdad).
func (s *Store) CreateSite(jobID, businessName, workspaceDir string) (Site, error) {
	id := newID("s_")
	_, err := s.db.Exec(`INSERT INTO sites(id, job_id, business_name, workspace_dir)
		VALUES(?,?,?,?)`, id, jobID, businessName, workspaceDir)
	if err != nil {
		return Site{}, err
	}
	return s.GetSiteByJob(jobID)
}

// GetSiteByJob devuelve el sitio de un job, o ErrNotFound si aún no existe.
func (s *Store) GetSiteByJob(jobID string) (Site, error) {
	var st Site
	err := s.db.QueryRow(`SELECT id, job_id, business_name, workspace_dir, preview_url, created_at
		FROM sites WHERE job_id=? ORDER BY created_at DESC LIMIT 1`, jobID).
		Scan(&st.ID, &st.JobID, &st.BusinessName, &st.WorkspaceDir, &st.PreviewURL, &st.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Site{}, ErrNotFound
	}
	if err != nil {
		return Site{}, err
	}
	return st, nil
}
