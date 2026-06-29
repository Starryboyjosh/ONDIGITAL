# OnStudio — Roadmap

> Entrega por fases. **Phase 0** (preparación del terreno) es el alcance actual.
> Las fases siguientes son la guía de implementación; no se empiezan hasta que el
> usuario lo pida. El estado operativo vivo está en [`PLAN.md`](PLAN.md).

## Phase 0 — Preparación del terreno ✅ (alcance actual)

Documentación, contratos de configuración, manifests, skill, permisos y andamiaje.
**Sin código de aplicación.** Entregables:

- `docs/onstudio/` completo (este set).
- Skill `skills/product/onstudio-generator/` + registro en `skills/SKILL.md`.
- `.claude/settings.json` con allowlist de desarrollo de OnStudio.
- `onstudio/` con `README`, `.env.example`, `opencode.example.json`,
  `config.example.json`, `.gitignore`, `templates/MANIFEST.md`.
- `.gitignore` raíz + registro en `AGENTS.md` y `README.md`.

## Phase 1 — Esqueleto backend

- `onstudio/main.go`: HTTP server, `//go:embed web`, arranque/health.
- `internal/store`: SQLite (`modernc.org/sqlite`), migraciones, tablas `jobs`,
  `sites`, `usage`, `pricing`, `models`.
- `Makefile` (`dev`/`test`/`build`, estilo OnServe), corre en `:8100`.
- **Verificación:** `make test` (`go vet && go test && go build`).

## Phase 2 — Adaptador OpenCode

- `internal/engine`: lanzar/conectar `opencode serve`, crear sesión, enviar prompt
  con `provider/model`, recibir `{info, parts}`.
- Captura de tokens/costo del mensaje del asistente → `usage` (**verificar campos
  contra `/doc`**).
- Healthcheck del motor; modo `managed` vs `external`.

## Phase 3 — Pipeline de generación

- `internal/pipeline`: `intake` → `template` → `rebrand` → `emit`.
- Workspace por job, validación anti path-traversal, `.zip` + preview.
- Pruebas de selección de plantilla y aislamiento de workspace.

## Phase 4 — Facturación

- Cálculo `provider_cost × margin` con costo reportado o tarifa del registro.
- Presentación USD + HNL; factura por job en la UI.
- Cerrar políticas con el usuario: tarifas/margen reales, tipo de cambio,
  consumo parcial, mínimo de cobro, comprobante fiscal.

## Phase 5 — UI web embebida

- SPA vanilla en `web/`: selector de modelo, formulario de spec, lista de jobs,
  progreso en vivo (SSE), preview, descarga, factura.
- Marca: robot logo (sidebar + favicon), **tema claro por defecto**, company-colors
  opt-in (toggle + localStorage), copys en español.
- Smoke test desktop + móvil.

## Phase 6 — Productización de plantillas

- Extraer plantillas reales a `onstudio/templates/<id>/` desde los productos
  fuente (ver [`template-catalog.md`](template-catalog.md)), limpias y sin datos.
- `template.json` por plantilla (contrato en el skill).

## Phase 7 — Verificación y revisión

- `make test`, smoke test UI, prueba end-to-end con un modelo barato.
- `/codex:adversarial-review --base main` enfocado en: manejo de llaves,
  exactitud de facturación, aislamiento por job, path traversal en preview/download.
- Solo entonces considerar exponerlo más allá de uso local controlado.

## Cierre del proyecto

Cuando todas las fases estén hechas y verificadas: **borrar `PLAN.md` y
`last_session.md`** (su función termina). El registro permanente queda en este
`docs/onstudio/`, el skill y el código.

## Riesgos a vigilar

- **Llaves expuestas:** la regla de "solo server-side" debe sostenerse en cada fase.
- **Exactitud de facturación:** un error aquí cobra de más/menos; revisarlo con cuidado.
- **Cambios de API de OpenCode:** anclar contra `/doc` de la versión instalada.
- **Degradación de plantillas:** el rebrand no debe romper la calidad del código Pro.
- **Datos sensibles inventados:** no fabricar RTN, precios legales ni claims.
