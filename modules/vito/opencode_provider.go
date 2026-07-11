package vito

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// OpenCodeConfig configures the OpenCode Zen OpenAI-compatible gateway.
type OpenCodeConfig struct {
	APIKey     string
	BaseURL    string // e.g. https://opencode.ai/zen/v1
	Model      string // e.g. big-pickle
	HTTPClient *http.Client
}

// OpenCodeProvider talks to OpenCode Zen chat completions.
// Name() is for server logs only — never surface it in UI copy.
type OpenCodeProvider struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

// NewOpenCodeProvider builds a live provider. API key must be non-empty.
func NewOpenCodeProvider(cfg OpenCodeConfig) *OpenCodeProvider {
	base := strings.TrimRight(cfg.BaseURL, "/")
	if base == "" {
		base = DefaultOpenCodeBaseURL
	}
	model := cfg.Model
	if model == "" {
		model = DefaultOpenCodeModel
	}
	client := cfg.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 90 * time.Second}
	}
	return &OpenCodeProvider{
		apiKey:  cfg.APIKey,
		baseURL: base,
		model:   model,
		client:  client,
	}
}

func (p *OpenCodeProvider) Name() string { return "opencode" }

func (p *OpenCodeProvider) Ask(ctx context.Context, req ProviderRequest) (ProviderResult, error) {
	if p.apiKey == "" {
		return ProviderResult{}, fmt.Errorf("vito: opencode api key missing")
	}

	messages := make([]ocMessage, 0, len(req.Messages)+1)
	if sys := strings.TrimSpace(req.System); sys != "" {
		messages = append(messages, ocMessage{Role: "system", Content: sys})
	}
	for _, m := range req.Messages {
		messages = append(messages, toOCMessage(m))
	}

	body := ocChatRequest{
		Model:    p.model,
		Messages: messages,
	}
	if len(req.Tools) > 0 {
		body.Tools = make([]ocTool, 0, len(req.Tools))
		for _, t := range req.Tools {
			params := t.Parameters
			if params == nil {
				params = map[string]any{
					"type":       "object",
					"properties": map[string]any{},
				}
			}
			body.Tools = append(body.Tools, ocTool{
				Type: "function",
				Function: ocFunctionDef{
					Name:        t.Name,
					Description: t.Description,
					Parameters:  params,
				},
			})
		}
	}

	raw, err := json.Marshal(body)
	if err != nil {
		return ProviderResult{}, err
	}

	url := p.baseURL + "/chat/completions"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(raw))
	if err != nil {
		return ProviderResult{}, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return ProviderResult{}, fmt.Errorf("vito: opencode request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return ProviderResult{}, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return ProviderResult{}, fmt.Errorf("vito: opencode HTTP %d: %s", resp.StatusCode, truncateRunes(string(respBody), 280))
	}

	var parsed ocChatResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return ProviderResult{}, fmt.Errorf("vito: opencode decode: %w", err)
	}
	if len(parsed.Choices) == 0 {
		return ProviderResult{}, fmt.Errorf("vito: opencode empty choices")
	}

	msg := parsed.Choices[0].Message
	out := ProviderResult{
		Content: strings.TrimSpace(msg.Content),
	}
	for _, tc := range msg.ToolCalls {
		args := map[string]any{}
		if strings.TrimSpace(tc.Function.Arguments) != "" {
			_ = json.Unmarshal([]byte(tc.Function.Arguments), &args)
		}
		out.ToolCalls = append(out.ToolCalls, ToolCall{
			ID:        tc.ID,
			Name:      tc.Function.Name,
			Arguments: args,
		})
	}
	return out, nil
}

func toOCMessage(m Message) ocMessage {
	switch m.Role {
	case RoleTool:
		return ocMessage{
			Role:       "tool",
			Content:    m.Content,
			Name:       m.Name,
			ToolCallID: m.ToolCallID,
		}
	case RoleAssistant:
		msg := ocMessage{Role: "assistant", Content: m.Content}
		if len(m.ToolCalls) > 0 {
			msg.ToolCalls = make([]ocToolCallOut, 0, len(m.ToolCalls))
			for _, tc := range m.ToolCalls {
				args, _ := json.Marshal(tc.Arguments)
				if tc.Arguments == nil {
					args = []byte("{}")
				}
				msg.ToolCalls = append(msg.ToolCalls, ocToolCallOut{
					ID:   tc.ID,
					Type: "function",
					Function: ocFunctionCallOut{
						Name:      tc.Name,
						Arguments: string(args),
					},
				})
			}
		}
		return msg
	case RoleSystem:
		return ocMessage{Role: "system", Content: m.Content}
	default:
		return ocMessage{Role: "user", Content: m.Content}
	}
}

// --- wire types (OpenAI-compatible) ---

type ocChatRequest struct {
	Model    string      `json:"model"`
	Messages []ocMessage `json:"messages"`
	Tools    []ocTool    `json:"tools,omitempty"`
}

type ocMessage struct {
	Role       string          `json:"role"`
	Content    string          `json:"content,omitempty"`
	Name       string          `json:"name,omitempty"`
	ToolCallID string          `json:"tool_call_id,omitempty"`
	ToolCalls  []ocToolCallOut `json:"tool_calls,omitempty"`
}

type ocToolCallOut struct {
	ID       string            `json:"id"`
	Type     string            `json:"type"`
	Function ocFunctionCallOut `json:"function"`
}

type ocFunctionCallOut struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type ocTool struct {
	Type     string        `json:"type"`
	Function ocFunctionDef `json:"function"`
}

type ocFunctionDef struct {
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	Parameters  map[string]any `json:"parameters,omitempty"`
}

type ocChatResponse struct {
	Choices []struct {
		Message struct {
			Content   string `json:"content"`
			ToolCalls []struct {
				ID       string `json:"id"`
				Type     string `json:"type"`
				Function struct {
					Name      string `json:"name"`
					Arguments string `json:"arguments"`
				} `json:"function"`
			} `json:"tool_calls"`
		} `json:"message"`
	} `json:"choices"`
}
