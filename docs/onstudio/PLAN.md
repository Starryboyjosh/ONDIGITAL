# OnStudio — Living Plan

> **This is a living, ephemeral working file. It is NOT permanent documentation.**

## Operating rules for any agent/model that touches this file

1. **UPDATE ON EVERY STEP.** Whenever a checklist item is completed, mark it `[x]`
   here in the same turn, and add a one-line note under "Progress log" with the
   date. Never let the plan drift from reality.
2. **EXPORT BEFORE 95% TOKENS.** When the active session reaches ~95% of its token
   budget (or you sense context is about to be truncated/compacted), STOP feature
   work and write/refresh `docs/onstudio/last_session.md` with: current state,
   decisions, what was just done, exact next step, open questions, and any
   in-flight edits. The next model resumes from that file. This is mandatory — a
   handoff without `last_session.md` is a failed handoff.
3. **DELETE WHEN COMPLETE.** When *every* phase below is done and verified, delete
   BOTH this `PLAN.md` and `docs/onstudio/last_session.md`. Their job is finished;
   the permanent record lives in the other `docs/onstudio/*.md` files, the skill,
   and the code. Do not leave a stale plan in the repo.
4. **SCOPE GUARD.** Phase 0 is *ground prep only* (docs, config placeholders,
   manifests, skills, permissions, scaffolding). Do NOT write OnStudio application
   code, app JS, or template HTML clones during Phase 0 — that is Phase 1+.
5. **NO SECRETS, EVER.** The API key is a user-filled placeholder. Never commit a
   real key, password, or token. See `onstudio/.env.example` + root `.gitignore`.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Locked decisions (do not re-litigate without the user)

- **Product name:** OnStudio · app folder `onstudio/` · docs `docs/onstudio/`.
- **Engine:** OpenCode server API (opencode.ai), used as a **multi-provider**
  generation backend. The user selects the model per job.
- **Stack:** Go single binary + `//go:embed` vanilla web UI + SQLite
  (OnStock / OnServe house style). No Node, no build step, no CGO.
- **Billing:** charge by tokens consumed per generation job (provider cost basis +
  configurable margin). Cost basis comes from the model registry, not hardcoded.
- **Templates:** high-quality "Pro" base apps that the AI clones and rebrands to a
  new business. Catalogued from the existing ONDIGITAL products.
- **API key:** placeholder only — the user supplies it later via env / `.env`.

---

## Phase 0 — Ground prep (THIS scope; no implementation)

### 0.1 Session continuity
- [x] `docs/onstudio/PLAN.md` (this file)
- [x] `docs/onstudio/last_session.md` (handoff/continuity doc, kept current)

### 0.2 Documentation (`docs/onstudio/`)
- [x] `README.md` — product overview, scope, status, how the pieces fit
- [x] `architecture.md` — Go + embed + SQLite + OpenCode topology, data model
- [x] `generation-pipeline.md` — spec intake → template pick → rebrand → emit → bill
- [x] `opencode-integration.md` — server, endpoints, config, model selection, auth
- [x] `token-billing.md` — usage capture, cost basis, margin, pricing config
- [x] `template-catalog.md` — Pro templates mapped to source products
- [x] `api-and-config.md` — OnStudio HTTP API surface + config file contract
- [x] `roadmap.md` — phased delivery after ground prep

### 0.3 Skill
- [x] `skills/product/onstudio-generator/SKILL.md`
- [x] `skills/product/onstudio-generator/references/spec-intake.md`
- [x] `skills/product/onstudio-generator/references/template-manifest.md`
- [x] `skills/product/onstudio-generator/references/rebrand-rules.md`
- [x] `skills/product/onstudio-generator/agents/openai.yaml`
- [x] Register OnStudio in `skills/SKILL.md` (Dependencias + Selección de Sub-Skill)

### 0.4 Permissions
- [x] `.claude/settings.json` (committed, team-shared OnStudio dev allowlist)

### 0.5 Scaffolding (`onstudio/`, config/manifests only — no app code)
- [x] `onstudio/README.md` (scaffold-only notice + how it will run)
- [x] `onstudio/.env.example` (the API-key placeholder + ports/passwords)
- [x] `onstudio/opencode.example.json` (providers via `{env:...}`, instructions, model)
- [x] `onstudio/config.example.json` (OnStudio pricing/margin/models/data dir)
- [x] `onstudio/.gitignore`
- [x] `onstudio/templates/MANIFEST.md` (+ `onstudio/templates/README.md`)

### 0.6 Root protection + registration
- [x] root `.gitignore` (protect `**/.env`, `**/auth.json`, secrets, `onstudio/data/`)
- [x] `AGENTS.md` — add OnStudio to Project Snapshot + engine/no-secrets note
- [x] `README.md` — add OnStudio to Proyectos list

### 0.7 Memory
- [x] memory `onstudio-product.md` (product + locked decisions)
- [x] memory `session-handoff-convention.md` (PLAN/last_session/token-export rule)
- [x] `MEMORY.md` pointers for both

### 0.8 Close-out
- [x] `git diff --check` clean on all new/edited Markdown
- [x] Confirm no real secret is present anywhere (`git diff` + grep for keys)
- [x] Report to user; do NOT commit unless the user asks

---

## Phase 1 — Backend skeleton (DONE)

- [x] `onstudio/go.mod` (`module onstudio`, go 1.26.4) + `go.sum` (reused OnServe's
      pinned `modernc.org/sqlite v1.52.0` deps — fully offline build)
- [x] `internal/config` — `config.json` → `config.example.json` → defaults; env
      overrides (`ONSTUDIO_PORT`/`ONSTUDIO_DATA_DIR`); `AllowsModel`; no secrets
- [x] `internal/store` — SQLite (`jobs`, `sites`, `usage`, `pricing`), WAL +
      `SetMaxOpenConns(1)`, `ErrNotFound`, lifecycle/usage/pricing methods
- [x] `internal/httpapi` — `Router`, security headers, `{error:{code,message}}`
      envelope, Spanish errors. Routes: `GET /api/health` (no keys), `/api/models`,
      `/api/templates`, `GET|POST /api/jobs`, `/api/jobs/{id}`, `/api/jobs/{id}/billing`
- [x] `main.go` — `//go:embed web`, flags `-port`(8100)/`-data`/`-config`/`-no-open`,
      price seeding from config, banner, serve
- [x] `web/` placeholder SPA — white-default theme + robot mark + company-colors
      opt-in toggle (brand convention); live health/models/templates panels
- [x] `Makefile` (`dev` :8100, `build-linux/windows`, `test`, `clean`)
- [x] Tests: `store_test.go`, `config_test.go` (parses shipped example), `api_test.go`
      (every route + no-secret-leak assertion)
- [x] Verified: `make test` green (vet+test+build) **and** live-socket smoke
      (boot binary → health/models/templates/jobs/billing/index/favicon/security
      headers all correct; POST rejects disallowed model 422; no key in `/api/health`)
- [x] git hygiene confirmed: `data/`, `config.json`, `.env`, `dist/` ignored;
      source + `*.example` tracked; `git diff --check` clean
- [x] POST /api/jobs persists a **queued** job only (no generation — engine is Phase 2)

## Phase 2 — OpenCode engine adapter (DONE)

> Authorized by the user (2026-06-28). Scope: a standalone `internal/engine`
> package. Does NOT wire job execution into POST /api/jobs — that is Phase 3.
> Verified the real OpenCode contract against the SDK `types.gen.ts`:
> `POST /session`→`{id}`; `POST /session/:id/message` body
> `{ model:{providerID,modelID}, agent?, parts:[{type:"text",text}] }`;
> response `{ info, parts }` where `info.tokens.{input,output,reasoning,`
> `cache.{read,write}}` + `info.cost`; OpenAPI at `/doc`; Basic Auth via
> `OPENCODE_SERVER_USERNAME`/`OPENCODE_SERVER_PASSWORD`.

- [x] `internal/engine/types.go` — JSON structs matching the OpenCode SDK
      (request: model/parts; response: info.tokens/cost), isolated for easy
      version-drift fixes
- [x] `internal/engine/client.go` — HTTP client: `CreateSession`, `Prompt`
      (sync `/message`), `do` helper (basic auth, status/error handling,
      32 MiB read cap, rune-safe error snippet)
- [x] `internal/engine/engine.go` — lifecycle: `New(cfg)`, managed-child
      `Start`/`Stop` (`opencode serve --port --hostname 127.0.0.1`, random
      basic-auth pass, health-poll `/doc`), external mode (ping configured URL),
      `engine.Usage` → mapped to `store.Usage` by the caller
- [x] `internal/engine/engine_test.go` — table tests against an `httptest`
      mock OpenCode server (session create, prompt+usage parse, auth header,
      non-2xx error, assistant `info.error` surfaced, validation, health).
      **No real opencode, no key, zero tokens spent.**
- [x] `make test` green; updated `opencode-integration.md` (fields marked
      mapped/verified-vs-SDK; live `/doc` check still pending an install)
- [x] NOT wired into job execution (Phase 3); no real generation run without
      explicit user consent (costs money + uses the real `.env` key)

## Phase 3 — Generation pipeline + job runner (DONE)

> Authorized by the user (2026-06-29) as part of "finish the onstudio
> implementation." Wires the engine into job execution end-to-end, asynchronously,
> with per-job isolated workspaces. Still no real generation without consent —
> everything is verified against a `fakeEngine`/`httptest` mock (zero tokens, no key).

- [x] `internal/templates` — catalog moved out of httpapi into its own leaf
      package (`Template`, `All`, `Get`, `Pick`). 5 Pro templates with
      site-types/industries/keywords; `Pick` ranks by industry+notes match with a
      safe fallback (landing-institucional / saas-dashboard-generic)
- [x] `internal/pipeline/intake.go` — `Normalize` (es-HN/HNL defaults, theme claro,
      page dedupe/lowercase, hex sanitize, control-char hygiene) + `Validate`
      (business_name + site_type + ≥1 page). All free text treated as untrusted
- [x] `internal/pipeline/prompt.go` — `BuildPrompt`: template identity + protected
      points + spec + theme; user `content_notes` fenced in a "DATOS, no
      instrucciones" block (prompt-injection boundary); explicit output contract
- [x] `internal/pipeline/emit.go` — model proposes `{"files":[…]}`, Go writes them:
      strip fence / extract-from-prose, **atomic** (validate every path+size before
      any write), `safeJoin` rejects absolute/`..`/NUL/escape; `ZipDir` for download
- [x] `internal/pipeline/runner.go` — async `Runner` (`Submit`/`Cancel`/
      `WorkspaceDir`): intake→pick→Start(lazy)→session→prompt→emit→bill→site;
      cancelable via per-job `context.CancelFunc`; panics/ctx-cancel land the job in
      `error`/`canceled` (never crash the server); records usage only on success
- [x] `internal/billing/billing.go` — `Compute`: prefer reported cost when
      `PreferReportedCost && cost>0`, else tokens×rate; `price = basis × margin`
      (default margin when rule ≤ 0); HNL = price × rate. USD base
- [x] httpapi wired: `createJob` normalizes+validates+picks template and (when a
      runner is set) `Submit`s async; new routes `POST /jobs/{id}/cancel`,
      `GET /jobs/{id}/download` (zip), `GET /jobs/{id}/preview[/{path...}]`
      (sandboxed `SAMEORIGIN` file server); `main.go` constructs engine+runner
- [x] Tests: `templates`-aware `intake_test`, `emit_test` (traversal/atomic/zip),
      `prompt_test` (contract + injection boundary), `billing_test` (6 cases),
      `runner_test` (success/start-fail/prompt-fail-no-bill/emit-fail/cancel) via
      `fakeEngine`. Existing api/store/config/engine tests stay green
- [x] `make test` green (vet + test + build). Nothing committed (awaiting user)

## Phase 4 — Billing polish (DONE)

- [x] `internal/billing/billing.go` compute engine (landed with Phase 3): prefer
      reported cost when available, else tokens×rate; `price = basis × margin`;
      HNL = price × rate. 6 table tests
- [x] `getBilling` enriched: USD + HNL, provider cost, margin, captured flag,
      rounded; zeros + `captured:false` until usage exists
- [x] `internal/httpapi/handlers_billing_test.go` — handler tests
      (`TestGetBillingEnrichedAfterUsage`, `TestGetBillingMarginFallsBackToDefault`)
- [x] UI surface confirmed in the SPA (billing panel shows USD/HNL per job)

## Phase 5 — Web UI SPA (DONE)

- [x] `web/index.html` + `web/js/app.js` + `web/css/app.css` (~850 lines):
      embedded vanilla SPA — model picker, spec form, job list, live progress
      polling, preview iframe, download, billing USD/HNL
- [x] Brand convention: robot logo + white-default theme + company-colors opt-in
      toggle (`localStorage`), `--robot-*` variables
- [x] Spanish copy, es-HN; talks only to the API (no keys in the browser)

## Phase 6 — Template productization (DONE)

> Authorized as part of "Completa onstudio". Productized the two static-HTML house
> bases and wired embedded loading. Go-app templates stay catalog-only **by design**
> (the pipeline emits/serves static files).

- [x] `internal/templates` gains `fs.FS` loading: `LoadFS(fsys)`/`Load(dir)`/
      `Reset()`; `readTemplate` (DisallowUnknownFields, id-match, entry-exists),
      `readDirFiles` (skips manifest+hidden, per-file/total/count limits). Valid
      manifest → `Productized=true` + `Files`; invalid → graceful catalog fallback
- [x] `main.go` — `//go:embed templates` + `fs.Sub` + `LoadFS`; logs
      `Plantillas productizadas: N`; `version = 0.6.0-phase6`
- [x] `pipeline/prompt.go` — `writeBaseFiles` feeds the productized base code to the
      model ("clónalo y rebrandéalo"), fenced by language
- [x] `onstudio/templates/landing-institucional/` (5 files) +
      `onstudio/templates/saas-dashboard-generic/` (5 files, static prototype):
      accessible, responsive, robot + theme toggle, `{{placeholders}}`, no secrets
- [x] Tests: `templates_test.go` (9 incl. `TestShippedTemplatesLoad`),
      `prompt_test.go` base-files test. `make test` green
- [x] Docs: `templates/MANIFEST.md`, `templates/README.md`,
      `docs/onstudio/template-catalog.md` updated (productized flags + catalog-only
      rationale)

## Phase 7 — Verification & review (DONE)

- [x] `make test` green (vet + test + build); all packages pass
- [x] Live-socket smoke (binary `-no-open -port 8137 -data <tmp>`, opencode ABSENT):
      boot logs `Plantillas productizadas: 2`; `/api/health` 200 + 5 security
      headers + no key leak; `/api/models` (4, no keys); `/api/templates`
      (`productized:true` for the 2 static bases, `false` for the 3 Go templates);
      jobs list/create/get/billing/cancel/preview/download all correct; POST
      rejections 422/400/400; **safe-error path** (job → `error`, server stays
      alive, billing `captured:false`); traversal (raw+encoded) → 404 no leak;
      static SPA + favicon served; secret scan clean; `.env` git-ignored
- [ ] *(optional)* `/codex:adversarial-review` on billing + key handling + tenant
      isolation — deferred; not auto-spawned (CLAUDE.md: keep review-gate off unless
      monitored). Run on demand before a production cutover.

---

## Progress log

- 2026-06-28 — Phase 0 kickoff. Discovery/research complete (OpenCode API surface,
  repo conventions, Makefile/skill/theming patterns). Creating ground-prep
  artifacts now. No implementation code in this phase.
- 2026-06-28 — 0.1–0.4 done (continuity docs, 8 design docs, skill + references +
  agent, skills/SKILL.md routing, `.claude/settings.json` allowlist with fixed
  `.env.example`-readable deny rules).
- 2026-06-28 — 0.5 done. `onstudio/` scaffolding complete: README, `.env.example`
  (empty API-key placeholder), `opencode.example.json`, `config.example.json`,
  `.gitignore`, `templates/MANIFEST.md` + `templates/README.md`. No app code.
  Next: 0.6 (root `.gitignore`, register OnStudio in AGENTS.md + root README.md).
- 2026-06-28 — 0.6 done. Root `.gitignore` created and verified with
  `git check-ignore`: secrets/`data/` ignored, all `*.example` stay tracked.
  OnStudio registered in `AGENTS.md` (snapshot + scaffold/no-secrets note) and
  root `README.md` (Proyectos). Next: 0.7 (memory files + MEMORY.md pointers).
- 2026-06-28 — 0.7 done. Memory files `onstudio-product.md` (project) and
  `session-handoff-convention.md` (feedback) created with cross-links, plus two
  `MEMORY.md` pointers. Next: 0.8 close-out (diff --check, secret scan, report).
- 2026-06-28 — 0.8 done. `git diff --check` clean; `.claude/settings.json` +
  both `onstudio/*.example.json` are valid JSON; `.env.example` provider keys
  confirmed empty; secret scan across the repo found only Credental's pre-existing
  Firebase web key (`37f8a28`, out of scope, untouched) — none in OnStudio files.
  Nothing committed (per scope — awaiting user). **Phase 0 COMPLETE.** PLAN.md and
  last_session.md are retained because Phase 1+ (implementation) is still pending;
  delete both only when the whole build is done.
- 2026-06-28 — **Phase 1 COMPLETE.** Backend skeleton built mirroring OnServe house
  style: `go.mod`/`go.sum` (offline, reused sqlite deps), `internal/config` +
  `internal/store` (jobs/sites/usage/pricing, WAL, single writer) + `internal/httpapi`
  (health/models/templates/jobs/billing, `{error:{code,message}}` envelope, Spanish),
  `main.go` (`//go:embed web`, :8100), branded `web/` placeholder (white default +
  company-colors opt-in), `Makefile`, and 3 test files. `make test` green; live-socket
  smoke passed (every route, embed serving, security headers, 422 on disallowed model,
  zero secret leakage in `/api/health`). git-ignore verified. Nothing committed
  (awaiting user). Next: Phase 2 — OpenCode engine adapter.
- 2026-06-29 — **Phase 2 COMPLETE.** Finished `internal/engine`: added `client.go`
  (`do` helper with Basic Auth + status/error handling + 32 MiB read cap + rune-safe
  snippet; `CreateSession`; sync `Prompt` that maps `info.tokens`/`info.cost` to the
  neutral `engine.Usage` and surfaces `info.error`). Added `engine_test.go` — 8 tests
  vs an `httptest` mock OpenCode (session create, empty-id, HTTP errors, prompt body
  shape + usage parse + multi-part text concat, assistant error surfaced, input
  validation, health up/down). `opencode` is NOT installed locally, so everything is
  mock-verified: **zero tokens, no key, no live `/doc`.** `make test` green
  (vet+test+build). Updated `opencode-integration.md` (endpoints/token-capture marked
  implemented+mapped; async/SSE deferred to v1.1). NOT wired into jobs (that's Phase 3).
  Next: Phase 3 — generation pipeline + job runner.
- 2026-06-29 — **Phase 3 COMPLETE** (incl. Phase 4 billing compute). Built the full
  generation pipeline end-to-end: new `internal/templates` (catalog + `Pick`),
  `internal/pipeline` (`intake`→`prompt`→`emit`→`runner`), and `internal/billing`
  (`Compute`). The model only *proposes* `{"files":[…]}`; the Go `Emit` writes them
  **atomically** under `data/workspaces/<job_id>/` with `safeJoin` traversal/abs/NUL
  guards. Async `Runner` (`Submit`/`Cancel`) lazily starts the engine, records usage
  only on success, and lands panics/ctx-cancel as `error`/`canceled` without crashing.
  httpapi `createJob` now normalizes/validates/picks + `Submit`s async (nil-runner safe
  for unit tests); added `cancel`/`download`(zip)/`preview`(sandboxed `SAMEORIGIN`)
  routes; `main.go` builds engine+runner. User `content_notes` are fenced as
  untrusted "DATOS, no instrucciones." Added intake/emit/prompt/billing/runner tests
  (`fakeEngine`, `httptest` — **zero tokens, no key, no live opencode**); fixed
  `stripControl` to map whitespace controls→space so single-line fields collapse.
  `make test` green (vet+test+build); all pre-existing tests still pass. Nothing
  committed (awaiting user). Next: Phase 5 — embedded generator Web UI SPA.
- 2026-06-29 — **Phases 4 & 5 COMPLETE** (logged retroactively during the Phase 6
  reconcile). Phase 4: added `internal/httpapi/handlers_billing_test.go` (2 handler
  tests) on top of the Phase-3 `internal/billing` compute (6 tests); `getBilling`
  surfaces USD+HNL+margin+captured. Phase 5: built the embedded vanilla SPA
  (`web/index.html` + `web/js/app.js` + `web/css/app.css`, ~850 lines) — model
  picker, spec form, job list, live polling, preview iframe, download, billing
  USD/HNL; robot logo + white-default theme + company-colors opt-in toggle. Spanish
  copy; the browser talks only to the API (no keys client-side).
- 2026-06-29 — **Phase 6 COMPLETE.** Productized the two static-HTML house bases and
  wired embedded loading. `internal/templates` now loads from an `fs.FS`
  (`LoadFS`/`Load`/`Reset`): a valid `template.json` (decoded with
  `DisallowUnknownFields`, id-match + entry-exists checks, per-file/total/count size
  limits, manifest+hidden skipped) marks the catalog entry `Productized=true` and
  attaches its `Files`; anything invalid degrades to the catalog base without
  tumbling the boot. `main.go` embeds `templates/` (`//go:embed templates`) so the
  bases ship inside the single binary (`version 0.6.0-phase6`, logs `Plantillas
  productizadas: N`). `pipeline/prompt.go` feeds that base code to the model
  ("clónalo y rebrandéalo"). Added `onstudio/templates/landing-institucional/` (5
  files, flagship) + `onstudio/templates/saas-dashboard-generic/` (5 files, static
  **prototype** demo). **Decision:** Go-app templates (`dental-saas`,
  `pos-inventory-erp`, `restaurant-ops`) stay **catalog-only by design** — the
  pipeline emits/serves static files. Tests: `templates_test.go` (9 incl.
  `TestShippedTemplatesLoad`) + `prompt_test.go` base-files case (fixed one off-by-one
  assertion: the manifest is not a base file → 2 files, not 3). Updated MANIFEST.md,
  templates/README.md, and template-catalog.md. `make test` green.
- 2026-06-29 — **Phase 7 COMPLETE.** `make test` green (vet+test+build). Live-socket
  smoke against the real binary (`-no-open -port 8137 -data <tmp>`, **opencode not
  installed** on purpose): boot logged `Plantillas productizadas: 2`; `/api/health`
  200 with all 5 security headers and no key leak; `/api/models` (4, no keys);
  `/api/templates` shows `productized:true` for the two static bases and `false` for
  the three Go templates; full job lifecycle (list/create/get/billing/cancel/
  preview/download) correct; POST rejections 422 (model)/400 (spec)/400 (unknown
  field); **safe-error path verified** — a submitted job lands in `error` with a
  clear Spanish message, the server stays alive, and billing stays `captured:false`
  (no spurious charge); path traversal (raw + URL-encoded) → 404 with no `/etc/passwd`
  leak; static SPA + favicon served, unknown path 404; secret scan clean (the only
  "secret" hit was the literal word *"secretos"* in template protected-rule copy);
  `.env` git-ignored, no secret files tracked. Optional `/codex:adversarial-review`
  deferred (not auto-spawned per CLAUDE.md). **OnStudio build is feature-complete and
  verified.** Committing now (user authorized commits this session).
