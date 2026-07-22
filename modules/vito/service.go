package vito

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"
)

// Config controls the Vito service for a host app.
type Config struct {
	// Enabled when false, Ask returns a clear offline message without calling the provider.
	Enabled bool
	// Locale defaults to es-HN.
	Locale string
	// MaxToolRounds limits tool → model loops (2 is enough for mock + simple demos).
	MaxToolRounds int
	// AssistantName is always "Vito" for product copy; overridable only for tests.
	AssistantName string
}

// Service orchestrates provider + tools. This is what host apps call.
type Service struct {
	cfg      Config
	provider Provider
	tools    *Registry
}

// New creates a Vito service. provider may be MockProvider or a live implementation.
func New(cfg Config, provider Provider, tools *Registry) (*Service, error) {
	if provider == nil {
		return nil, fmt.Errorf("vito: provider is required")
	}
	if tools == nil {
		tools = NewRegistry()
	}
	if cfg.Locale == "" {
		cfg.Locale = "es-HN"
	}
	if cfg.MaxToolRounds <= 0 {
		cfg.MaxToolRounds = 2
	}
	if cfg.AssistantName == "" {
		cfg.AssistantName = "Vito"
	}
	return &Service{cfg: cfg, provider: provider, tools: tools}, nil
}

// Enabled reports whether the host turned Vito on.
func (s *Service) Enabled() bool { return s.cfg.Enabled }

// ProviderName is for server logs only — never put this in UI responses.
func (s *Service) ProviderName() string {
	if s.provider == nil {
		return ""
	}
	return s.provider.Name()
}

// Ask handles one user question. White-label: reply never names the AI vendor.
func (s *Service) Ask(ctx context.Context, req AskRequest) (AskResponse, error) {
	if strings.TrimSpace(req.Message) == "" {
		return AskResponse{}, fmt.Errorf("vito: message is required")
	}
	if !s.cfg.Enabled {
		return AskResponse{
			Reply: "Vito no está activo en este momento. Puedes seguir usando el sistema con normalidad; cuando se active el plan con asistente, estaré aquí.",
			Mock:  true,
		}, nil
	}

	locale := req.Locale
	if locale == "" {
		locale = s.cfg.Locale
	}

	msgs := append([]Message{}, req.History...)
	msgs = append(msgs, Message{
		Role:      RoleUser,
		Content:   strings.TrimSpace(req.Message),
		CreatedAt: time.Now().UTC(),
	})

	var allCitations []Citation
	var lastCalls []ToolCall
	mock := s.provider.Name() == "mock"

	for round := 0; round < s.cfg.MaxToolRounds; round++ {
		pres, err := s.provider.Ask(ctx, ProviderRequest{
			System:   systemPrompt(s.cfg.AssistantName, locale),
			Messages: msgs,
			Tools:    s.tools.List(),
			Locale:   locale,
		})
		if err != nil {
			return AskResponse{}, fmt.Errorf("vito: provider: %w", err)
		}

		// Final answer (no tools).
		if len(pres.ToolCalls) == 0 {
			reply := strings.TrimSpace(pres.Content)
			if reply == "" {
				reply = synthesizeFromTools(msgs)
			}
			return AskResponse{
				Reply:     s.sanitizeReply(reply),
				Citations: dedupeCitations(allCitations),
				ToolCalls: lastCalls,
				Mock:      mock,
			}, nil
		}

		lastCalls = pres.ToolCalls

		// OpenAI-compatible history: assistant turn with tool_calls MUST precede tool results.
		msgs = append(msgs, Message{
			Role:      RoleAssistant,
			Content:   strings.TrimSpace(pres.Content),
			ToolCalls: append([]ToolCall(nil), pres.ToolCalls...),
			CreatedAt: time.Now().UTC(),
		})

		for _, call := range pres.ToolCalls {
			meta, ok := s.tools.Get(call.Name)
			if ok && !meta.ReadOnly {
				return AskResponse{
					Reply:     "Encontré una acción que puede modificar datos. Confírmala para continuar.",
					Citations: dedupeCitations(allCitations),
					ToolCalls: lastCalls,
					PendingAction: &PendingAction{
						ToolName:  call.Name,
						Summary:   meta.Description,
						Arguments: call.Arguments,
					},
					Mock: mock,
				}, nil
			}

			res, runErr := s.tools.Run(ctx, call)
			if runErr != nil && res.Content == "" {
				res = ToolResult{
					CallID:  call.ID,
					Name:    call.Name,
					OK:      false,
					Error:   runErr.Error(),
					Content: fmt.Sprintf(`{"error":%q}`, runErr.Error()),
				}
			}
			allCitations = append(allCitations, res.Citations...)
			callID := call.ID
			if res.CallID != "" {
				callID = res.CallID
			}
			msgs = append(msgs, Message{
				Role:       RoleTool,
				Name:       call.Name,
				ToolCallID: callID,
				Content:    res.Content,
				CreatedAt:  time.Now().UTC(),
			})
		}
	}

	// Exhausted rounds after tool use — answer from tool data (typical mock path).
	return AskResponse{
		Reply:     s.sanitizeReply(synthesizeFromTools(msgs)),
		Citations: dedupeCitations(allCitations),
		ToolCalls: lastCalls,
		Mock:      mock,
	}, nil
}

func systemPrompt(name, locale string) string {
	return fmt.Sprintf(
		"Eres %s, el asistente empresarial del negocio. Respondes en español (locale %s). "+
			"Usas solo datos de las herramientas. Nunca menciones proveedores de IA, modelos ni APIs externas. "+
			"Si no hay datos, dilo con claridad. Cita en qué parte del sistema te basaste cuando sea posible.",
		name, locale,
	)
}

func synthesizeFromTools(msgs []Message) string {
	var parts []string
	for _, m := range msgs {
		if m.Role == RoleTool && strings.TrimSpace(m.Content) != "" {
			parts = append(parts, preferSummary(m.Content))
		}
	}
	if len(parts) == 0 {
		return "No pude obtener datos del negocio para responder. Intenta de nuevo o revisa que las herramientas estén conectadas."
	}
	if len(parts) == 1 {
		last := parts[0]
		if strings.HasPrefix(last, "Según los datos") {
			return last
		}
		return fmt.Sprintf("Según los datos del sistema:\n\n%s", last)
	}
	var b strings.Builder
	b.WriteString("Según los datos del sistema:\n")
	for i, p := range parts {
		b.WriteString(fmt.Sprintf("\n—— %d ——\n%s\n", i+1, p))
	}
	return strings.TrimSpace(b.String())
}

func dedupeCitations(in []Citation) []Citation {
	if len(in) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(in))
	out := make([]Citation, 0, len(in))
	for _, c := range in {
		key := c.Source + "|" + c.Label + "|" + c.Detail
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, c)
	}
	return out
}

// ConfirmAction runs a write tool after the user confirms in the UI.
// Never call this from untrusted client input without UI confirmation.
func (s *Service) ConfirmAction(ctx context.Context, toolName string, args map[string]any) (AskResponse, error) {
	if !s.cfg.Enabled {
		return AskResponse{
			Reply: "Vito no está activo en este momento.",
			Mock:  true,
		}, nil
	}
	toolName = strings.TrimSpace(toolName)
	if toolName == "" {
		return AskResponse{}, fmt.Errorf("vito: tool_name is required")
	}
	meta, ok := s.tools.Get(toolName)
	if !ok {
		return AskResponse{}, fmt.Errorf("vito: unknown tool %q", toolName)
	}
	if meta.ReadOnly {
		return AskResponse{}, fmt.Errorf("vito: tool %q is read-only; use Ask", toolName)
	}
	mock := s.provider.Name() == "mock"
	res, err := s.tools.Run(ctx, ToolCall{
		ID:        "confirm_1",
		Name:      toolName,
		Arguments: args,
	})
	if err != nil && !res.OK {
		return AskResponse{
			Reply: fmt.Sprintf("No pude completar la acción: %s", firstNonEmpty(res.Error, err.Error())),
			Mock:  mock,
		}, nil
	}
	reply := s.sanitizeReply(preferSummary(res.Content))
	if reply == "" {
		reply = "Acción completada."
	}
	return AskResponse{
		Reply:     reply,
		Citations: res.Citations,
		ToolCalls: []ToolCall{{ID: "confirm_1", Name: toolName, Arguments: args}},
		Mock:      mock,
	}, nil
}

// sanitizeReply enforces the white-label boundary even when a provider ignores its prompt.
func (s *Service) sanitizeReply(reply string) string {
	terms := []string{
		"Claude", "ChatGPT", "OpenAI", "OpenCode", "Anthropic", "GPT-4", "Nemotron",
	}
	if s.provider != nil {
		terms = append(terms, s.provider.Name())
	}
	for _, term := range terms {
		term = strings.TrimSpace(term)
		if term == "" {
			continue
		}
		pattern := regexp.MustCompile(`(?i)\b` + regexp.QuoteMeta(term) + `\b`)
		reply = pattern.ReplaceAllString(reply, "Vito")
	}
	return reply
}

func preferSummary(content string) string {
	content = strings.TrimSpace(content)
	if content == "" {
		return ""
	}
	var obj map[string]any
	if err := json.Unmarshal([]byte(content), &obj); err == nil {
		if s, ok := obj["summary"].(string); ok && strings.TrimSpace(s) != "" {
			return s
		}
	}
	return content
}
