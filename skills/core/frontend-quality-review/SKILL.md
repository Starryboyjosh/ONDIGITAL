---
name: frontend-quality-review
description: Audit, improve, and verify frontend UI quality before handoff. Use for design review, visual polish, responsive fixes, accessibility checks, HTML/CSS/Flutter UI hardening, layout bugs, screenshots, before/after review, and turning rough generated UI into production-ready interface work.
---

# Frontend Quality Review

## Overview

Run a practical design-and-engineering pass on an existing interface. Prioritize defects that users will feel: broken layout, unclear hierarchy, inaccessible controls, generic visuals, missing states, slow workflows, and unverified rendering.

## Review Workflow

1. Inspect the implementation and run the app or open the artifact.
2. Capture or examine at least one desktop and one mobile viewport when possible.
3. List concrete findings by severity with file/line references when reviewing code, or UI location when reviewing visuals.
4. Fix the high-impact issues in scope: layout, hierarchy, text fit, accessibility, state handling, assets, and polish.
5. Re-run the relevant build/test/browser checks and summarize what changed.

## What To Look For

- Blank or broken render, missing assets, console errors, failed requests.
- Horizontal overflow, text clipping, overlapping UI, unstable dimensions, layout shift.
- Weak first viewport: unclear product, page purpose, or primary action.
- Generic card-heavy UI where a denser layout would work better.
- Controls without proper semantics, labels, focus, hit area, disabled state, or feedback.
- Missing loading, empty, error, and success states.
- Color-only state communication or insufficient contrast.
- Motion that distracts, delays repeated workflows, or ignores reduced-motion preferences.

## Fixing Rules

- Keep changes scoped to the requested UI or the smallest shared primitive that actually owns the issue.
- Preserve existing design-system tokens and component APIs.
- Improve hierarchy through spacing, alignment, typography, grouping, and content before adding decoration.
- Prefer deterministic fixes over subjective restyling when the user asked for a bug/layout pass.
- For visual polish requests, make the interface more specific to the product domain, not just more decorated.

## Checklist

Read `references/review-checklist.md` for a compact pass list.

Pair with `$html-app-production`, `$flutter-app-production`, or `$saas-product-ui` depending on the stack.

## Final Report

Report:

- Issues found and fixed.
- Files changed.
- Validation run.
- Residual risks or checks that could not be completed.
