# OnStudio — API HTTP y Configuración

> Contrato previsto de la **API HTTP de OnStudio** (la que consume su propia UI) y
> de los **archivos de configuración**. Diseño para Phase 1+. Los `*.example.json`
> y `.env.example` viven en `onstudio/` y son la plantilla que el operador copia.

## API HTTP de OnStudio

La UI embebida llama **solo** a esta API Go. La API es la única que habla con
OpenCode y la única que conoce las llaves. Rutas previstas (prefijo `/api`):

| Método | Ruta | Propósito |
| --- | --- | --- |
| `GET` | `/api/health` | Estado del server + del motor OpenCode |
| `GET` | `/api/models` | Modelos permitidos (de `config.json`) para el selector |
| `GET` | `/api/templates` | Catálogo de plantillas Pro disponibles |
| `POST` | `/api/jobs` | Crear job de generación `{spec, provider, model}` |
| `GET` | `/api/jobs` | Listar jobs (estado, modelo, costo) |
| `GET` | `/api/jobs/:id` | Detalle de un job (estado, site, usage) |
| `GET` | `/api/jobs/:id/events` | Progreso en vivo (SSE) durante la generación |
| `POST` | `/api/jobs/:id/cancel` | Cancelar un job en curso |
| `GET` | `/api/jobs/:id/preview/*` | Servir el sitio generado para previsualizar |
| `GET` | `/api/jobs/:id/download` | Descargar el sitio (`.zip`) |
| `GET` | `/api/jobs/:id/billing` | Factura del job (tokens, costo, precio USD/HNL) |

Reglas de la API:

- **Las llaves nunca aparecen** en requests/responses ni en `/api/health`.
- `POST /api/jobs` valida `model` contra `/api/models` antes de crear el job.
- `preview/*` y `download` validan que la ruta no escape `data/workspaces/<id>/`.
- Errores con forma estable `{ "error": { "code": "...", "message": "..." } }`.
- Respuestas y copys de error en **español**.

### Ejemplo `POST /api/jobs`

```jsonc
// request
{
  "spec": { "business_name": "Panadería La Espiga", "industry": "alimentos/retail",
            "site_type": "landing", "locale": "es-HN", "currency": "HNL",
            "brand": { "use_company_colors": false }, "pages": ["inicio","productos"] },
  "provider": "anthropic",
  "model": "claude-sonnet-4-5"
}
// response 201
{ "job": { "id": "j_abc123", "status": "queued", "created_at": "2026-06-28T..." } }
```

## Archivos de configuración

OnStudio separa **secretos** (`.env`, nunca commiteado), **config del motor**
(`opencode.json`) y **config del negocio** (`config.json`). De cada uno se versiona
solo un `*.example`.

```
onstudio/
  .env.example            # plantilla de secretos (API keys, passwords, puerto)
  .env                    # real, git-ignored, lo crea el operador
  opencode.example.json   # plantilla de config del motor OpenCode
  opencode.json           # real, git-ignored
  config.example.json     # plantilla de config OnStudio (precios, modelos, datos)
  config.json             # real, git-ignored
```

### `.env` (secretos — placeholders)

Variables previstas (la **API key es el placeholder** que el usuario completa):

```
# Llaves de proveedores (completar las que se usen). El usuario las llena.
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OPENROUTER_API_KEY=
GEMINI_API_KEY=

# Servidor OpenCode (hijo gestionado): auth básica generada por el operador.
OPENCODE_SERVER_USERNAME=onstudio
OPENCODE_SERVER_PASSWORD=

# OnStudio
ONSTUDIO_PORT=8100
OPENCODE_PORT=4096
ONSTUDIO_DATA_DIR=./data
```

> `{env:VAR}` en `opencode.json` resuelve estas variables. Nunca poner una llave
> real en ningún `*.json` ni en commits.

### `config.json` (negocio — OnStudio)

```jsonc
{
  "port": 8100,
  "data_dir": "./data",
  "engine": {
    "mode": "managed",                 // managed | external
    "opencode_bin": "opencode",        // PATH o ruta absoluta
    "opencode_url": "http://127.0.0.1:4096",
    "timeout_ms": 300000
  },
  "allowed_models": [
    { "provider": "anthropic", "model": "claude-sonnet-4-5", "label": "Claude Sonnet 4.5" },
    { "provider": "anthropic", "model": "claude-haiku-4-5",  "label": "Claude Haiku 4.5" },
    { "provider": "openai",    "model": "gpt-...",           "label": "GPT ..." }
  ],
  "pricing": {
    "currency": "USD",
    "hnl_rate": 24.6,
    "default_margin": 2.0,
    "models": [
      { "provider": "anthropic", "model": "claude-sonnet-4-5",
        "input_per_mtok": 0.0, "output_per_mtok": 0.0, "margin": 2.0 }
    ]
  },
  "templates_dir": "./templates"
}
```

- `allowed_models` alimenta `GET /api/models` y la validación del intake.
- `pricing` alimenta la facturación (ver [`token-billing.md`](token-billing.md));
  los `*_per_mtok` y `margin` son **placeholders** a completar por el usuario.
- `engine.mode` elige hijo gestionado vs servidor externo (ver `architecture.md`).

### `opencode.json` (motor)

Definido en [`opencode-integration.md`](opencode-integration.md). Carga proveedores
con `{env:VAR}`, `instructions` (AGENTS.md + skills de OnStudio), modelo por
defecto y, opcionalmente, un agente `site-builder`.

## Qué se versiona y qué no

| Archivo | ¿Commit? | Razón |
| --- | --- | --- |
| `*.example.json`, `.env.example` | ✅ | plantillas sin secretos |
| `.env`, `opencode.json`, `config.json` | ❌ | pueden contener llaves/ajustes locales |
| `data/`, `data/workspaces/`, `*.db` | ❌ | datos locales/efímeros |
| `~/.local/share/opencode/auth.json` | ❌ | credenciales del motor (fuera del repo) |

El `.gitignore` de `onstudio/` y el `.gitignore` raíz aplican estas reglas.
