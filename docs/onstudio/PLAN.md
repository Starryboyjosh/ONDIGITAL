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

## Phase 2+ — Implementation (FUTURE — out of current scope)

> Do not start these until the user asks. Listed so the next model sees the arc.

- **Phase 2 — OpenCode engine adapter:** start/connect `opencode serve`, create
  session, send prompt with selected `provider/model`, stream events, capture
  token usage + cost from the assistant message.
- **Phase 3 — Generation pipeline:** spec intake form → template selection →
  rebrand transform → write generated site to a per-job workspace → zip/preview.
- **Phase 4 — Billing:** turn captured tokens into a priced invoice line
  (cost basis × margin), persist, expose in UI; HNL display, es-HN.
- **Phase 5 — Web UI:** embedded vanilla SPA (model picker, spec form, job list,
  live progress, preview, download, billing). Robot logo + white-default theme +
  company-colors opt-in per brand convention.
- **Phase 6 — Template productization:** extract real Pro templates into
  `onstudio/templates/<id>/` from the catalogued source products.
- **Phase 7 — Verification & review:** `make test`, static smoke test,
  `/codex:adversarial-review` on billing + key handling + tenant isolation.

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
