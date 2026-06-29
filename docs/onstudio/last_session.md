# OnStudio — Session Handoff

> **Ephemeral continuity file.** Refresh this before hitting ~95% of the token
> budget so another model can resume with zero context loss. Delete it (and
> `PLAN.md`) when the whole OnStudio build is complete and verified.
> The authoritative checklist is `docs/onstudio/PLAN.md`.

---

## Snapshot

- **Date:** 2026-06-28
- **Branch:** `main` (do NOT commit unless the user explicitly asks; if asked,
  branch first — never commit OnStudio directly to `main`).
- **Current phase:** Phase 1 — Backend skeleton — **COMPLETE & VERIFIED (2026-06-28).**
  Phase 0 (ground prep) also complete. The Go backend now exists and runs: config +
  SQLite store + HTTP API + embedded placeholder UI, mirroring OnServe house style.
  `make test` is green and a live-socket smoke passed. **Nothing committed yet.**
  Next authorized work is Phase 2 (OpenCode engine adapter) — but wait for the user.
- **What the user asked for:** "Prepare the ground" for an AI website-builder
  product. Write docs, update `.claude` permissions, prepare skills, and all
  non-implementation scaffolding. Add *space* for an API key the user will fill
  in. Charge by tokens. User picks a model + an app spec. The AI uses the
  existing ONDIGITAL skills and clones "Pro" templates, rebranding them.

## Locked decisions (from the user)

1. **Product = OnStudio** — `onstudio/` + `docs/onstudio/`.
2. **Engine = OpenCode server API**, used multi-provider; user selects the model.
3. **Stack = Go single binary + `//go:embed` vanilla UI + SQLite** (OnStock/OnServe style).
4. Billing by tokens; API key is a user-filled placeholder; never commit secrets.

## Done so far (Phase 0 — all complete)

- **Research:** OpenCode server flags/endpoints/config/auth/usage capture; repo
  conventions (Makefile, skills format, brand/theming, ports).
- **0.1 Continuity:** `docs/onstudio/PLAN.md` (living plan) + this handoff file.
- **0.2 Docs:** `docs/onstudio/` set — `README.md`, `architecture.md`,
  `generation-pipeline.md`, `opencode-integration.md`, `token-billing.md`,
  `template-catalog.md`, `api-and-config.md`, `roadmap.md`.
- **0.3 Skill:** `skills/product/onstudio-generator/` (`SKILL.md`, `agents/openai.yaml`,
  `references/{spec-intake,template-manifest,rebrand-rules}.md`); routed in `skills/SKILL.md`.
- **0.4 Permissions:** `.claude/settings.json` (team allowlist; deny rules keep
  `.env.example` readable, block real `.env`/keys/`onstudio/data/`).
- **0.5 Scaffolding:** `onstudio/` — `README.md`, `.env.example` (empty API-key
  placeholder), `opencode.example.json`, `config.example.json`, `.gitignore`,
  `templates/MANIFEST.md` + `templates/README.md`. No app code.
- **0.6 Root:** root `.gitignore` (verified via `git check-ignore`: secrets/`data/`
  ignored, `*.example` tracked); OnStudio added to `AGENTS.md` + root `README.md`.
- **0.7 Memory:** `onstudio-product.md`, `session-handoff-convention.md`, + `MEMORY.md` pointers.
- **0.8 Close-out:** `git diff --check` clean; JSON configs valid; secret scan clean
  for OnStudio files (the only key in the repo is Credental's pre-existing Firebase
  web config in `credental/js/firebase/connection.js`, committed in `37f8a28` —
  out of scope, untouched). Nothing committed (waiting on the user).

## Phase 1 — Backend skeleton (complete, 2026-06-28)

Built under `onstudio/`, mirroring `onserve/` exactly:

- **`go.mod`/`go.sum`** — `module onstudio`, `go 1.26.4`, `modernc.org/sqlite v1.52.0`
  (+ same indirects as OnServe; `go.sum` copied from OnServe → fully offline). IDs are
  `crypto/rand` hex (no `google/uuid` import), so go.mod matches OnServe verbatim.
- **`internal/config`** (`config.go` + `config_test.go`) — `Load(path, examplePath)`:
  `config.json` → `config.example.json` → `Default()`; env overrides
  `ONSTUDIO_PORT`/`ONSTUDIO_DATA_DIR`; `AllowsModel(provider,model)`. Config is NOT
  strict-decoded (so `config.example.json`'s `_comment` field is tolerated).
- **`internal/store`** — `store.go` (Open/migrate/Close, DSN WAL+foreign_keys+busy_timeout,
  `SetMaxOpenConns(1)`, `newID(prefix)`), `models.go` (`ErrNotFound`, `Job/Site/Usage/`
  `PriceRule/Spec/Brand/NewJobInput/Billing`), `jobs.go`, `sites.go`, `usage.go`
  (sums captures), `pricing.go` (`SeedPricing` upsert), `store_test.go`. Tables exactly
  per `architecture.md`: `jobs, sites, usage, pricing`.
- **`internal/httpapi`** — `api.go` (`Router`, `securityHeaders`, `logMiddleware`,
  `writeJSON`, generic `decode[T]` with `DisallowUnknownFields` + 1 MiB limit,
  **error envelope `{"error":{"code","message"}}`** per `api-and-config.md`),
  `handlers.go` (health/models/templates/jobs CRUD/billing; `round2`), `templates.go`
  (5-entry Pro `catalog` + `pickTemplate(siteType)` with documented fallback),
  `api_test.go` (every route + **no-secret-leak** assertion on `/api/health`).
- **`main.go`** — `//go:embed web`, flags `-port`(default→config, dev uses 8100)
  `-data` `-config` `-no-open` (no-open reserved for Phase 5), seeds pricing from
  config, banner, `http.Server` with `ReadHeaderTimeout`.
- **`web/`** — placeholder SPA: `index.html`, `favicon.svg` (robot mark), `css/app.css`
  (white default theme; `[data-theme="company"]` opt-in), `js/app.js` (theme toggle
  persisted in localStorage; live-fetches health/models/templates). Full generator UI
  is Phase 5 — this is just proof-of-life.
- **`Makefile`** — `dev` (:8100, `-no-open`), `build-linux`, `build-windows`, `test`
  (`vet`+`test`+`build`), `clean`.

**Verification done:** `make test` green (config+store+httpapi pass). Live-socket smoke
(binary booted on :8137 against `config.example.json`): `/api/health` ok with NO key,
`/api/models` = 4, `/api/templates` = 5, `GET /` serves embedded index (200), `/favicon.svg`
200, all 4 security headers present, `POST /api/jobs` → 422 for disallowed model and → 201
queued job (auto-picked `template_id`) for a valid one, billing returns zeros/`captured:false`.
git-ignore re-verified (`data/`/`config.json`/`.env`/`dist/` ignored; source + `*.example`
tracked); `git diff --check` clean.

## Exact next step

**Do NOT start Phase 2 until the user asks.** When authorized, build Phase 2 — the
**OpenCode engine adapter** (`internal/engine`): start/connect `opencode serve` (managed
child by default, port 4096), create a session, send the spec prompt with the selected
`{providerID, modelID}`, stream events to update job status, and capture token usage +
cost from the assistant message `info` → `store.RecordUsage`. **Confirm exact OpenCode
JSON field names against the server's `/doc` before wiring usage/billing** (see engine
notes below). The store/usage/pricing/billing plumbing and the `opencode_session` column
already exist and are waiting. Mark each `PLAN.md` item `[x]` as you go; keep this file current.

## Key facts the next model needs (so it doesn't re-research)

### OpenCode (engine)
- Headless server: `opencode serve --port 4096 --hostname 127.0.0.1`.
  Optional basic auth via `OPENCODE_SERVER_USERNAME` / `OPENCODE_SERVER_PASSWORD`.
  OpenAPI spec served at `/doc`. CORS via `--cors <origin>` when a browser calls it.
- Core endpoints: `POST /session` (create), `POST /session/:id/message`
  (synchronous prompt → returns `{info, parts}`), plus async/event variants.
  **Verify exact field names against `/doc` at implementation time.**
- Model is chosen per prompt as `{providerID, modelID}` (e.g. provider `anthropic`,
  model `claude-sonnet-4-5`) or the `provider/model` string in config.
- Config `opencode.json`: `"model"`, `"small_model"`, `provider.<name>.options.apiKey`
  with `{env:VAR}` substitution, `"instructions": [globs]` to load `AGENTS.md` +
  skills, and `agent` definitions. Project-root config has highest precedence.
- Token usage + cost are read from the assistant message `info` after a turn.
  **Confirm the exact JSON path against `/doc` before wiring billing.**

### Repo conventions to mirror
- Go apps: no CGO, `modernc.org/sqlite`, `//go:embed web`. Makefile targets
  `dev` / `test` / `build` (see `onserve/Makefile`): `test` runs
  `go vet ./... && go test ./... && go build ./...`.
- Ports in use: OnStock `8080`, OnServe `8090`. **OnStudio → `8100`.**
  OpenCode server default `4096`.
- Spanish product copy; es-HN, HNL, RTN/DNI, +504, ISV/ISR where relevant.
- Brand: robot logo mandatory (sidebar + favicon), white/light theme DEFAULT,
  "company colors" (dark navy brand) opt-in via CSS vars + localStorage toggle.
  Brand sources: `Pagina_Web_Original/ondigital-landing-v2.html` (robot SVG,
  navy bg, blue `#2b8af7`, teal `#00e5b0`), `skills/design/design-systems/DESIGN.md`.
- Master skill `ondigital-web-generator` in `skills/SKILL.md` orchestrates sub-skills;
  register `onstudio-generator` there (Dependencias + Selección de Sub-Skill).

### Security guardrails (non-negotiable)
- API keys live server-side / in env only; never sent to the browser, never committed.
- `.env`, `auth.json`, `*.db`, and `onstudio/data/` must be git-ignored.
- localStorage/sessionStorage are demo-grade, not production security.

## Open questions for the user (not blocking ground prep)

- Real provider price table + target margin per model (Phase 4 billing config).
- Which exact templates to productize first (catalog lists candidates).
- Whether OnStudio runs `opencode serve` as a child process or connects to an
  already-running server (architecture doc presents both; default = managed child).

## In-flight edits

- None. Phase 1 is fully landed — every file listed above is complete and saved,
  `make test` is green, and the handoff doc + `PLAN.md` are in sync with reality.
  Nothing is committed (working tree only). No partial edits to resume.
