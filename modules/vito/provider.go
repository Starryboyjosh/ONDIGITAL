package vito

import "context"

// Provider is the swappable AI engine behind Vito.
// Implementations must never leak vendor names into AskResponse.Reply.
// Keys and HTTP stay server-side in the host process.
type Provider interface {
	// Name is an internal id for logs/metrics only (never shown in UI).
	Name() string
	// Ask produces an assistant reply. Tools may be empty.
	Ask(ctx context.Context, req ProviderRequest) (ProviderResult, error)
}

// ProviderRequest is what the service sends to a Provider.
type ProviderRequest struct {
	System   string
	Messages []Message
	Tools    []Tool
	Locale   string
}

// ProviderResult is raw model output before the service attaches citations.
type ProviderResult struct {
	// Content is assistant text (may be empty if only tool calls).
	Content string
	// ToolCalls requested by the model (host may execute and re-ask).
	ToolCalls []ToolCall
}
