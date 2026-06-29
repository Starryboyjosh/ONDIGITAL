# OnStudio

**OnStudio** genera sitios web de alta calidad para empresas con IA: el usuario
elige un modelo, describe su negocio, y OnStudio clona una **plantilla Pro** de
ONDIGITAL, la rebrandea y la entrega. El cobro es **por tokens** consumidos. El
motor es **OpenCode** (multi-proveedor).

> ## ⚠️ Andamiaje (Phase 0) — todavía NO hay aplicación
>
> Esta carpeta contiene, por ahora, **solo configuración de ejemplo y
> manifests**. No hay `main.go`, ni JS de la app, ni plantillas reales. La
> implementación es Phase 1+ (ver `docs/onstudio/roadmap.md`). El plan vivo está
> en `docs/onstudio/PLAN.md`.

## Documentación

Toda la documentación del producto vive en **`docs/onstudio/`**:

- `README.md` — visión general
- `architecture.md` — Go + embed + SQLite + OpenCode, modelo de datos
- `generation-pipeline.md` — intake → plantilla → rebrand → emisión → cobro
- `opencode-integration.md` — servidor, endpoints, config, modelos, auth
- `token-billing.md` — captura de tokens, costo, margen, precios
- `template-catalog.md` — plantillas Pro y sus fuentes
- `api-and-config.md` — API HTTP de OnStudio + contrato de configuración
- `roadmap.md` — fases de entrega

El skill orquestador está en `skills/product/onstudio-generator/`.

## Archivos de este andamiaje

| Archivo | Qué es | ¿Commit? |
| --- | --- | --- |
| `README.md` | este aviso | ✅ |
| `.env.example` | **placeholder de la API key** + puertos/credenciales | ✅ |
| `opencode.example.json` | config de ejemplo del motor OpenCode | ✅ |
| `config.example.json` | config de ejemplo de OnStudio (precios, modelos) | ✅ |
| `.gitignore` | protege `.env`, configs reales, `data/`, `*.db` | ✅ |
| `templates/MANIFEST.md` | índice (de diseño) de plantillas Pro | ✅ |
| `.env`, `opencode.json`, `config.json` | reales, los crea el operador | ❌ |
| `data/` | SQLite + workspaces por job | ❌ |

## Puesta en marcha prevista (cuando exista la app)

```bash
cd onstudio
cp .env.example .env                 # ← el usuario completa aquí su API key
cp opencode.example.json opencode.json
cp config.example.json config.json
make dev                             # servirá en http://localhost:8100 (previsto)
```

> **La API key es un placeholder.** El usuario la completa en `.env`. Nunca se
> commitea una llave real (lo impide el `.gitignore` de esta carpeta y el raíz).

## Convenciones (heredadas del repo)

- Go un binario, sin CGO, `modernc.org/sqlite`, UI vanilla embebida (`//go:embed web`).
- Makefile `dev` / `test` / `build` (estilo OnServe). Verificación: `make test`.
- Copys de producto en español; es-HN/HNL/RTN/+504 cuando aplique.
- Marca: robot logo, **tema claro por defecto**, company-colors opt-in.
- Puerto OnStudio: **8100**. Servidor OpenCode: **4096**.
