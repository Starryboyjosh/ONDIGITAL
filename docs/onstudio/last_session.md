# OnStudio — Session Handoff

> **Ephemeral continuity file.** Refresh this before hitting ~95% of the token
> budget so another model can resume with zero context loss. Delete it (and
> `PLAN.md`) when the whole OnStudio build is closed out by the user.
> The authoritative checklist is `docs/onstudio/PLAN.md`.

---

## Snapshot

- **Date:** 2026-06-29
- **Branch:** committed on a feature branch off `main` (never commit OnStudio
  directly to `main` — repo convention). See the latest `feat(onstudio)` commit.
- **Current phase:** **Phases 0–7 COMPLETE & VERIFIED.** OnStudio is
  **feature-complete**: config + SQLite store + HTTP API + OpenCode engine
  adapter + generation pipeline + token billing + productized embedded templates
  + full generator web UI. `make test` is green (vet + 7 packages + build) and a
  full live-socket smoke passed (see PLAN.md progress log, 2026-06-29).
- **What the user asked for (this session):** "Completa onstudio" — finish the
  build, following `docs/onstudio/PLAN.md`; on each milestone refresh this handoff
  file + summarize; before ~95% tokens, write a general summary and **commit**
  (commits authorized this session).

## Locked decisions (from the user)

1. **Product = OnStudio** — `onstudio/` + `docs/onstudio/`.
2. **Engine = OpenCode server API**, used multi-provider; user selects the model.
3. **Stack = Go single binary + `//go:embed` vanilla UI + SQLite** (OnStock/OnServe style).
4. Billing by tokens; API key is a user-filled placeholder; **never commit secrets**.
5. **Single binary embeds BOTH** the web UI (`//go:embed web`) **and** the
   `templates/` tree (`//go:embed templates`).
6. **Productization scope (Phase 6, reaffirmed):** only **static-HTML** templates
   productize — the pipeline emits/serves static files, so only static bases are
   clonable today. The three **go-embed-sqlite** templates (`dental-saas`,
   `pos-inventory-erp`, `restaurant-ops`) stay **catalog-only by design**
   (brand/module reference, not clone material). Materializing a generable Go app
   is future work (pipeline would have to emit + run Go projects).

## What's built (by package)

- **`internal/config`** — `Load` (config.json → example → Default), env overrides,
  `AllowsModel(provider,model)`. Non-strict decode (tolerates `_comment`).
- **`internal/store`** — SQLite (WAL, FK on, `SetMaxOpenConns(1)`); tables
  `jobs, sites, usage, pricing`; `Job/Site/Usage/PriceRule/Spec/Brand/NewJobInput/Billing`;
  usage sums captures; `SeedPricing` upsert. `models.go` extended this session.
- **`internal/engine`** — OpenCode adapter: lazily starts `opencode serve` (managed
  child), creates a session, sends the spec prompt with `{providerID, modelID}`,
  captures token usage + cost → `store.RecordUsage`. **Safe-fail:** if the
  `opencode` binary is absent, the job lands in `error` and the server stays up.
- **`internal/pipeline`** — intake → template `Pick` → prompt build → engine run →
  write/serve emitted static `files`. Feeds the productized base to the model to
  "clone & rebrand."
- **`internal/templates`** — `LoadFS`/`Load`/`Get`/`Pick`/`Reset`. Validates each
  `template.json` with `DisallowUnknownFields`, requires `entry` to exist, enforces
  limits (`maxTemplateFiles=40`, `maxTemplateFileBytes=256<<10`,
  `maxTemplateTotalBytes=1<<20`), skips hidden files + the manifest from `Files`.
  Invalid/missing manifest → graceful fallback to the catalog base (no boot crash).
- **`internal/httpapi`** — Router + `securityHeaders` (4 headers) + `writeJSON`/
  error envelope `{"error":{"code","message"}}` + generic `decode[T]`
  (`DisallowUnknownFields` + 1 MiB). Routes: health, models, templates, jobs CRUD,
  `jobs/{id}/billing`, `jobs/{id}/cancel`, `jobs/{id}/download`,
  `jobs/{id}/preview[/path...]`. (Old `httpapi/templates.go` removed — logic moved
  to `internal/templates`.) `handlers_billing_test.go` added this session.
- **`main.go`** (`version = "0.6.0-phase6"`) — embeds `web` + `templates`; on boot
  `fs.Sub`+`templates.LoadFS`, logs `Plantillas productizadas: N`; flags
  `-port/-data/-config/-no-open`. Default port 8100.
- **`web/`** — full generator SPA: index.html + app.js + app.css (job submit,
  model/template pickers, spec form, billing panel, status polling, preview/
  download, theme toggle). Robot mark + white default theme + company-colors opt-in.
- **`templates/`** — two productized static bases embedded:
  `landing-institucional/` and `saas-dashboard-generic/` (each with `template.json`,
  clean, no secrets). `dental-saas`/`pos-inventory-erp`/`restaurant-ops` =
  catalog-only by design.

## What was just done (this session)

- **Phase 6 — productization:** built `internal/templates`, defined the
  `template.json` contract (only: `id,name,source,stack,site_type,entry,
  rebrand_points,protected,notes,match{industries,keywords}`), created the two
  productized static templates, wired `//go:embed templates` + boot loading.
  Fixed an off-by-one **test assertion** in `templates_test.go` (manifest is
  excluded from `Files`, so a 3-entry fixture yields 2 base files, not 3 — the
  implementation was correct).
- **Phase 7 — verify:** `make test` green; full live smoke (boot logs
  `productizadas: 2`; `/api/templates` shows correct `productized` flags;
  job-with-no-opencode → `error` + server alive + billing `captured:false`/zeros;
  path-traversal `../../etc/passwd` & `..%2f` → 404; cancel-after-final → 409;
  SPA/`favicon.svg` 200, unknown static → 404).
- **Docs reconciled to reality:** `PLAN.md` (Phases 4–7 marked DONE + 4 dated
  progress-log entries), `templates/MANIFEST.md`, `templates/README.md`,
  `docs/onstudio/template-catalog.md` (productization status + decision recorded).
- **This handoff refreshed; committing the Phase 2–7 delta** (the Phase 0–1
  ground-prep + skeleton was already committed in `430d0d5`).

## Exact next step

- **Build is feature-complete.** No required work remains.
- **Optional, deferred:** `/codex:adversarial-review --base main --background`
  on billing + key handling + tenant isolation. **Do NOT auto-spawn** it
  (CLAUDE.md: keep the review-gate disabled unless actively monitored; don't spawn
  agents unless the user asks).
- **Close-out:** when the user confirms OnStudio is done, delete `PLAN.md` and this
  file per the session-handoff convention.

## Open questions for the user (not blocking)

- Real provider price table + target margin per model (billing config currently
  uses seeded/default rules).
- Whether to later productize a **Go-app** template (needs the pipeline to emit +
  run Go projects, not just static files) — today those three are catalog-only.
- Managed-child vs. external `opencode serve` (default = managed child on 4096).

## Security guardrails (non-negotiable)

- API keys live server-side / in env only; never sent to the browser, never
  committed. Key is a user-filled placeholder in `onstudio/.env` (git-ignored),
  resolved into `opencode.json` via `{env:VAR}`.
- `.env`, `auth.json`, `*.db`, `onstudio/data/`, `config.json` stay git-ignored
  (verified: none tracked).
- localStorage/sessionStorage are demo-grade, not production security.

## In-flight edits

- None. Every file listed above is complete and saved, `make test` is green, and
  `PLAN.md` + this handoff are in sync with reality. The Phase 2–7 delta is being
  committed now.
