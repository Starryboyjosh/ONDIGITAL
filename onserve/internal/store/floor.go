package store

import (
	"database/sql"
	"errors"
	"strings"
)

// ── Zonas ───────────────────────────────────────────────

func (s *Store) ListZones() ([]Zone, error) {
	rows, err := s.db.Query(`SELECT id, name, sort, color, created_at FROM zones ORDER BY sort, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Zone{}
	for rows.Next() {
		var z Zone
		if err := rows.Scan(&z.ID, &z.Name, &z.Sort, &z.Color, &z.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, z)
	}
	return out, rows.Err()
}

func (s *Store) CreateZone(z Zone) (Zone, error) {
	if strings.TrimSpace(z.Name) == "" {
		return Zone{}, errors.New("el nombre de la zona es obligatorio")
	}
	res, err := s.db.Exec(`INSERT INTO zones(name, sort, color) VALUES (?,?,?)`,
		strings.TrimSpace(z.Name), z.Sort, z.Color)
	if err != nil {
		return Zone{}, err
	}
	id, _ := res.LastInsertId()
	return s.getZone(id)
}

func (s *Store) UpdateZone(id int64, z Zone) (Zone, error) {
	if strings.TrimSpace(z.Name) == "" {
		return Zone{}, errors.New("el nombre de la zona es obligatorio")
	}
	res, err := s.db.Exec(`UPDATE zones SET name=?, sort=?, color=? WHERE id=?`,
		strings.TrimSpace(z.Name), z.Sort, z.Color, id)
	if err != nil {
		return Zone{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Zone{}, ErrNotFound
	}
	return s.getZone(id)
}

func (s *Store) DeleteZone(id int64) error {
	var open int
	if err := s.db.QueryRow(`SELECT COUNT(*)
	  FROM orders o JOIN dining_tables t ON t.id = o.table_id
	  WHERE t.zone_id=? AND o.status IN ('abierta','por_cobrar')`, id).Scan(&open); err != nil {
		return err
	}
	if open > 0 {
		return errors.New("no se puede eliminar una zona con comandas abiertas")
	}
	// Las mesas de la zona se eliminan en cascada; las comandas históricas quedan (table_id NULL).
	res, err := s.db.Exec(`DELETE FROM zones WHERE id=?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) getZone(id int64) (Zone, error) {
	var z Zone
	err := s.db.QueryRow(`SELECT id, name, sort, color, created_at FROM zones WHERE id=?`, id).
		Scan(&z.ID, &z.Name, &z.Sort, &z.Color, &z.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return z, ErrNotFound
	}
	return z, err
}

// ── Mesas ───────────────────────────────────────────────

func scanTable(row interface{ Scan(...any) error }) (Table, error) {
	var t Table
	var reserved, active int
	err := row.Scan(&t.ID, &t.ZoneID, &t.ZoneName, &t.Name, &t.Seats, &t.PosX, &t.PosY,
		&t.Shape, &reserved, &t.ReservedNote, &active, &t.CreatedAt)
	t.Reserved = reserved == 1
	t.Active = active == 1
	return t, err
}

const tableSelect = `SELECT t.id, t.zone_id, COALESCE(z.name,''), t.name, t.seats, t.pos_x, t.pos_y,
  t.shape, t.reserved, t.reserved_note, t.active, t.created_at
  FROM dining_tables t LEFT JOIN zones z ON z.id = t.zone_id`

func (s *Store) ListTables() ([]Table, error) {
	rows, err := s.db.Query(tableSelect + ` ORDER BY z.sort, t.name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Table{}
	for rows.Next() {
		t, err := scanTable(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (s *Store) getTable(id int64) (Table, error) {
	t, err := scanTable(s.db.QueryRow(tableSelect+` WHERE t.id=?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return t, ErrNotFound
	}
	return t, err
}

func (s *Store) CreateTable(t Table) (Table, error) {
	if strings.TrimSpace(t.Name) == "" {
		return Table{}, errors.New("el nombre de la mesa es obligatorio")
	}
	if t.Seats <= 0 {
		t.Seats = 4
	}
	if t.Shape == "" {
		t.Shape = "square"
	}
	res, err := s.db.Exec(`INSERT INTO dining_tables(zone_id, name, seats, pos_x, pos_y, shape)
		VALUES (?,?,?,?,?,?)`, t.ZoneID, strings.TrimSpace(t.Name), t.Seats, t.PosX, t.PosY, t.Shape)
	if err != nil {
		return Table{}, err
	}
	id, _ := res.LastInsertId()
	return s.getTable(id)
}

func (s *Store) UpdateTable(id int64, t Table) (Table, error) {
	if strings.TrimSpace(t.Name) == "" {
		return Table{}, errors.New("el nombre de la mesa es obligatorio")
	}
	if t.Seats <= 0 {
		t.Seats = 4
	}
	if t.Shape == "" {
		t.Shape = "square"
	}
	if !t.Active {
		busy, err := s.tableHasOpenOrder(id)
		if err != nil {
			return Table{}, err
		}
		if busy {
			return Table{}, errors.New("no se puede desactivar una mesa con una comanda abierta")
		}
	}
	active := 1
	if !t.Active {
		active = 0
	}
	res, err := s.db.Exec(`UPDATE dining_tables SET zone_id=?, name=?, seats=?, shape=?, active=? WHERE id=?`,
		t.ZoneID, strings.TrimSpace(t.Name), t.Seats, t.Shape, active, id)
	if err != nil {
		return Table{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Table{}, ErrNotFound
	}
	return s.getTable(id)
}

// UpdateTablePosition guarda la ubicación de la mesa en el mapa (arrastrar y soltar).
func (s *Store) UpdateTablePosition(id int64, x, y float64) error {
	res, err := s.db.Exec(`UPDATE dining_tables SET pos_x=?, pos_y=? WHERE id=?`, x, y, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// SetTableReserved marca/quita la reserva de una mesa libre.
func (s *Store) SetTableReserved(id int64, reserved bool, note string) (Table, error) {
	if reserved {
		var active int
		err := s.db.QueryRow(`SELECT active FROM dining_tables WHERE id=?`, id).Scan(&active)
		if errors.Is(err, sql.ErrNoRows) {
			return Table{}, ErrNotFound
		}
		if err != nil {
			return Table{}, err
		}
		if active != 1 {
			return Table{}, errors.New("no se puede reservar una mesa inactiva")
		}
		busy, err := s.tableHasOpenOrder(id)
		if err != nil {
			return Table{}, err
		}
		if busy {
			return Table{}, errors.New("no se puede reservar una mesa con una comanda abierta")
		}
	}
	r := 0
	if reserved {
		r = 1
	}
	res, err := s.db.Exec(`UPDATE dining_tables SET reserved=?, reserved_note=? WHERE id=?`, r, note, id)
	if err != nil {
		return Table{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Table{}, ErrNotFound
	}
	return s.getTable(id)
}

func (s *Store) DeleteTable(id int64) error {
	open, err := s.tableHasOpenOrder(id)
	if err != nil {
		return err
	}
	if open {
		return errors.New("no se puede eliminar una mesa con una comanda abierta")
	}
	res, err := s.db.Exec(`DELETE FROM dining_tables WHERE id=?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) tableHasOpenOrder(id int64) (bool, error) {
	var open int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM orders WHERE table_id=? AND status IN ('abierta','por_cobrar')`, id).Scan(&open); err != nil {
		return false, err
	}
	return open > 0, nil
}

// ── Mapa del salón (estado en vivo) ─────────────────────

// Floor devuelve cada zona con sus mesas y el estado en vivo derivado de la
// comanda abierta de cada mesa (libre / ocupada / por_cobrar / reservada).
func (s *Store) Floor() ([]FloorView, error) {
	zones, err := s.ListZones()
	if err != nil {
		return nil, err
	}
	rows, err := s.db.Query(`
	  SELECT t.id, t.zone_id, COALESCE(z.name,''), t.name, t.seats, t.pos_x, t.pos_y,
	         t.shape, t.reserved, t.reserved_note, t.active, t.created_at,
	         o.id, o.status, o.total, o.tip, o.opened_at, o.guests
	  FROM dining_tables t
	  LEFT JOIN zones z ON z.id = t.zone_id
	  LEFT JOIN orders o ON o.table_id = t.id AND o.status IN ('abierta','por_cobrar')
	  WHERE t.active = 1
	  ORDER BY z.sort, t.name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byZone := map[int64][]Table{}
	var noZone []Table
	for rows.Next() {
		var t Table
		var reserved, active int
		var orderID sql.NullInt64
		var oStatus, oOpened sql.NullString
		var oTotal, oTip sql.NullFloat64
		var oGuests sql.NullInt64
		if err := rows.Scan(&t.ID, &t.ZoneID, &t.ZoneName, &t.Name, &t.Seats, &t.PosX, &t.PosY,
			&t.Shape, &reserved, &t.ReservedNote, &active, &t.CreatedAt,
			&orderID, &oStatus, &oTotal, &oTip, &oOpened, &oGuests); err != nil {
			return nil, err
		}
		t.Reserved = reserved == 1
		t.Active = active == 1
		t.Status = "libre"
		if t.Reserved {
			t.Status = "reservada"
		}
		if orderID.Valid {
			id := orderID.Int64
			t.OrderID = &id
			t.OrderTotal = round2(oTotal.Float64 + oTip.Float64)
			t.OpenedAt = oOpened.String
			t.Guests = int(oGuests.Int64)
			t.Status = "ocupada"
			if oStatus.String == "por_cobrar" {
				t.Status = "por_cobrar"
			}
		}
		if t.ZoneID == nil {
			noZone = append(noZone, t)
		} else {
			byZone[*t.ZoneID] = append(byZone[*t.ZoneID], t)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	out := []FloorView{}
	for _, z := range zones {
		out = append(out, FloorView{Zone: z, Tables: nonNilTables(byZone[z.ID])})
	}
	if len(noZone) > 0 {
		out = append(out, FloorView{Zone: Zone{Name: "Sin zona"}, Tables: noZone})
	}
	return out, nil
}

func nonNilTables(t []Table) []Table {
	if t == nil {
		return []Table{}
	}
	return t
}
