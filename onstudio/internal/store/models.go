package store

import "errors"

// ErrNotFound se devuelve cuando un registro no existe (la API lo mapea a 404).
var ErrNotFound = errors.New("registro no encontrado")

// Job es un trabajo de generación = una compra facturable por tokens.
type Job struct {
	ID              string `json:"id"`
	CreatedAt       string `json:"created_at"`
	Status          string `json:"status"` // queued|running|done|error|canceled
	Provider        string `json:"provider"`
	Model           string `json:"model"`
	TemplateID      string `json:"template_id"`
	SpecJSON        string `json:"spec_json"`
	OpencodeSession string `json:"opencode_session"`
	ErrorMsg        string `json:"error_msg"`
}

// Site es el sitio resultante de un job.
type Site struct {
	ID           string `json:"id"`
	JobID        string `json:"job_id"`
	BusinessName string `json:"business_name"`
	WorkspaceDir string `json:"workspace_dir"`
	PreviewURL   string `json:"preview_url"`
	CreatedAt    string `json:"created_at"`
}

// Usage es el uso de tokens y costo por job (base de la factura).
type Usage struct {
	ID               string  `json:"id"`
	JobID            string  `json:"job_id"`
	InputTokens      int64   `json:"input_tokens"`
	OutputTokens     int64   `json:"output_tokens"`
	CacheReadTokens  int64   `json:"cache_read_tokens"`
	CacheWriteTokens int64   `json:"cache_write_tokens"`
	ProviderCost     float64 `json:"provider_cost"`
	Price            float64 `json:"price"`
	Currency         string  `json:"currency"`
	CapturedAt       string  `json:"captured_at"`
}

// PriceRule es el precio/margen por modelo (semilla desde config.json).
type PriceRule struct {
	Provider      string  `json:"provider"`
	Model         string  `json:"model"`
	InputPerMTok  float64 `json:"input_per_mtok"`
	OutputPerMTok float64 `json:"output_per_mtok"`
	Margin        float64 `json:"margin"`
}

// Brand son las preferencias de marca dentro de la spec. El tema claro (blanco) es
// el default; UseCompanyColors activa los company-colors (navy de ONDIGITAL).
type Brand struct {
	UseCompanyColors bool   `json:"use_company_colors"`
	Primary          string `json:"primary,omitempty"`
	Accent           string `json:"accent,omitempty"`
	LogoHint         string `json:"logo_hint,omitempty"`
}

// Contact son los datos de contacto del negocio (texto libre, se sanitiza en intake;
// nunca se fabrican RTN/DNI ni se inventan datos legales).
type Contact struct {
	Phone    string `json:"phone,omitempty"`
	RTN      string `json:"rtn,omitempty"`
	DNI      string `json:"dni,omitempty"`
	Address  string `json:"address,omitempty"`
	WhatsApp string `json:"whatsapp,omitempty"`
}

// Spec es la especificación normalizada del negocio que alimenta la generación.
type Spec struct {
	BusinessName string   `json:"business_name"`
	Industry     string   `json:"industry"`
	SiteType     string   `json:"site_type"`
	Locale       string   `json:"locale"`
	Currency     string   `json:"currency"`
	Brand        Brand    `json:"brand"`
	Pages        []string `json:"pages"`
	Contact      Contact  `json:"contact"`
	ContentNotes string   `json:"content_notes"`
}

// NewJobInput es el cuerpo de POST /api/jobs.
type NewJobInput struct {
	Spec     Spec   `json:"spec"`
	Provider string `json:"provider"`
	Model    string `json:"model"`
}

// Billing es la vista de factura de un job (tokens, costo, precio USD/HNL).
type Billing struct {
	JobID            string  `json:"job_id"`
	Status           string  `json:"status"`
	Provider         string  `json:"provider"`
	Model            string  `json:"model"`
	InputTokens      int64   `json:"input_tokens"`
	OutputTokens     int64   `json:"output_tokens"`
	CacheReadTokens  int64   `json:"cache_read_tokens"`
	CacheWriteTokens int64   `json:"cache_write_tokens"`
	ProviderCost     float64 `json:"provider_cost_usd"`
	Margin           float64 `json:"margin"`
	PriceUSD         float64 `json:"price_usd"`
	PriceHNL         float64 `json:"price_hnl"`
	Currency         string  `json:"currency"`
	Captured         bool    `json:"captured"`
}
