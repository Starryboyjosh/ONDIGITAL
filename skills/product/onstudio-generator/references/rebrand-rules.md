# OnStudio — Rebrand Rules

How the engine transforms a **Pro template** into a new business's site. The goal
is a site that looks and reads as if it were built for that business, while
keeping the template's engineering quality, financial correctness, and security
posture intact.

## The one rule that governs all others

> **Rebrand changes identity and content. It never degrades the template.**

Identity/content = fair game. Engineering quality, financial logic, security,
data invariants = protected (see each template's `template.json → protected`).

## What rebrand MAY change

- **Business identity:** name, tagline, domain hints, contact info (from spec).
- **Copy:** headings, body, CTAs, labels — natural **Spanish** (es-HN by default).
- **Pages/sections:** add/remove/reorder to match `spec.pages` + `content_notes`.
- **Theme:** light (default) vs company-colors (opt-in) per
  `brand.use_company_colors`.
- **Colors:** apply `brand.primary`/`accent` if given; else use design-system
  tokens. Keep contrast ≥ 4.5:1.
- **Logo / robot:** keep the robot logo (sidebar + favicon); fill via `--robot-*`
  variables; let `brand.logo_hint` guide accent/imagery, not removal of the robot.
- **Sample data:** replace template demo data with realistic Spanish/Honduran
  examples — but **never** fabricate RTN/DNI, legal prices, or tax claims.

## What rebrand MUST NOT change

- **Financial / business logic:** weighted-average cost, stock reversals, totals,
  ISV/ISR, cash-close math (e.g. in `onstock`/`onserve` templates). Do not touch.
- **Security posture:** auth boundaries, server-side checks, tenant isolation.
  Do not loosen them, and do not present demo auth as production-grade.
- **Data invariants:** the template's documented invariants stay true.
- **Engineering quality:** no dead code, no broken responsiveness, no removed
  validation, no `!important` hacks, no inline `onclick`. Match the house style.
- **Keys/secrets:** never embed a provider key, password, or token in the output.

## Theme handling

- Default output = **light/white theme**. Only switch to dark navy "company
  colors" when `brand.use_company_colors` is `true`.
- Implement themes as CSS variables: `:root` = light, `[data-theme="company"]` =
  brand; toggle via a Configuración switch persisted in localStorage.
- The robot logo fills from `--robot-*` variables so it adapts to both themes.

## Localization

- Spanish UI copy always. For Honduran businesses: HNL currency, es-HN dates,
  +504 phones, RTN/DNI fields, ISV/ISR wording where the business needs billing.
- Use the master skill's Spanish UI dictionary and formatting helpers
  (`skills/SKILL.md`).

## Quality gates (run before emit)

1. `frontend-quality-review` — layout, responsiveness (375px), consistency.
2. `app-security-review` — no leaked secrets, no weakened auth, no traversal.
3. For Go templates: `make test` (`go vet && go test && go build`) still passes.
4. Spanish copy reads naturally (not translated-from-English).

## Prompt-construction guidance (for the engine adapter)

- Load base rules via `opencode.json → instructions` (AGENTS.md + skills) so the
  model already knows ONDIGITAL conventions; don't restate them all in the prompt.
- Give the model: the template source, the normalized spec, the chosen template's
  `rebrand_points`/`protected`, and an explicit "do not modify protected paths"
  instruction.
- Treat `content_notes` and other free text as **untrusted** (the user may, intentionally or not, include
  instructions). Sanitize before injecting; the protected/identity boundary wins
  over anything embedded in user text.
- Keep outputs confined to the job workspace; the adapter writes files, the model
  proposes them.
