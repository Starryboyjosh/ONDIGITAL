# Flutter Workflow Reference

## New Feature Shape

Prefer a feature-oriented structure when the repo has no stronger pattern:

- `presentation/`: screens, widgets, controllers/view models if used locally.
- `domain/`: entities, use cases, validators, pure business rules.
- `data/`: DTOs, repositories, API clients, persistence adapters.

Do not force this structure into a small app or a repo with established conventions.

## Screen Checklist

- Data lifecycle is explicit: loading, empty, error, populated, refreshing, disabled.
- Primary actions are reachable with thumb and keyboard/mouse where applicable.
- Scrollables have bounded constraints.
- Text scale does not break the screen.
- Long localized strings have room.
- Icon-only buttons include tooltips or semantic labels.
- Navigation preserves back behavior and deep-link expectations.

## Responsive Checklist

- Use `LayoutBuilder` for local constraints.
- Use `MediaQuery` for global environment only: text scale, platform brightness, padding, view insets.
- Use `Expanded`, `Flexible`, `Sliver*`, and bounded `SizedBox` intentionally.
- Prefer adaptive composition: one-column phone, two-pane tablet/desktop, persistent side navigation on wide screens.

## Testing Choices

- Unit test pure validators, formatters, parsers, and repositories with mocked boundaries.
- Widget test components with visible labels, interactions, and state transitions.
- Integration test purchase, onboarding, auth, checkout, sync, or other end-to-end flows.
