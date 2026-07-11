// Package vito is ONDIGITAL's white-label business assistant core.
// Host apps (OnStock, Credental, …) mount this module; the UI only ever says "Vito".
package vito

import "time"

// Role of a chat message.
type Role string

const (
	RoleUser      Role = "user"
	RoleAssistant Role = "assistant"
	RoleSystem    Role = "system"
	RoleTool      Role = "tool"
)

// Message is one turn in a conversation with Vito.
type Message struct {
	Role       Role   `json:"role"`
	Content    string `json:"content"`
	Name       string `json:"name,omitempty"` // tool name when RoleTool
	ToolCallID string `json:"tool_call_id,omitempty"`
	// ToolCalls on assistant turns that requested tools (required for OpenAI-compatible history).
	ToolCalls []ToolCall `json:"tool_calls,omitempty"`
	CreatedAt time.Time  `json:"created_at,omitempty"`
}

// Citation points at the business data Vito used (never a model vendor).
type Citation struct {
	// Source is a stable id, e.g. "onstock.products.low_stock".
	Source string `json:"source"`
	// Label is human-readable Spanish for the UI, e.g. "Inventario · stock bajo".
	Label string `json:"label"`
	// Detail is optional context (query summary, row count, filters).
	Detail string `json:"detail,omitempty"`
}

// Tool describes a capability the host app exposes to Vito.
// Tools are how Vito stays grounded in real business data.
type Tool struct {
	// Name is a stable snake_case id (e.g. "list_low_stock").
	Name string `json:"name"`
	// Description guides the model; keep it factual and in Spanish when user-facing.
	Description string `json:"description"`
	// ReadOnly marks pure queries vs mutations (actions need UI confirmation later).
	ReadOnly bool `json:"read_only"`
	// Parameters is a JSON Schema object (optional for simple tools).
	Parameters map[string]any `json:"parameters,omitempty"`
}

// ToolCall is a request from the model (or mock) to run a host tool.
type ToolCall struct {
	ID        string         `json:"id"`
	Name      string         `json:"name"`
	Arguments map[string]any `json:"arguments,omitempty"`
}

// ToolResult is what the host returns after running a tool.
type ToolResult struct {
	CallID    string     `json:"call_id"`
	Name      string     `json:"name"`
	OK        bool       `json:"ok"`
	Content   string     `json:"content"` // JSON or plain text payload for the model
	Citations []Citation `json:"citations,omitempty"`
	Error     string     `json:"error,omitempty"`
}

// AskRequest is one user question (plus optional history) to Vito.
type AskRequest struct {
	// Message is the latest user utterance (required).
	Message string `json:"message"`
	// History is prior turns (optional). Host may truncate.
	History []Message `json:"history,omitempty"`
	// TenantID reserved for multi-tenant isolation (Fase 4).
	TenantID string `json:"tenant_id,omitempty"`
	// Locale defaults to es-HN when empty.
	Locale string `json:"locale,omitempty"`
}

// AskResponse is Vito's answer. Provider names never appear here.
type AskResponse struct {
	// Reply is the assistant text shown to the user.
	Reply string `json:"reply"`
	// Citations list business data sources used.
	Citations []Citation `json:"citations,omitempty"`
	// ToolCalls are pending/executed tool invocations (debug/demo).
	ToolCalls []ToolCall `json:"tool_calls,omitempty"`
	// PendingAction is set when an action tool needs host/UI confirmation.
	PendingAction *PendingAction `json:"pending_action,omitempty"`
	// Mock marks responses produced without a live LLM (offline / tests).
	Mock bool `json:"mock,omitempty"`
}

// PendingAction describes a write tool that must be confirmed before running.
type PendingAction struct {
	ToolName     string         `json:"tool_name"`
	Summary      string         `json:"summary"` // Spanish, safe for UI
	Arguments    map[string]any `json:"arguments,omitempty"`
	ConfirmToken string         `json:"confirm_token,omitempty"`
}
