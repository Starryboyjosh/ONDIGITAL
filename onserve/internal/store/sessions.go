package store

import (
	"database/sql"
	"errors"
	"fmt"
)

func scanSession(row interface{ Scan(...any) error }) (Session, error) {
	var v Session
	err := row.Scan(&v.ID, &v.SessionNumber, &v.OpenedBy, &v.OpeningCash, &v.OpenedAt,
		&v.ClosingCash, &v.ExpectedCash, &v.Difference, &v.ClosedAt, &v.Status, &v.Notes, &v.CreatedAt)
	return v, err
}

const sessionCols = `id, session_number, opened_by, opening_cash, opened_at, closing_cash,
  expected_cash, difference, closed_at, status, notes, created_at`

// CurrentSession devuelve la sesión de caja abierta, o ErrNotFound si no hay.
func (s *Store) CurrentSession() (Session, error) {
	v, err := scanSession(s.db.QueryRow(`SELECT ` + sessionCols + ` FROM register_sessions WHERE status='abierta' ORDER BY id DESC LIMIT 1`))
	if errors.Is(err, sql.ErrNoRows) {
		return v, ErrNotFound
	}
	if err != nil {
		return v, err
	}
	s.fillSessionTotals(&v)
	return v, nil
}

func (s *Store) GetSession(id int64) (Session, error) {
	v, err := scanSession(s.db.QueryRow(`SELECT `+sessionCols+` FROM register_sessions WHERE id=?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return v, ErrNotFound
	}
	if err != nil {
		return v, err
	}
	s.fillSessionTotals(&v)
	return v, nil
}

func (s *Store) ListSessions(limit int) ([]Session, error) {
	if limit <= 0 {
		limit = 60
	}
	rows, err := s.db.Query(`SELECT `+sessionCols+` FROM register_sessions ORDER BY id DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Session{}
	for rows.Next() {
		v, err := scanSession(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

// OpenSession abre una nueva caja. Falla si ya hay una abierta.
func (s *Store) OpenSession(in OpenSessionInput) (Session, error) {
	if _, err := s.CurrentSession(); err == nil {
		return Session{}, errors.New("ya hay una sesión de caja abierta")
	} else if !errors.Is(err, ErrNotFound) {
		return Session{}, err
	}
	if in.OpeningCash < 0 {
		return Session{}, errors.New("el fondo de caja no puede ser negativo")
	}
	var nextID int64
	if err := s.db.QueryRow(`SELECT COALESCE(MAX(id),0)+1 FROM register_sessions`).Scan(&nextID); err != nil {
		return Session{}, err
	}
	number := fmt.Sprintf("CAJA-%05d", nextID)
	res, err := s.db.Exec(`INSERT INTO register_sessions(session_number, opened_by, opening_cash) VALUES (?,?,?)`,
		number, in.OpenedBy, round2(in.OpeningCash))
	if err != nil {
		return Session{}, err
	}
	id, _ := res.LastInsertId()
	return s.GetSession(id)
}

// CloseSession cierra la caja: calcula el efectivo esperado y la diferencia (arqueo).
func (s *Store) CloseSession(in CloseSessionInput) (Session, error) {
	cur, err := s.CurrentSession()
	if err != nil {
		return Session{}, err
	}
	var open int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM orders WHERE status IN ('abierta','por_cobrar')`).Scan(&open); err != nil {
		return Session{}, err
	}
	if open > 0 {
		return Session{}, errors.New("no se puede cerrar caja con comandas abiertas o por cobrar")
	}
	expected := round2(cur.OpeningCash + cur.CashSales)
	difference := round2(in.ClosingCash - expected)
	_, err = s.db.Exec(`UPDATE register_sessions SET closing_cash=?, expected_cash=?, difference=?,
		closed_at=datetime('now','localtime'), status='cerrada', notes=? WHERE id=?`,
		round2(in.ClosingCash), expected, difference, in.Notes, cur.ID)
	if err != nil {
		return Session{}, err
	}
	return s.GetSession(cur.ID)
}

// requireOpenSession devuelve el id de la caja abierta o un error claro.
func (s *Store) requireOpenSession() (int64, error) {
	cur, err := s.CurrentSession()
	if errors.Is(err, ErrNotFound) {
		return 0, errors.New("no hay una sesión de caja abierta; abre la caja antes de cobrar")
	}
	if err != nil {
		return 0, err
	}
	return cur.ID, nil
}

// fillSessionTotals agrega los totales del turno (ventas pagadas, por método, propinas).
func (s *Store) fillSessionTotals(v *Session) {
	_ = s.db.QueryRow(`SELECT COUNT(*), COALESCE(SUM(total),0) FROM orders WHERE session_id=? AND status='pagada'`, v.ID).
		Scan(&v.Orders, &v.SalesTotal)
	rows, err := s.db.Query(`SELECT p.method, COALESCE(SUM(p.amount),0), COALESCE(SUM(p.tip),0)
		FROM order_payments p JOIN orders o ON o.id = p.order_id
		WHERE o.session_id=? AND o.status='pagada' GROUP BY p.method`, v.ID)
	if err != nil {
		return
	}
	defer rows.Close()
	for rows.Next() {
		var method string
		var amount, tip float64
		if err := rows.Scan(&method, &amount, &tip); err != nil {
			return
		}
		v.TipsTotal += tip
		switch method {
		case "efectivo":
			v.CashSales += amount
		case "tarjeta":
			v.CardSales += amount
		default:
			v.OtherSales += amount
		}
	}
	v.SalesTotal = round2(v.SalesTotal)
	v.CashSales = round2(v.CashSales)
	v.CardSales = round2(v.CardSales)
	v.OtherSales = round2(v.OtherSales)
	v.TipsTotal = round2(v.TipsTotal)
}
