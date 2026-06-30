package engine

// Estos structs reflejan el contrato HTTP de `opencode serve`, verificado contra
// el SDK oficial (packages/sdk/js/src/gen/types.gen.ts). Se mantienen AISLADOS
// aquí para que un cambio de versión del servidor sea un fix de un solo archivo.
// Fuente de verdad en tiempo de ejecución: el OpenAPI del servidor en `/doc`.

// modelRef es la selección de modelo del cuerpo de POST /session/:id/message:
//   "model": { "providerID": "anthropic", "modelID": "claude-sonnet-4-5" }
type modelRef struct {
	ProviderID string `json:"providerID"`
	ModelID    string `json:"modelID"`
}

// textPartInput es un TextPartInput del SDK: { "type": "text", "text": "..." }.
type textPartInput struct {
	Type string `json:"type"` // siempre "text"
	Text string `json:"text"`
}

// messageReq es el cuerpo de POST /session/:id/message.
type messageReq struct {
	Model *modelRef       `json:"model,omitempty"`
	Agent string          `json:"agent,omitempty"`
	Parts []textPartInput `json:"parts"`
}

// sessionReq es el cuerpo de POST /session.
type sessionReq struct {
	Title string `json:"title,omitempty"`
}

// sessionResp es la respuesta de POST /session (objeto Session; solo usamos id).
type sessionResp struct {
	ID string `json:"id"`
}

// tokenInfo refleja info.tokens del mensaje del asistente.
type tokenInfo struct {
	Input     int64 `json:"input"`
	Output    int64 `json:"output"`
	Reasoning int64 `json:"reasoning"`
	Cache     struct {
		Read  int64 `json:"read"`
		Write int64 `json:"write"`
	} `json:"cache"`
}

// assistantError es el bloque info.error cuando el turno falló dentro de OpenCode.
type assistantError struct {
	Name string `json:"name"`
	Data struct {
		Message string `json:"message"`
	} `json:"data"`
}

// assistantInfo es el objeto `info` (Message del asistente) de la respuesta.
// El costo y los tokens del turno viven aquí.
type assistantInfo struct {
	ID     string          `json:"id"`
	Role   string          `json:"role"`
	Cost   float64         `json:"cost"`
	Tokens tokenInfo       `json:"tokens"`
	Error  *assistantError `json:"error,omitempty"`
}

// messagePart es un elemento de `parts` en la respuesta. Solo extraemos texto.
type messagePart struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// messageResp es la respuesta de POST /session/:id/message: { info, parts }.
type messageResp struct {
	Info  assistantInfo `json:"info"`
	Parts []messagePart `json:"parts"`
}
