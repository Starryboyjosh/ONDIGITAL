// Traducción de internal/store/expenses.go.
import { ErrNotFound, BizError, round2 } from '../db.js';

export const ExpenseCategories = ['ventas', 'administrativos', 'financieros', 'otros'];

function validExpenseCategory(c) {
  return ExpenseCategories.includes(c);
}

function scanExpense(e) {
  return {
    id: e.id,
    expense_date: e.expense_date,
    category: e.category,
    description: e.description,
    amount: e.amount,
    supplier_id: e.supplier_id,
    supplier_name: e.supplier_name,
    notes: e.notes,
    created_at: e.created_at,
  };
}

export function listExpenses(db, f = {}) {
  const where = ['1=1'];
  const args = [];
  if (f.query) {
    const q = `%${f.query}%`;
    where.push('(e.description LIKE ? OR e.notes LIKE ?)');
    args.push(q, q);
  }
  if (f.category) {
    where.push('e.category=?');
    args.push(f.category);
  }
  if (f.from) {
    where.push('e.expense_date >= ?');
    args.push(f.from);
  }
  if (f.to) {
    where.push('e.expense_date <= ?');
    args.push(f.to);
  }
  let limit = f.limit;
  if (!limit || limit <= 0) limit = 500;
  args.push(limit);
  const rows = db.all(
    `SELECT e.id, e.expense_date, e.category, e.description, e.amount,
	  e.supplier_id, COALESCE(s.name,'') AS supplier_name, e.notes, e.created_at
	  FROM expenses e LEFT JOIN suppliers s ON s.id=e.supplier_id
	  WHERE ${where.join(' AND ')} ORDER BY e.expense_date DESC, e.id DESC LIMIT ?`,
    ...args,
  );
  return rows.map(scanExpense);
}

export function getExpense(db, id) {
  const row = db.get(
    `SELECT e.id, e.expense_date, e.category, e.description, e.amount,
	  e.supplier_id, COALESCE(s.name,'') AS supplier_name, e.notes, e.created_at
	  FROM expenses e LEFT JOIN suppliers s ON s.id=e.supplier_id WHERE e.id=?`,
    id,
  );
  if (!row) throw new ErrNotFound();
  return scanExpense(row);
}

export function createExpense(db, e) {
  if (!String(e.description ?? '').trim()) throw new BizError('la descripción es obligatoria');
  if (!((e.amount ?? 0) > 0)) throw new BizError('el monto debe ser mayor que cero');
  let category = e.category ?? '';
  if (!validExpenseCategory(category)) category = 'otros';
  const date = e.expense_date ?? '';
  let res;
  if (date !== '') {
    res = db.run(
      `INSERT INTO expenses (expense_date, category, description, amount, supplier_id, notes)
		  VALUES (?,?,?,?,?,?)`,
      date, category, String(e.description).trim(), round2(e.amount), e.supplier_id ?? null, e.notes ?? '',
    );
  } else {
    res = db.run(
      `INSERT INTO expenses (category, description, amount, supplier_id, notes)
		  VALUES (?,?,?,?,?)`,
      category, String(e.description).trim(), round2(e.amount), e.supplier_id ?? null, e.notes ?? '',
    );
  }
  return getExpense(db, res.lastInsertRowid);
}

export function updateExpense(db, id, e) {
  if (!String(e.description ?? '').trim()) throw new BizError('la descripción es obligatoria');
  if (!((e.amount ?? 0) > 0)) throw new BizError('el monto debe ser mayor que cero');
  let category = e.category ?? '';
  if (!validExpenseCategory(category)) category = 'otros';
  const res = db.run(
    `UPDATE expenses SET expense_date=?, category=?, description=?, amount=?, supplier_id=?, notes=?
	  WHERE id=?`,
    e.expense_date ?? '', category, String(e.description).trim(), round2(e.amount),
    e.supplier_id ?? null, e.notes ?? '', id,
  );
  if (res.changes === 0) throw new ErrNotFound();
  return getExpense(db, id);
}

export function deleteExpense(db, id) {
  db.run('DELETE FROM expenses WHERE id=?', id);
}
