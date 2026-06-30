# AGENTS.md

## Project Snapshot

- ONDIGITAL is a multi-product repository for the main website, internal prototypes, and the Micro-Empresa product line for Honduras.
- User-facing product copy should stay in Spanish. For active Honduras products, prefer local conventions such as HNL, es-HN, RTN/DNI, +504, and SAR-related wording when relevant.
- `credental/` is a static HTML/CSS/vanilla JS dental clinic prototype. It has no framework or build step. Current auth and storage are demo-grade, not production security or durable clinical storage.
- `onstock/` is a Go 1.22+ local mini-ERP with an embedded vanilla JS web UI and SQLite storage.
- `Pagina_Web_Original/`, `design-system/`, `firebase/`, `skills/`, and `docs/` support the site, design language, deployment config, internal skills, and product documentation.

## Agent Workflow

- Read the relevant README/docs before changing a product area. For ONDIGITAL product/UI work, start with `skills/SKILL.md` and then the closest product or domain skill that applies.
- For repo-wide implementation work, run a Graphify pass first: read `docs/graphify.md`, summarize the product graph, name the folders you will touch, and split work into small verified phases.
- Keep changes scoped to the requested product or module. Do not mix Credental, OnStock, landing page, Firebase, and skill changes unless the task explicitly requires it.
- Preserve the local stack style. Credental and design prototypes use vanilla HTML/CSS/JS without build tooling; OnStock uses Go plus embedded vanilla frontend assets.
- State assumptions before changing authentication, authorization, persistence, Firebase rules, accounting/tax logic, exports, backups, or data migration behavior.
- Do not add real patient/customer data, production credentials, API keys, private Firebase config, or secrets to fixtures, docs, commits, or prompts.
- If a user corrects a durable project convention, update the closest relevant guidance file so future agent sessions inherit it.

## Verification

- OnStock: run `cd onstock && make test` after changing Go code, embedded API behavior, or shared frontend logic.
- Credental/static HTML: serve the folder with a local static server and smoke test changed pages. For broad UI changes, check desktop and mobile widths.
- Firebase rules/indexes: use the Firebase emulator or a dry-run style validation when the CLI is available. If the CLI is unavailable, document that verification was skipped.
- Documentation-only or agent-config-only changes: review Markdown and run `git diff --check`.
- If a check cannot be run, report the exact command and reason instead of implying it passed.

## Review Guidelines

- Prioritize regressions, security/privacy issues, data loss, tenant isolation, auth bypass, broken local/offline behavior, and incorrect financial or tax calculations.
- For Credental, flag any path where demo auth, client-side role checks, `sessionStorage`, or optional Firebase sync could be mistaken for production-grade clinical data handling.
- For OnStock, review inventory mutation paths, weighted-average cost calculations, stock reversals, report totals, export integrity, SQLite durability, and ISV/ISR handling.
- For UI work, check that Spanish copy is natural, workflows are operational rather than decorative, and mobile layouts do not overlap or hide critical actions.
