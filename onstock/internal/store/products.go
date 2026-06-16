package store

import (
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

var ErrNotFound = errors.New("no encontrado")

const productCols = `
  p.id, p.sku, p.barcode, p.name, p.description, p.category_id,
  COALESCE(c.name,''), p.supplier_id, COALESCE(s.name,''),
  p.cost, p.price, p.isv_rate, p.stock, p.min_stock, p.active,
  p.created_at, p.updated_at`

const productJoins = `
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN suppliers s ON s.id = p.supplier_id`

func scanProduct(row interface{ Scan(...any) error }) (Product, error) {
	var p Product
	var active int
	err := row.Scan(&p.ID, &p.SKU, &p.Barcode, &p.Name, &p.Description, &p.CategoryID,
		&p.CategoryName, &p.SupplierID, &p.SupplierName,
		&p.Cost, &p.Price, &p.ISVRate, &p.Stock, &p.MinStock, &active,
		&p.CreatedAt, &p.UpdatedAt)
	p.Active = active == 1
	return p, err
}

type ProductFilter struct {
	Query      string
	CategoryID int64
	SupplierID int64
	LowStock   bool
	Inactive   bool // incluir inactivos
}

func (s *Store) ListProducts(f ProductFilter) ([]Product, error) {
	where := []string{"1=1"}
	args := []any{}
	if !f.Inactive {
		where = append(where, "p.active=1")
	}
	if f.Query != "" {
		q := "%" + f.Query + "%"
		where = append(where, "(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.description LIKE ?)")
		args = append(args, q, q, q, q)
	}
	if f.CategoryID > 0 {
		where = append(where, "p.category_id=?")
		args = append(args, f.CategoryID)
	}
	if f.SupplierID > 0 {
		where = append(where, "p.supplier_id=?")
		args = append(args, f.SupplierID)
	}
	if f.LowStock {
		where = append(where, "p.stock <= p.min_stock")
	}
	rows, err := s.db.Query(`SELECT `+productCols+productJoins+` WHERE `+strings.Join(where, " AND ")+` ORDER BY p.name`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Product{}
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) GetProduct(id int64) (Product, error) {
	p, err := scanProduct(s.db.QueryRow(`SELECT `+productCols+productJoins+` WHERE p.id=?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}

// FindProductByCode busca por código de barras o SKU exacto (para el escáner del POS).
func (s *Store) FindProductByCode(code string) (Product, error) {
	p, err := scanProduct(s.db.QueryRow(`SELECT `+productCols+productJoins+
		` WHERE p.active=1 AND (p.barcode=? OR p.sku=?) LIMIT 1`, code, code))
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrNotFound
	}
	return p, err
}

func (s *Store) CreateProduct(p Product) (Product, error) {
	if strings.TrimSpace(p.Name) == "" {
		return p, errors.New("el nombre es obligatorio")
	}
	if strings.TrimSpace(p.SKU) == "" {
		sku, err := s.NextSKU(p.CategoryID)
		if err != nil {
			return p, err
		}
		p.SKU = sku
	}
	res, err := s.db.Exec(`INSERT INTO products
	  (sku, barcode, name, description, category_id, supplier_id, cost, price, isv_rate, stock, min_stock, active)
	  VALUES (?,?,?,?,?,?,?,?,?,?,?,1)`,
		strings.TrimSpace(p.SKU), strings.TrimSpace(p.Barcode), strings.TrimSpace(p.Name), p.Description,
		p.CategoryID, p.SupplierID, p.Cost, p.Price, p.ISVRate, p.Stock, p.MinStock)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return p, fmt.Errorf("ya existe un producto con el SKU %q", p.SKU)
		}
		return p, err
	}
	id, _ := res.LastInsertId()
	if p.Stock != 0 {
		_, err = s.db.Exec(`INSERT INTO stock_movements (product_id, type, qty, unit_cost, reference, notes)
		  VALUES (?,?,?,?,?,?)`, id, "entrada", p.Stock, p.Cost, "Inventario inicial", "")
		if err != nil {
			return p, err
		}
	}
	return s.GetProduct(id)
}

func (s *Store) UpdateProduct(id int64, p Product) (Product, error) {
	if strings.TrimSpace(p.Name) == "" {
		return p, errors.New("el nombre es obligatorio")
	}
	// El stock NO se edita aquí: se ajusta con movimientos de inventario.
	res, err := s.db.Exec(`UPDATE products SET
	  sku=?, barcode=?, name=?, description=?, category_id=?, supplier_id=?,
	  cost=?, price=?, isv_rate=?, min_stock=?, active=?, updated_at=datetime('now','localtime')
	  WHERE id=?`,
		strings.TrimSpace(p.SKU), strings.TrimSpace(p.Barcode), strings.TrimSpace(p.Name), p.Description,
		p.CategoryID, p.SupplierID, p.Cost, p.Price, p.ISVRate, p.MinStock, boolToInt(p.Active), id)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return p, fmt.Errorf("ya existe un producto con el SKU %q", p.SKU)
		}
		return p, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return p, ErrNotFound
	}
	return s.GetProduct(id)
}

// DeleteProduct desactiva el producto si tiene historial; lo elimina si no lo tiene.
func (s *Store) DeleteProduct(id int64) error {
	var refs int
	err := s.db.QueryRow(`SELECT
	  (SELECT COUNT(*) FROM sale_items WHERE product_id=?) +
	  (SELECT COUNT(*) FROM purchase_order_items WHERE product_id=?)`, id, id).Scan(&refs)
	if err != nil {
		return err
	}
	if refs > 0 {
		_, err = s.db.Exec(`UPDATE products SET active=0, updated_at=datetime('now','localtime') WHERE id=?`, id)
		return err
	}
	_, err = s.db.Exec(`DELETE FROM stock_movements WHERE product_id=?`, id)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(`DELETE FROM products WHERE id=?`, id)
	return err
}

// NextSKU genera el siguiente SKU secuencial usando el prefijo de la categoría (p. ej. GEN-0007).
func (s *Store) NextSKU(categoryID *int64) (string, error) {
	prefix := "PRD"
	if categoryID != nil {
		var p string
		err := s.db.QueryRow(`SELECT prefix FROM categories WHERE id=?`, *categoryID).Scan(&p)
		if err == nil && strings.TrimSpace(p) != "" {
			prefix = strings.ToUpper(strings.TrimSpace(p))
		}
	}
	rows, err := s.db.Query(`SELECT sku FROM products WHERE sku LIKE ?`, prefix+"-%")
	if err != nil {
		return "", err
	}
	defer rows.Close()
	maxN := 0
	for rows.Next() {
		var sku string
		if err := rows.Scan(&sku); err != nil {
			return "", err
		}
		if n, err := strconv.Atoi(strings.TrimPrefix(sku, prefix+"-")); err == nil && n > maxN {
			maxN = n
		}
	}
	return fmt.Sprintf("%s-%04d", prefix, maxN+1), rows.Err()
}

// ── Categorías ──────────────────────────────────────────

func (s *Store) ListCategories() ([]Category, error) {
	rows, err := s.db.Query(`SELECT id, name, prefix FROM categories ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Category{}
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Prefix); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) CreateCategory(c Category) (Category, error) {
	if strings.TrimSpace(c.Name) == "" {
		return c, errors.New("el nombre es obligatorio")
	}
	if strings.TrimSpace(c.Prefix) == "" {
		c.Prefix = strings.ToUpper(firstN(strings.ReplaceAll(c.Name, " ", ""), 3))
	}
	res, err := s.db.Exec(`INSERT INTO categories(name,prefix) VALUES(?,?)`,
		strings.TrimSpace(c.Name), strings.ToUpper(strings.TrimSpace(c.Prefix)))
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return c, fmt.Errorf("ya existe la categoría %q", c.Name)
		}
		return c, err
	}
	c.ID, _ = res.LastInsertId()
	return c, nil
}

func (s *Store) UpdateCategory(id int64, c Category) error {
	_, err := s.db.Exec(`UPDATE categories SET name=?, prefix=? WHERE id=?`,
		strings.TrimSpace(c.Name), strings.ToUpper(strings.TrimSpace(c.Prefix)), id)
	return err
}

func (s *Store) DeleteCategory(id int64) error {
	_, err := s.db.Exec(`DELETE FROM categories WHERE id=?`, id)
	return err
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func firstN(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return string(r)
	}
	return string(r[:n])
}
