package store

import "errors"

// ErrNotFound se devuelve cuando un registro no existe (la API lo mapea a 404).
var ErrNotFound = errors.New("registro no encontrado")

// ── Salón ───────────────────────────────────────────────

type Zone struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Sort      int    `json:"sort"`
	Color     string `json:"color"`
	CreatedAt string `json:"created_at"`
}

type Table struct {
	ID           int64   `json:"id"`
	ZoneID       *int64  `json:"zone_id"`
	ZoneName     string  `json:"zone_name"`
	Name         string  `json:"name"`
	Seats        int     `json:"seats"`
	PosX         float64 `json:"pos_x"`
	PosY         float64 `json:"pos_y"`
	Shape        string  `json:"shape"`
	Reserved     bool    `json:"reserved"`
	ReservedNote string  `json:"reserved_note"`
	Active       bool    `json:"active"`
	CreatedAt    string  `json:"created_at"`

	// Estado en vivo (derivado de la comanda abierta; no se persiste).
	Status     string  `json:"status"`       // libre | ocupada | por_cobrar | reservada
	OrderID    *int64  `json:"order_id"`     // comanda abierta, si hay
	OrderTotal float64 `json:"order_total"`  // total en curso
	OpenedAt   string  `json:"opened_at"`    // hora de apertura de la comanda
	Guests     int     `json:"guests"`       // comensales de la comanda en curso
}

// FloorView es el mapa del salón: cada zona con sus mesas y estado en vivo.
type FloorView struct {
	Zone   Zone    `json:"zone"`
	Tables []Table `json:"tables"`
}

// ── Menú ────────────────────────────────────────────────

type MenuCategory struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Sort      int    `json:"sort"`
	Station   string `json:"station"`
	Color     string `json:"color"`
	CreatedAt string `json:"created_at"`
}

type MenuItem struct {
	ID           int64   `json:"id"`
	Code         string  `json:"code"`
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	CategoryID   *int64  `json:"category_id"`
	CategoryName string  `json:"category_name"`
	Price        float64 `json:"price"`
	ISVRate      float64 `json:"isv_rate"`
	Cost         float64 `json:"cost"`
	Station      string  `json:"station"`
	Available    bool    `json:"available"`
	Active       bool    `json:"active"`
	Sort         int     `json:"sort"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

// MenuView agrupa los platillos por categoría para la pantalla de comanda.
type MenuView struct {
	Category MenuCategory `json:"category"`
	Items    []MenuItem   `json:"items"`
}

// ── Sesión de caja ──────────────────────────────────────

type Session struct {
	ID            int64   `json:"id"`
	SessionNumber string  `json:"session_number"`
	OpenedBy      string  `json:"opened_by"`
	OpeningCash   float64 `json:"opening_cash"`
	OpenedAt      string  `json:"opened_at"`
	ClosingCash   float64 `json:"closing_cash"`
	ExpectedCash  float64 `json:"expected_cash"`
	Difference    float64 `json:"difference"`
	ClosedAt      string  `json:"closed_at"`
	Status        string  `json:"status"`
	Notes         string  `json:"notes"`
	CreatedAt     string  `json:"created_at"`

	// Totales del turno (derivados; sólo en la vista de cierre).
	Orders     int     `json:"orders"`
	SalesTotal float64 `json:"sales_total"`
	CashSales  float64 `json:"cash_sales"`
	CardSales  float64 `json:"card_sales"`
	OtherSales float64 `json:"other_sales"`
	TipsTotal  float64 `json:"tips_total"`
}

// ── Comandas ────────────────────────────────────────────

type Order struct {
	ID           int64     `json:"id"`
	OrderNumber  string    `json:"order_number"`
	TableID      *int64    `json:"table_id"`
	TableName    string    `json:"table_name"`
	SessionID    *int64    `json:"session_id"`
	Type         string    `json:"type"`
	Guests       int       `json:"guests"`
	Waiter       string    `json:"waiter"`
	Status       string    `json:"status"`
	OpenedAt     string    `json:"opened_at"`
	ClosedAt     string    `json:"closed_at"`
	CustomerName string    `json:"customer_name"`
	CustomerRTN  string    `json:"customer_rtn"`
	Subtotal     float64   `json:"subtotal"` // neto de ISV
	Discount     float64   `json:"discount"`
	DiscountNet  float64   `json:"discount_net"`
	ISV          float64   `json:"isv"`
	Tip          float64   `json:"tip"`
	Total        float64   `json:"total"` // gravable (sin propina)
	CostTotal    float64   `json:"cost_total"`
	Notes        string    `json:"notes"`
	CreatedAt    string    `json:"created_at"`
	Items        []OrderItem    `json:"items,omitempty"`
	Payments     []OrderPayment `json:"payments,omitempty"`
}

type OrderItem struct {
	ID            int64   `json:"id"`
	OrderID       int64   `json:"order_id"`
	MenuItemID    *int64  `json:"menu_item_id"`
	Name          string  `json:"name"`
	Qty           float64 `json:"qty"`
	UnitPrice     float64 `json:"unit_price"` // precio de menú tal como se muestra (con/sin ISV según config)
	ISVRate       float64 `json:"isv_rate"`
	UnitCost      float64 `json:"unit_cost"`
	Course        string  `json:"course"`
	Station       string  `json:"station"`
	KitchenStatus string  `json:"kitchen_status"`
	SentAt        string  `json:"sent_at"`
	ReadyAt       string  `json:"ready_at"`
	ServedAt      string  `json:"served_at"`
	Notes         string  `json:"notes"`
	CreatedAt     string  `json:"created_at"`
}

type OrderPayment struct {
	ID        int64   `json:"id"`
	OrderID   int64   `json:"order_id"`
	Method    string  `json:"method"`
	Amount    float64 `json:"amount"`
	Tip       float64 `json:"tip"`
	Reference string  `json:"reference"`
	CreatedAt string  `json:"created_at"`
}

// KitchenTicket es una línea en la pantalla de cocina (KDS).
type KitchenTicket struct {
	ItemID      int64   `json:"item_id"`
	OrderID     int64   `json:"order_id"`
	OrderNumber string  `json:"order_number"`
	TableName   string  `json:"table_name"`
	Name        string  `json:"name"`
	Qty         float64 `json:"qty"`
	Course      string  `json:"course"`
	Station     string  `json:"station"`
	Status      string  `json:"kitchen_status"`
	Notes       string  `json:"notes"`
	SentAt      string  `json:"sent_at"`
	WaitMinutes int     `json:"wait_minutes"`
}

type Invoice struct {
	ID        int64   `json:"id"`
	OrderID   *int64  `json:"order_id"`
	DocType   string  `json:"doc_type"`
	Sequence  string  `json:"sequence"`
	CAI       string  `json:"cai"`
	BuyerName string  `json:"buyer_name"`
	BuyerRTN  string  `json:"buyer_rtn"`
	SellerRTN string  `json:"seller_rtn"`
	Subtotal  float64 `json:"subtotal"`
	ISV       float64 `json:"isv"`
	Exempt    float64 `json:"exempt"`
	Total     float64 `json:"total"`
	Currency  string  `json:"currency"`
	Status    string  `json:"status"`
	IssuedAt  string  `json:"issued_at"`
	CreatedAt string  `json:"created_at"`
}

// ── Dashboard ───────────────────────────────────────────

type Dashboard struct {
	SessionOpen   bool          `json:"session_open"`
	SalesToday    float64       `json:"sales_today"`
	OrdersToday   int           `json:"orders_today"`
	AvgTicket     float64       `json:"avg_ticket"`
	TipsToday     float64       `json:"tips_today"`
	OpenOrders    int           `json:"open_orders"`
	TablesTotal   int           `json:"tables_total"`
	TablesBusy    int           `json:"tables_busy"`
	KitchenOpen   int           `json:"kitchen_open"`
	TopItems      []TopItem     `json:"top_items"`
	RecentOrders  []Order       `json:"recent_orders"`
}

type TopItem struct {
	Name  string  `json:"name"`
	Qty   float64 `json:"qty"`
	Total float64 `json:"total"`
}

// ── Inputs (lo que envía el frontend) ───────────────────

type NewOrderInput struct {
	TableID *int64 `json:"table_id"`
	Type    string `json:"type"`
	Guests  int    `json:"guests"`
	Waiter  string `json:"waiter"`
}

type AddItemInput struct {
	MenuItemID int64   `json:"menu_item_id"`
	Qty        float64 `json:"qty"`
	Course     string  `json:"course"`
	Notes      string  `json:"notes"`
}

type UpdateItemInput struct {
	Qty    *float64 `json:"qty"`
	Course *string  `json:"course"`
	Notes  *string  `json:"notes"`
}

type PayInput struct {
	Discount     float64        `json:"discount"`
	CustomerName string         `json:"customer_name"`
	CustomerRTN  string         `json:"customer_rtn"`
	Invoice      bool           `json:"invoice"` // emitir factura (con datos fiscales)
	Payments     []PayLineInput `json:"payments"`
}

type PayLineInput struct {
	Method    string  `json:"method"`
	Amount    float64 `json:"amount"`
	Tip       float64 `json:"tip"`
	Reference string  `json:"reference"`
}

type OpenSessionInput struct {
	OpenedBy    string  `json:"opened_by"`
	OpeningCash float64 `json:"opening_cash"`
}

type CloseSessionInput struct {
	ClosingCash float64 `json:"closing_cash"`
	Notes       string  `json:"notes"`
}
