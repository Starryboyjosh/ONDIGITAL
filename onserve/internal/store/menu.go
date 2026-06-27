package store

import (
	"database/sql"
	"errors"
	"strings"
)

// ── Categorías del menú ─────────────────────────────────

func (s *Store) ListMenuCategories() ([]MenuCategory, error) {
	rows, err := s.db.Query(`SELECT id, name, sort, station, color, created_at FROM menu_categories ORDER BY sort, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []MenuCategory{}
	for rows.Next() {
		var c MenuCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.Sort, &c.Station, &c.Color, &c.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) getMenuCategory(id int64) (MenuCategory, error) {
	var c MenuCategory
	err := s.db.QueryRow(`SELECT id, name, sort, station, color, created_at FROM menu_categories WHERE id=?`, id).
		Scan(&c.ID, &c.Name, &c.Sort, &c.Station, &c.Color, &c.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return c, ErrNotFound
	}
	return c, err
}

func (s *Store) CreateMenuCategory(c MenuCategory) (MenuCategory, error) {
	if strings.TrimSpace(c.Name) == "" {
		return MenuCategory{}, errors.New("el nombre de la categoría es obligatorio")
	}
	if c.Station == "" {
		c.Station = "cocina"
	}
	res, err := s.db.Exec(`INSERT INTO menu_categories(name, sort, station, color) VALUES (?,?,?,?)`,
		strings.TrimSpace(c.Name), c.Sort, c.Station, c.Color)
	if err != nil {
		return MenuCategory{}, err
	}
	id, _ := res.LastInsertId()
	return s.getMenuCategory(id)
}

func (s *Store) UpdateMenuCategory(id int64, c MenuCategory) (MenuCategory, error) {
	if strings.TrimSpace(c.Name) == "" {
		return MenuCategory{}, errors.New("el nombre de la categoría es obligatorio")
	}
	if c.Station == "" {
		c.Station = "cocina"
	}
	res, err := s.db.Exec(`UPDATE menu_categories SET name=?, sort=?, station=?, color=? WHERE id=?`,
		strings.TrimSpace(c.Name), c.Sort, c.Station, c.Color, id)
	if err != nil {
		return MenuCategory{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return MenuCategory{}, ErrNotFound
	}
	return s.getMenuCategory(id)
}

func (s *Store) DeleteMenuCategory(id int64) error {
	res, err := s.db.Exec(`DELETE FROM menu_categories WHERE id=?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// ── Platillos ───────────────────────────────────────────

const itemSelect = `SELECT i.id, i.code, i.name, i.description, i.category_id, COALESCE(c.name,''),
  i.price, i.isv_rate, i.cost, i.station, i.available, i.active, i.sort, i.created_at, i.updated_at
  FROM menu_items i LEFT JOIN menu_categories c ON c.id = i.category_id`

func scanMenuItem(row interface{ Scan(...any) error }) (MenuItem, error) {
	var m MenuItem
	var available, active int
	err := row.Scan(&m.ID, &m.Code, &m.Name, &m.Description, &m.CategoryID, &m.CategoryName,
		&m.Price, &m.ISVRate, &m.Cost, &m.Station, &available, &active, &m.Sort, &m.CreatedAt, &m.UpdatedAt)
	m.Available = available == 1
	m.Active = active == 1
	return m, err
}

type MenuItemFilter struct {
	Query      string
	CategoryID int64
	OnlyActive bool
}

func (s *Store) ListMenuItems(f MenuItemFilter) ([]MenuItem, error) {
	where := []string{"1=1"}
	args := []any{}
	if f.OnlyActive {
		where = append(where, "i.active = 1")
	}
	if f.CategoryID > 0 {
		where = append(where, "i.category_id = ?")
		args = append(args, f.CategoryID)
	}
	if f.Query != "" {
		q := "%" + f.Query + "%"
		where = append(where, "(i.name LIKE ? OR i.code LIKE ?)")
		args = append(args, q, q)
	}
	rows, err := s.db.Query(itemSelect+` WHERE `+strings.Join(where, " AND ")+` ORDER BY c.sort, i.sort, i.name`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []MenuItem{}
	for rows.Next() {
		m, err := scanMenuItem(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *Store) GetMenuItem(id int64) (MenuItem, error) {
	m, err := scanMenuItem(s.db.QueryRow(itemSelect+` WHERE i.id=?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return m, ErrNotFound
	}
	return m, err
}

func (s *Store) CreateMenuItem(m MenuItem) (MenuItem, error) {
	if strings.TrimSpace(m.Name) == "" {
		return MenuItem{}, errors.New("el nombre del platillo es obligatorio")
	}
	if m.Price < 0 || m.Cost < 0 {
		return MenuItem{}, errors.New("el precio y el costo no pueden ser negativos")
	}
	if m.ISVRate == 0 {
		m.ISVRate = s.settingFloat("isv_rate_default", 15)
	}
	res, err := s.db.Exec(`INSERT INTO menu_items(code, name, description, category_id, price, isv_rate, cost, station, sort)
		VALUES (?,?,?,?,?,?,?,?,?)`,
		strings.TrimSpace(m.Code), strings.TrimSpace(m.Name), m.Description, m.CategoryID,
		round2(m.Price), m.ISVRate, round2(m.Cost), m.Station, m.Sort)
	if err != nil {
		return MenuItem{}, err
	}
	id, _ := res.LastInsertId()
	return s.GetMenuItem(id)
}

func (s *Store) UpdateMenuItem(id int64, m MenuItem) (MenuItem, error) {
	if strings.TrimSpace(m.Name) == "" {
		return MenuItem{}, errors.New("el nombre del platillo es obligatorio")
	}
	if m.Price < 0 || m.Cost < 0 {
		return MenuItem{}, errors.New("el precio y el costo no pueden ser negativos")
	}
	available, active := 0, 0
	if m.Available {
		available = 1
	}
	if m.Active {
		active = 1
	}
	res, err := s.db.Exec(`UPDATE menu_items SET code=?, name=?, description=?, category_id=?, price=?,
		isv_rate=?, cost=?, station=?, available=?, active=?, sort=?, updated_at=datetime('now','localtime') WHERE id=?`,
		strings.TrimSpace(m.Code), strings.TrimSpace(m.Name), m.Description, m.CategoryID,
		round2(m.Price), m.ISVRate, round2(m.Cost), m.Station, available, active, m.Sort, id)
	if err != nil {
		return MenuItem{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return MenuItem{}, ErrNotFound
	}
	return s.GetMenuItem(id)
}

// SetItemAvailable activa/desactiva un platillo (botón "se acabó" / 86).
func (s *Store) SetItemAvailable(id int64, available bool) (MenuItem, error) {
	v := 0
	if available {
		v = 1
	}
	res, err := s.db.Exec(`UPDATE menu_items SET available=?, updated_at=datetime('now','localtime') WHERE id=?`, v, id)
	if err != nil {
		return MenuItem{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return MenuItem{}, ErrNotFound
	}
	return s.GetMenuItem(id)
}

func (s *Store) DeleteMenuItem(id int64) error {
	// Las líneas de comanda guardan snapshot (name/precio), así que el historial no se pierde.
	res, err := s.db.Exec(`DELETE FROM menu_items WHERE id=?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// Menu agrupa los platillos disponibles por categoría (pantalla de comanda).
func (s *Store) Menu() ([]MenuView, error) {
	cats, err := s.ListMenuCategories()
	if err != nil {
		return nil, err
	}
	items, err := s.ListMenuItems(MenuItemFilter{OnlyActive: true})
	if err != nil {
		return nil, err
	}
	byCat := map[int64][]MenuItem{}
	for _, it := range items {
		if it.CategoryID != nil {
			byCat[*it.CategoryID] = append(byCat[*it.CategoryID], it)
		}
	}
	out := []MenuView{}
	for _, c := range cats {
		list := byCat[c.ID]
		if list == nil {
			list = []MenuItem{}
		}
		out = append(out, MenuView{Category: c, Items: list})
	}
	return out, nil
}
