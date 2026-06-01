---
name: html-app-production
description: Build or edit production-quality HTML/CSS/JavaScript interfaces, static sites, prototypes, dashboards, landing pages, and browser apps. Use for requests involving .html files, vanilla frontend code, Vite/static web apps, responsive web UI, visual polish, asset-led web pages, or converting rough UI into clean production HTML.
---

# Html App Production

## Overview

Build real browser experiences, not screenshots. Favor simple, inspectable HTML/CSS/JS when it is enough, and adopt the repository's existing framework only when the project already uses one or the task needs routing, state, bundling, or component reuse.

## Operating Workflow

1. Inspect the existing app shape before editing: framework, package manager, CSS approach, components, build commands, assets, and any `AGENTS.md`.
2. Decide the smallest appropriate delivery surface:
   - Use one standalone `.html` file for portable demos, quick tools, and artifacts.
   - Use separate `index.html`, CSS, and JS files when maintainability or app size justifies it.
   - Use the existing framework and design system when editing a repo app.
3. Write a short implementation thesis before major UI work: audience, primary workflow, information hierarchy, visual direction, and validation route.
4. Implement the working interface end to end: layout, states, interactions, data placeholders, responsive behavior, accessibility, and error/empty/loading states where relevant.
5. Verify in a browser or with the project test/build flow. For visual work, capture or inspect desktop and mobile viewports before final handoff.

## HTML Standards

- Use semantic landmarks, real buttons/links/labels, keyboard-reachable controls, visible focus states, and adequate contrast.
- Use CSS variables for tokens once a color, space, radius, or shadow repeats.
- Define stable dimensions for fixed-format UI: boards, cards, grids, toolbars, counters, charts, media frames, and buttons.
- Make responsive behavior explicit with `minmax()`, `clamp()` for lengths, container constraints, aspect ratios, and sensible breakpoints. Do not scale font size directly with viewport width.
- Keep JavaScript state small and predictable. Store UI state in named objects/functions instead of scattering DOM mutations across unrelated handlers.
- Avoid CDN dependencies unless the project already uses them or the artifact must be a single portable file. Prefer local packages in repo apps.
- Use real content and domain-specific labels. Avoid UI text that explains the design or announces implementation details.

## Visual Direction

Read `references/visual-quality.md` for visual-first pages, app polish, landing pages, prototypes, and redesigns. Treat Open Design-style quality as craft discipline: strong hierarchy, purposeful assets, restrained composition, and verified output. Do not copy Open Design infrastructure.

## Common Build Patterns

Read `references/html-patterns.md` when creating a new standalone app, dashboard, form-heavy interface, or interactive tool.

Default patterns:

- Product/dashboard UI: start with navigation, filters, primary workspace, secondary context, and stateful controls. No marketing hero.
- Landing/editorial UI: start with a first-viewport visual anchor, concise copy, and a clear next section visible below the fold.
- Tools/games: prioritize the actual interactive surface on first load, then controls and status.
- Existing HTML edits: preserve working semantics and selectors unless changing them is necessary; avoid broad rewrites.

## Verification

- Run the repo's lint/typecheck/build when available and relevant.
- For standalone HTML, open via a local server when modules, fetches, or relative assets require it.
- For visual work, use browser screenshots or Playwright at desktop and mobile sizes. Check for blank canvases, clipped text, horizontal scroll, overlapping content, broken assets, and unusable tap targets.
- Report any verification that could not be run.
