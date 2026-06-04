---
name: qa-automation
description: Plan and implement ONDIGITAL quality automation for static sites, SaaS dashboards, Firebase apps, APIs, Flutter apps, browser flows, accessibility, visual regression, tenant isolation, data integrity, and release smoke checks.
---

# QA Automation

## Overview

Use this skill to turn a demo into a verifiable product. Test user-visible behavior, business invariants, data boundaries, and security gates before visual polish is considered done.

Pair with `skills/core/frontend-quality-review/SKILL.md`, `skills/backend/backend-api-production/SKILL.md`, `skills/security/app-security-review/SKILL.md`, and Flutter test skills when the app is Flutter.

## Test Stack Defaults

| App type | Preferred checks |
|---|---|
| Static HTML/CSS/JS | Playwright smoke tests, DOM assertions, accessibility checks, screenshots |
| SaaS dashboard | Browser E2E, API contract tests, tenant-isolation tests, role matrix tests |
| Firebase app | Firestore rules tests, Auth emulator tests, client flow tests |
| API backend | Unit tests for pure logic, integration tests for routes, migration tests |
| Flutter app | Widget tests, integration tests, responsive screenshots |

Keep tests focused on workflows that lose money, leak data, block operations, or damage trust.

## Required QA Workflow

1. Identify critical paths: login, dashboard load, CRUD, search/filter, export, payment/collection, admin settings, logout.
2. Define test users by role and tenant. Include at least two tenants for every SaaS/private-data app.
3. Create deterministic seed data. Never rely on production data for tests.
4. Write browser tests using accessible selectors first: roles, labels, visible text, then test IDs.
5. Add negative tests: unauthenticated access, wrong tenant object ID, non-admin admin route, malformed input, duplicate record, destructive confirm/cancel.
6. Capture desktop and mobile screenshots for UI-heavy work.
7. Add one smoke command that a non-expert can run before delivery.

## Browser Test Checklist

- Login rejects bad credentials and accepts valid credentials.
- Private pages redirect or show an unauthenticated state before loading private data.
- Sidebar/header reflect the active tenant and role.
- CRUD actions persist after reload or backend sync.
- Tables handle empty, loading, error, filtered, and long-content states.
- Modal forms are keyboard-operable and close predictably.
- No horizontal mobile overflow, clipped text, or overlapping controls.
- Destructive actions require confirmation and can be canceled.

## API And Data Checks

- Every private route rejects missing auth.
- Every tenant-owned route rejects IDs from another tenant.
- Server recalculates totals, discounts, taxes, stock movements, commissions, and balances.
- API error payloads are stable and actionable.
- Migrations are reversible or have a documented rollback path.
- Backups and exports exclude secrets and respect tenant ownership.

## Accessibility Checks

Target WCAG AA for normal business apps:

- Real labels for all form controls.
- Visible focus states.
- Icon-only controls have names.
- Keyboard can complete the primary workflow.
- Normal text contrast is at least 4.5:1.
- Status messages are visible near the related control.

## Delivery Output

When asked to add or review QA, produce:

- Test matrix by role, tenant, and workflow.
- Commands to run the checks.
- Gaps that remain untested and why.
- Any screenshots or reports generated.
- Release decision: pass, pass with risk, or block.
