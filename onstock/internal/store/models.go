package store

type Category struct {
	ID     int64  `json:"id"`
	Name   string `json:"name"`
	Prefix string `json:"prefix"`
}

type Supplier struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	RTN         string `json:"rtn"`
	ContactName string `json:"contact_name"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	Address     string `json:"address"`
	Notes       string `json:"notes"`
	Active      bool   `json:"active"`
	CreatedAt   string `json:"created_at"`
}

type Product struct {
	ID           int64   `json:"id"`
	SKU          string  `json:"sku"`
	Barcode      string  `json:"barcode"`
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	CategoryID   *int64  `json:"category_id"`
	CategoryName string  `json:"category_name"`
	SupplierID   *int64  `json:"supplier_id"`
	SupplierName string  `json:"supplier_name"`
	Cost         float64 `json:"cost"`
	Price        float64 `json:"price"`
	ISVRate      float64 `json:"isv_rate"`
	Stock        float64 `json:"stock"`
	MinStock     float64 `json:"min_stock"`
	Active       bool    `json:"active"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

type StockMovement struct {
	ID          int64   `json:"id"`
	ProductID   int64   `json:"product_id"`
	ProductName string  `json:"product_name"`
	ProductSKU  string  `json:"product_sku"`
	Type        string  `json:"type"`
	Qty         float64 `json:"qty"`
	UnitCost    float64 `json:"unit_cost"`
	Reference   string  `json:"reference"`
	Notes       string  `json:"notes"`
	CreatedAt   string  `json:"created_at"`
}

type PurchaseOrder struct {
	ID           int64               `json:"id"`
	PONumber     string              `json:"po_number"`
	SupplierID   int64               `json:"supplier_id"`
	SupplierName string              `json:"supplier_name"`
	Status       string              `json:"status"`
	OrderDate    string              `json:"order_date"`
	ExpectedDate string              `json:"expected_date"`
	ReceivedDate string              `json:"received_date"`
	Notes        string              `json:"notes"`
	Total        float64             `json:"total"`
	Items        []PurchaseOrderItem `json:"items,omitempty"`
	CreatedAt    string              `json:"created_at"`
}

type PurchaseOrderItem struct {
	ID          int64   `json:"id"`
	ProductID   int64   `json:"product_id"`
	ProductName string  `json:"product_name"`
	ProductSKU  string  `json:"product_sku"`
	Qty         float64 `json:"qty"`
	UnitCost    float64 `json:"unit_cost"`
}

type Sale struct {
	ID            int64      `json:"id"`
	SaleNumber    string     `json:"sale_number"`
	CustomerName  string     `json:"customer_name"`
	CustomerRTN   string     `json:"customer_rtn"`
	SaleDate      string     `json:"sale_date"`
	Subtotal      float64    `json:"subtotal"`
	Discount      float64    `json:"discount"`
	DiscountNet   float64    `json:"discount_net"`
	ISV           float64    `json:"isv"`
	Total         float64    `json:"total"`
	CostTotal     float64    `json:"cost_total"`
	PaymentMethod string     `json:"payment_method"`
	Status        string     `json:"status"`
	Notes         string     `json:"notes"`
	Items         []SaleItem `json:"items,omitempty"`
	CreatedAt     string     `json:"created_at"`
}

type SaleItem struct {
	ID          int64   `json:"id"`
	ProductID   int64   `json:"product_id"`
	ProductName string  `json:"product_name"`
	ProductSKU  string  `json:"product_sku"`
	Qty         float64 `json:"qty"`
	UnitPrice   float64 `json:"unit_price"` // precio unitario NETO (sin ISV)
	UnitCost    float64 `json:"unit_cost"`
	ISVRate     float64 `json:"isv_rate"`
}

type Expense struct {
	ID           int64   `json:"id"`
	ExpenseDate  string  `json:"expense_date"`
	Category     string  `json:"category"`
	Description  string  `json:"description"`
	Amount       float64 `json:"amount"`
	SupplierID   *int64  `json:"supplier_id"`
	SupplierName string  `json:"supplier_name"`
	Notes        string  `json:"notes"`
	CreatedAt    string  `json:"created_at"`
}

// NewSaleInput es lo que envía el frontend al registrar una venta.
type NewSaleInput struct {
	CustomerName  string             `json:"customer_name"`
	CustomerRTN   string             `json:"customer_rtn"`
	Discount      float64            `json:"discount"`
	PaymentMethod string             `json:"payment_method"`
	Notes         string             `json:"notes"`
	Items         []NewSaleItemInput `json:"items"`
}

type NewSaleItemInput struct {
	ProductID int64    `json:"product_id"`
	Qty       float64  `json:"qty"`
	UnitPrice *float64 `json:"unit_price"` // opcional: precio override tal como se muestra (según config con/sin ISV)
}

type NewPOInput struct {
	SupplierID   int64         `json:"supplier_id"`
	OrderDate    string        `json:"order_date"`
	ExpectedDate string        `json:"expected_date"`
	Notes        string        `json:"notes"`
	Items        []NewPOItemIn `json:"items"`
}

type NewPOItemIn struct {
	ProductID int64   `json:"product_id"`
	Qty       float64 `json:"qty"`
	UnitCost  float64 `json:"unit_cost"`
}
