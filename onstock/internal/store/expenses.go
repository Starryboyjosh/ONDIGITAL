package store

import (
	"database/sql"
	"errors"
	"strings"
)

var ExpenseCategories = []string{"ventas", "administrativos", "financieros", "otros"}

func validExpenseCategory(c string) bool {
	for _, v := range ExpenseCategories {
		if v == c {
			return true
		}
	}
	return false
}

type ExpenseFilter struct {
	Query    string
	Category string
	From     string
	To       string
	Limit    int
}

func (s *Store) ListExpenses(f ExpenseFilter) ([]Expense, error) {
	where := []string{"1=1"}
	args := []any{}
	if f.Query != "" {
		q := "%" + f.Query + "%"
		where = append(where, "(e.description LIKE ? OR e.notes LIKE ?)")
		args = append(args, q, q)
	}
	if f.Category != "" {
		where = append(where, "e.category=?")
		args = append(args, f.Category)
	}
	if f.From != "" {
		where = append(where, "e.expense_date >= ?")
		args = append(args, f.From)
	}
	if f.To != "" {
		where = append(where, "e.expense_date <= ?")
		args = append(args, f.To)
	}
	limit := f.Limit
	if limit <= 0 {
		limit = 500
	}
	args = append(args, limit)
	rows, err := s.db.Query(`SELECT e.id, e.expense_date, e.category, e.description, e.amount,
	  e.supplier_id, COALESCE(s.name,''), e.notes, e.created_at
	  FROM expenses e LEFT JOIN suppliers s ON s.id=e.supplier_id
	  WHERE `+strings.Join(where, " AND ")+` ORDER BY e.expense_date DESC, e.id DESC LIMIT ?`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Expense{}
	for rows.Next() {
		var e Expense
		if err := rows.Scan(&e.ID, &e.ExpenseDate, &e.Category, &e.Description, &e.Amount,
			&e.SupplierID, &e.SupplierName, &e.Notes, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *Store) GetExpense(id int64) (Expense, error) {
	var e Expense
	err := s.db.QueryRow(`SELECT e.id, e.expense_date, e.category, e.description, e.amount,
	  e.supplier_id, COALESCE(s.name,''), e.notes, e.created_at
	  FROM expenses e LEFT JOIN suppliers s ON s.id=e.supplier_id WHERE e.id=?`, id).
		Scan(&e.ID, &e.ExpenseDate, &e.Category, &e.Description, &e.Amount, &e.SupplierID, &e.SupplierName, &e.Notes, &e.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return e, ErrNotFound
	}
	return e, err
}

func (s *Store) CreateExpense(e Expense) (Expense, error) {
	if strings.TrimSpace(e.Description) == "" {
		return e, errors.New("la descripción es obligatoria")
	}
	if e.Amount <= 0 {
		return e, errors.New("el monto debe ser mayor que cero")
	}
	if !validExpenseCategory(e.Category) {
		e.Category = "otros"
	}
	date := e.ExpenseDate
	var res sql.Result
	var err error
	if date != "" {
		res, err = s.db.Exec(`INSERT INTO expenses (expense_date, category, description, amount, supplier_id, notes)
		  VALUES (?,?,?,?,?,?)`, date, e.Category, strings.TrimSpace(e.Description), round2(e.Amount), e.SupplierID, e.Notes)
	} else {
		res, err = s.db.Exec(`INSERT INTO expenses (category, description, amount, supplier_id, notes)
		  VALUES (?,?,?,?,?)`, e.Category, strings.TrimSpace(e.Description), round2(e.Amount), e.SupplierID, e.Notes)
	}
	if err != nil {
		return e, err
	}
	id, _ := res.LastInsertId()
	return s.GetExpense(id)
}

func (s *Store) UpdateExpense(id int64, e Expense) (Expense, error) {
	if strings.TrimSpace(e.Description) == "" {
		return e, errors.New("la descripción es obligatoria")
	}
	if e.Amount <= 0 {
		return e, errors.New("el monto debe ser mayor que cero")
	}
	if !validExpenseCategory(e.Category) {
		e.Category = "otros"
	}
	res, err := s.db.Exec(`UPDATE expenses SET expense_date=?, category=?, description=?, amount=?, supplier_id=?, notes=?
	  WHERE id=?`, e.ExpenseDate, e.Category, strings.TrimSpace(e.Description), round2(e.Amount), e.SupplierID, e.Notes, id)
	if err != nil {
		return e, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return e, ErrNotFound
	}
	return s.GetExpense(id)
}

func (s *Store) DeleteExpense(id int64) error {
	_, err := s.db.Exec(`DELETE FROM expenses WHERE id=?`, id)
	return err
}
