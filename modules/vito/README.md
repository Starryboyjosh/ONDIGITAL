# Vito — módulo reutilizable (Fase 1)

Asistente empresarial **white-label** de ONDIGITAL. En la UI del cliente solo existe **Vito**; el motor de IA es un detalle de implementación (mock, OpenCode Zen u otro provider).

## Contrato de montaje (host app)

Cualquier app que quiera Vito implementa este contrato:

### 1. Dependencia

- **Go hosts** (OnStock, futuros servicios): importan `ondigital.hn/vito` y hacen `replace` local al monorepo:

```go
require ondigital.hn/vito v0.0.0
replace ondigital.hn/vito => ../modules/vito
```

- **Hosts solo frontend** (Credental hoy): no embeben el binario Go; implementan el **mismo contrato de tools** en JS y pueden, más adelante, apuntar a un backend híbrido.

### 2. Configuración (server-side)

| Variable | Rol |
|----------|-----|
| `VITO_ENABLED` | `true`/`false` — la app debe funcionar **con Vito apagado** |
| `VITO_PROVIDER` | `local` \| `nube` (auto: con clave → nube, si no → local) |
| `VITO_API_KEY` | Solo servidor, nunca en el browser |
| `VITO_BASE_URL` | Vacío = endpoint por defecto del proveedor activo |
| `VITO_MODEL` | Vacío = modelo por defecto del proveedor activo |
| `VITO_LOCALE` | Default `es-HN` |

Las variables que edita el cliente no nombran al proveedor: el motor es
intercambiable y el mensaje de arranque se lee en la misma ventana que mira el
dueño del negocio. Los nombres antiguos (`VITO_OPENCODE_API_KEY`,
`OPENCODE_API_KEY`, `VITO_OPENCODE_BASE_URL`, `VITO_OPENCODE_MODEL`), el
`VITO_MODELO` en español que adoptó OnRoute, y los valores `mock`/`opencode`
siguen aceptándose como alias; ganan los nuevos si están puestos. Dentro del código, la capa de providers sí nombra al proveedor
—es su trabajo—: ver `opencode_provider.go`.

### 3. Ciclo de vida en el host

```text
1. LoadDotEnv (opcional)
2. NewRegistry()
3. Register domain tools (lectura y/o escritura)
4. NewServiceFromEnv(registry)  // o New(Config, Provider, registry)
5. Exponer HTTP:
     GET  /api/vito/status   → { assistant:"Vito", enabled, ready }  // sin nombre de proveedor
     POST /api/vito/ask      → AskRequest → AskResponse
     POST /api/vito/confirm  → { tool_name, arguments } para acciones
6. UI: solo branding "Vito"; mostrar citations y confirmar write tools
```

### 4. Tools (lo que separa a Vito de un chatbot)

Cada tool:

| Campo | Significado |
|-------|-------------|
| `name` | id estable (`list_low_stock`) |
| `description` | para el modelo / UI de confirmación |
| `read_only` | `true` = auto-ejecutable; `false` = requiere `ConfirmAction` |
| `parameters` | JSON Schema opcional |
| handler | lee/escribe **solo** el tenant del host |

**Respuesta de tool:**

- `content`: JSON con `summary` en español (preferido para UI) + datos
- `citations[]`: `{ source, label, detail }` — fuentes de negocio, nunca el vendor de IA

### 5. API de tipos (Go)

```go
Ask(ctx, AskRequest{Message, History, Locale}) (AskResponse, error)
ConfirmAction(ctx, toolName, args) (AskResponse, error)
```

`AskResponse`:

- `reply` — texto al usuario  
- `citations` — fuentes  
- `pending_action` — si hay write tool pendiente  
- `mock` — opcional, no mostrar vendor  

### 6. White-label (no negociable)

- UI y `reply` **nunca** mencionan Claude, ChatGPT, OpenCode, OpenAI, etc.
- `Provider.Name()` es solo para logs del servidor.
- `GET /api/vito/status` no devuelve el id del provider.

### 7. Referencia de implementación

| Host | Ubicación |
|------|-----------|
| OnStock (completo Fase 1) | `onstock/internal/vitohost`, `onstock/web/js/pages/vito.js` |
| Credental (esqueleto) | `credental/js/vito/`, `credental/vito.html` |

### 8. Verificación

```bash
cd modules/vito && go test ./...
cd onstock && make test
cd onstock && make seed-demo-force && make dev
# → http://localhost:8080/#/vito
```

Demo canónica: ver `docs/demo-fase1-vito.md`.

## Qué queda para Fase 2

- Contrato formal de **módulo de negocio** (no solo Vito): datos + acciones por dominio.
- Credental: cerrar capa híbrida y conectar tools reales de agenda/pacientes/facturación.
- Biblioteca de módulos y ensamblado multi-cliente.
