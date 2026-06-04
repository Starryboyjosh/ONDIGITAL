---
name: coding-quality
description: Improve ONDIGITAL codebases with codebase orientation, debugging discipline, test-first changes, refactoring, architecture cleanup, naming, documentation, git hygiene, migration planning, and maintainable Spanish business app conventions.
---

# Coding Quality

## Overview

Use this skill for general coding discipline across ONDIGITAL projects. It complements framework-specific skills by enforcing careful exploration, small changes, root-cause analysis, and maintainable business logic.

Pair with the relevant product skill, `skills/testing/qa-automation/SKILL.md`, and `skills/registry/skill-registry-audit/SKILL.md` when adopting external skills.

## Operating Rules

1. Orient first. Map entry points, data flow, storage, auth, build/run commands, and existing style.
2. Reproduce before fixing. Do not patch symptoms without evidence of the root cause.
3. Keep changes scoped. Avoid unrelated rewrites unless they directly reduce risk for the requested task.
4. Preserve user work. Do not revert unrelated local changes.
5. Test behavior, not implementation trivia.
6. Prefer boring primitives for microbusiness software: clear CRUD, explicit validation, simple state, readable tables, reliable exports.
7. Add comments only where they explain a non-obvious invariant or tradeoff.

## Codebase Orientation

Before a meaningful change, answer:

- What is the runtime and deployment model?
- Which files own routing, state, data access, auth, and UI shell?
- Which storage is demo-only and which storage is production?
- What commands verify the project?
- Which product skill applies: SaaS, landing page, dental, POS/inventory, Flutter, or backend?

## Debugging Discipline

Use a four-step loop:

1. Read the error and reproduce it.
2. Locate the failing boundary: UI, state, API, database, auth, build, dependency, or environment.
3. Form one hypothesis and test the smallest useful change.
4. Verify the original behavior and nearby regression risks.

Avoid "try random fixes" cycles. If evidence is missing, add temporary diagnostics and remove them before final delivery unless they are useful production logs.

## Refactoring Rules

Refactor when it clearly improves locality, testability, or comprehension:

- Extract repeated business calculations into named functions.
- Put validation near data writes, not just near form controls.
- Keep tenant and role logic centralized.
- Remove pass-through wrappers that add naming overhead without behavior.
- Split huge files only around real concepts: auth, data access, rendering, domain calculations, integrations.

Do not refactor during an urgent security fix unless the fix cannot be made safely without it.

## Migration Planning

For prototype-to-production migrations, create a short migration plan:

- Current stack and target stack.
- Risks: auth, tenant isolation, data migration, PDFs/exports, offline behavior, SEO, hosting.
- Compatibility path: big bang, staged rewrite, or parallel run.
- Test baseline that must pass before migration.
- Rollback strategy.

## Documentation Standard

Document decisions where future agents will need them:

- Use `AGENTS.md` or project-local skill notes for coding conventions.
- Use ADR-style notes for architecture decisions that should not be re-litigated.
- Keep setup docs concise and runnable.
- Record demo credentials only if they are clearly marked as demo-only.
