---
name: flutter-app-production
description: Build, refactor, or polish production Flutter apps for mobile, tablet, desktop, and web. Use for Flutter screens, widgets, navigation, responsive layouts, state/data architecture, API integration, localization, testing, visual polish, and app-quality fixes.
---

# Flutter App Production

## Overview

Deliver Flutter work that fits the existing app architecture, renders cleanly across form factors, and is backed by the right level of tests. This skill coordinates the installed Flutter-specific skills from the Flutter team with production app judgment.

## Operating Workflow

1. Inspect `pubspec.yaml`, `lib/`, `test/`, platform folders, state management, routing, theming, generated files, and any `analysis_options.yaml`.
2. Use the app's existing patterns unless there is a concrete reason to change them.
3. Choose the relevant installed Flutter skill before implementing:
   - `flutter-apply-architecture-best-practices` for feature structure and layering.
   - `flutter-build-responsive-layout` for adaptive UI.
   - `flutter-fix-layout-issues` for overflow and constraint failures.
   - `flutter-setup-declarative-routing` for `go_router`, deep links, and web URLs.
   - `flutter-use-http-package` and `flutter-implement-json-serialization` for REST/API models.
   - `flutter-setup-localization` for i18n/l10n.
   - `flutter-add-widget-test`, `flutter-add-integration-test`, and `flutter-add-widget-preview` for validation and previews.
4. Implement by feature boundary: UI, logic/state, data, routing, and tests.
5. Run `dart format`, `flutter analyze`, and focused tests when available. Add screenshot/manual notes for visual or layout-sensitive work.

## Production Defaults

- Keep UI widgets declarative and mostly presentation-only.
- Keep business logic out of `build()` methods.
- Put API parsing, caching, and persistence behind repositories/services.
- Prefer immutable models and explicit loading/error/success states.
- Make responsive decisions from constraints, not hard-coded device names.
- Preserve Material/Cupertino/platform conventions unless the app already has a custom design system.
- Use theme tokens and named text styles instead of one-off colors and font sizes.
- Add accessibility labels for icon-only controls and custom interactive widgets.
- Avoid introducing a new state management package into an existing app without a clear repo-level reason.

## UI Quality

Read `references/flutter-workflow.md` for screen-building and refactor checklists.

For SaaS/admin/product tools, pair with `$saas-product-ui`. For visual hardening before handoff, pair with `$frontend-quality-review`.

## Verification

- Always run formatting for touched Dart files.
- Run `flutter analyze` when the project is available.
- Run focused widget/unit tests for touched features; add tests when behavior or layout logic changes.
- For layout work, verify at phone and wider breakpoints. Use previews, emulators, or screenshots when practical.
- State clearly when Flutter tooling or devices are unavailable.
