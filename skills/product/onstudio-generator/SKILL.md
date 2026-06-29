---
name: onstudio-generator
description: Generate high-quality enterprise websites for OnStudio by taking a business spec plus a user-selected model, picking an ONDIGITAL Pro template, rebranding it to the new business, emitting the site, and billing by token usage through the OpenCode multi-provider engine. Use when building, extending, or reviewing OnStudio's AI website-generation product or its generation pipeline.
---

# OnStudio Generator

## Overview

OnStudio turns a business specification plus a user-selected model into a
finished, high-quality website. It does this by **cloning an ONDIGITAL "Pro"
template** (the hand-written apps in this repo) and **rebranding** it to the new
business, then **billing by the tokens** the generation consumed. The generation
engine is **OpenCode** (opencode.ai), used as a multi-provider backend; the user
picks the model per job.

Use this skill when working on the OnStudio product: its generation pipeline,
spec intake, template selection, rebrand transform, billing, or the OnStudio app
itself (`onstudio/`). Full product docs live in `docs/onstudio/`.

This skill is an **orchestrator**: it composes the existing ONDIGITAL sub-skills
rather than replacing them. The generated site must still satisfy every base
rule (Spanish UI, design system, security gates, quality review).

Pair with: `skills/SKILL.md` (master), `skills/product/landing-page/SKILL.md`,
`skills/product/saas-product-ui/SKILL.md`,
`skills/product/sales-pos-inventory/SKILL.md`,
`skills/business/business-digitalization/SKILL.md`,
`skills/core/html-app-production/SKILL.md`,
`skills/core/frontend-quality-review/SKILL.md`,
`skills/security/app-security-review/SKILL.md`,
`skills/design/design-systems/DESIGN.md`.

## Where things live

| Concern | Location |
| --- | --- |
| Product docs (architecture, billing, pipeline, API) | `docs/onstudio/` |
| Living build plan + session handoff (ephemeral) | `docs/onstudio/PLAN.md`, `docs/onstudio/last_session.md` |
| App (Go + embedded UI + SQLite) | `onstudio/` |
| Template catalog (design) | `docs/onstudio/template-catalog.md` |
| Template manifest (operable) | `onstudio/templates/MANIFEST.md` |
| Spec intake contract | `references/spec-intake.md` |
| Template manifest contract | `references/template-manifest.md` |
| Rebrand rules | `references/rebrand-rules.md` |

## Generation pipeline (the core loop)

1. **Intake.** Collect and normalize the business spec + chosen model. Validate
   the model against the allowed list. See `references/spec-intake.md`.
2. **Template selection.** Map `industry` + `site_type` to a Pro template from
   the catalog; fall back to the generic SaaS template when there is no match.
   See `references/template-manifest.md` and `docs/onstudio/template-catalog.md`.
3. **Rebrand.** Drive OpenCode with the selected model to transform the template
   into the new business: names, copy, pages, theme/colors, logo. Preserve the
   template's quality and structure. See `references/rebrand-rules.md`.
4. **Emit.** Write the site only under `data/workspaces/<job_id>/`; produce a
   preview URL and a downloadable `.zip`. Validate against path traversal.
5. **Bill.** Read token usage (and cost) from the OpenCode assistant message;
   compute `price = provider_cost × margin`; present in USD + HNL. See
   `docs/onstudio/token-billing.md`.

## Non-negotiable rules

- **Spanish output.** Every generated site's UI copy is in Spanish; honor es-HN,
  HNL, RTN/DNI, +504, ISV/ISR conventions when the business is Honduran.
- **Brand defaults.** Robot logo present (sidebar + favicon). **Light/white theme
  is the default**; the dark navy "company colors" theme is opt-in via CSS
  variables + a Configuración toggle persisted in localStorage. Honor the user's
  `brand.use_company_colors` from the spec.
- **API key is a placeholder.** Provider keys live only in env / OnStudio's
  server, resolved by `{env:VAR}` in `opencode.json`. Never put a real key in
  the browser, a response, SQLite, a fixture, a doc, or a commit.
- **Do not degrade the template.** Rebrand changes identity and content, not the
  engineering quality, financial logic, or security posture of the source app.
- **No fabricated sensitive data.** Do not invent RTN/DNI, legal prices, tax
  IDs, or compliance claims. Use provided values or clear placeholders.
- **Billing integrity.** One usage capture per (session, turn); no double
  billing; no charge without measurable consumption. Keep `usage` as the source
  of truth (see `docs/onstudio/token-billing.md`).
- **Workspace isolation.** A job writes only inside its own
  `data/workspaces/<job_id>/`. Never let emit/preview/download escape it.

## OpenCode engine notes

- The browser never calls OpenCode directly — it calls the OnStudio Go API,
  which proxies to `opencode serve` (managed child by default, or external).
- Model is chosen per prompt from the spec (`provider` + `model`).
- `opencode.json` loads `AGENTS.md` + these skills via its `instructions` array,
  so the engine inherits ONDIGITAL's rules. Keys come from `{env:VAR}`.
- **Verify the exact OpenCode endpoint/field names against its OpenAPI (`/doc`)
  at implementation time** — the API can change between versions. See
  `docs/onstudio/opencode-integration.md`.

## When extending OnStudio

- Read the relevant `docs/onstudio/*.md` before changing a stage.
- Keep the Go house style (no CGO, `modernc.org/sqlite`, `//go:embed web`,
  Makefile `dev`/`test`/`build`); OnStudio serves on `:8100`.
- After Go changes run `cd onstudio && make test`
  (`go vet ./... && go test ./... && go build ./...`).
- Close UI/billing/key work with `frontend-quality-review` +
  `app-security-review`, and a Codex adversarial review on billing, key
  handling, tenant/job isolation, and path traversal.
- Update `docs/onstudio/PLAN.md` as steps complete; refresh `last_session.md`
  before ~95% token budget; delete both when the whole build is done.

## Self-check before delivering a generated site

- [ ] UI copy is natural Spanish; localization fits the business locale.
- [ ] Robot logo present; light theme default; company-colors toggle works.
- [ ] Template quality preserved; no broken layouts on mobile (375px).
- [ ] No real secret anywhere in the output; no fabricated sensitive data.
- [ ] Token usage captured once and billed correctly (USD + HNL shown).
- [ ] Output confined to the job workspace; preview/download cannot traverse.
- [ ] Base skills satisfied (design system, security gates, quality review).
