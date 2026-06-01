---
name: saas-product-ui
description: Design and implement SaaS, admin, CRM, ERP, analytics, internal tools, and operational product UI in HTML, Flutter, React, Vue, or similar stacks. Use for dashboards, tables, filters, forms, settings, role-based workflows, billing, reporting, monitoring, and dense business applications.
---

# SaaS Product UI

## Overview

Build operational interfaces that help users scan, decide, and act repeatedly. Prefer quiet, durable product UI over marketing composition.

## Product UI Workflow

1. Identify the operator, job, objects, permissions, primary decisions, and most frequent actions.
2. Start with the working surface: table, queue, calendar, kanban, report, map, editor, billing screen, or settings form.
3. Define navigation and scope controls before decorative content.
4. Model states: loading, empty, zero-results, error, stale data, saving, success, disabled, selected, bulk action, permission denied.
5. Implement with the repo's design system and component library. If none exists, create a compact token set and reusable primitives.
6. Verify at desktop and mobile/tablet breakpoints, including dense data and long labels.

## Interface Defaults

- No landing-page hero for an app workspace unless explicitly requested.
- Use compact headings that label the surface: `Invoices`, `Open cases`, `Pipeline`, `Usage`, `Sync logs`.
- Keep layout organized around nav, toolbar, content, and details/inspector.
- Use tables for comparison; use cards for entities, summaries, and repeated records only when cards improve scanning.
- Keep charts tied to a decision. Include time range, metric definition, and empty/loading/error states.
- Use icon buttons for familiar repeated tools, with labels/tooltips where ambiguity exists.
- Use menus for option sets, segmented controls for modes, toggles for binary settings, and inputs/sliders for numeric values.
- Make destructive, financial, permission, and irreversible actions explicit.

## SaaS Patterns

Read `references/saas-patterns.md` for common surfaces and quality checks.

Pair with `$html-app-production` for HTML/browser builds, `$flutter-app-production` for Flutter, and `$frontend-quality-review` before handoff.

## Copy Rules

- Use utility copy: object names, statuses, scopes, freshness, and actions.
- Avoid slogans, metaphors, and campaign language inside workspaces.
- If headings and labels are the only text scanned, the user should still understand the screen.

## Verification

- Test filters, sorting, search, pagination, selection, forms, destructive confirmations, and responsive navigation.
- Check dense data, long names, large numbers, missing values, and failed network states.
- Confirm key actions remain visible or intentionally sticky when users scroll.
