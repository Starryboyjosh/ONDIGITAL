package store

import (
	"database/sql"
	"errors"
	"strings"
)

func (s *Store) ListSuppliers(includeInactive bool) ([]Supplier, error) {
	q := `SELECT id, name, rtn, contact_name, phone, email, address, notes, active, created_at FROM suppliers`
	if !includeInactive {
		q += ` WHERE active=1`
	}
	q += ` ORDER BY name`
	rows, err := s.db.Query(q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Supplier{}
	for rows.Next() {
		var sp Supplier
		var active int
		if err := rows.Scan(&sp.ID, &sp.Name, &sp.RTN, &sp.ContactName, &sp.Phone, &sp.Email,
			&sp.Address, &sp.Notes, &active, &sp.CreatedAt); err != nil {
			return nil, err
		}
		sp.Active = active == 1
		out = append(out, sp)
	}
	return out, rows.Err()
}

func (s *Store) GetSupplier(id int64) (Supplier, error) {
	var sp Supplier
	var active int
	err := s.db.QueryRow(`SELECT id, name, rtn, contact_name, phone, email, address, notes, active, created_at
	  FROM suppliers WHERE id=?`, id).
		Scan(&sp.ID, &sp.Name, &sp.RTN, &sp.ContactName, &sp.Phone, &sp.Email, &sp.Address, &sp.Notes, &active, &sp.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return sp, ErrNotFound
	}
	sp.Active = active == 1
	return sp, err
}

func (s *Store) CreateSupplier(sp Supplier) (Supplier, error) {
	if strings.TrimSpace(sp.Name) == "" {
		return sp, errors.New("el nombre es obligatorio")
	}
	res, err := s.db.Exec(`INSERT INTO suppliers (name, rtn, contact_name, phone, email, address, notes, active)
	  VALUES (?,?,?,?,?,?,?,1)`,
		strings.TrimSpace(sp.Name), sp.RTN, sp.ContactName, sp.Phone, sp.Email, sp.Address, sp.Notes)
	if err != nil {
		return sp, err
	}
	id, _ := res.LastInsertId()
	return s.GetSupplier(id)
}

func (s *Store) UpdateSupplier(id int64, sp Supplier) (Supplier, error) {
	if strings.TrimSpace(sp.Name) == "" {
		return sp, errors.New("el nombre es obligatorio")
	}
	res, err := s.db.Exec(`UPDATE suppliers SET name=?, rtn=?, contact_name=?, phone=?, email=?, address=?, notes=?, active=?
	  WHERE id=?`,
		strings.TrimSpace(sp.Name), sp.RTN, sp.ContactName, sp.Phone, sp.Email, sp.Address, sp.Notes, boolToInt(sp.Active), id)
	if err != nil {
		return sp, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return sp, ErrNotFound
	}
	return s.GetSupplier(id)
}

// DeleteSupplier desactiva si tiene historial (productos, órdenes o gastos); elimina si no.
func (s *Store) DeleteSupplier(id int64) error {
	var refs int
	err := s.db.QueryRow(`SELECT
	  (SELECT COUNT(*) FROM products WHERE supplier_id=?) +
	  (SELECT COUNT(*) FROM purchase_orders WHERE supplier_id=?) +
	  (SELECT COUNT(*) FROM expenses WHERE supplier_id=?)`, id, id, id).Scan(&refs)
	if err != nil {
		return err
	}
	if refs > 0 {
		_, err = s.db.Exec(`UPDATE suppliers SET active=0 WHERE id=?`, id)
		return err
	}
	_, err = s.db.Exec(`DELETE FROM suppliers WHERE id=?`, id)
	return err
}
