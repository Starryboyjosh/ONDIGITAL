# HTML App Patterns

## Standalone File Pattern

Use one `index.html` when portability matters. Include:

- `<meta name="viewport" content="width=device-width, initial-scale=1">`
- CSS variables in `:root`
- `box-sizing: border-box`
- semantic structure: `header`, `main`, `section`, `nav`, `form`, `button`
- scoped JS at the end of `body` or as a module when served locally

## Interactive Tool Pattern

- Put the active workspace first.
- Add a compact toolbar for mode/tools.
- Add status, history, inspector, or output where the user naturally scans next.
- Keep controls stable in size so hover labels, numbers, and dynamic states do not shift layout.
- Persist useful state in `localStorage` only when it improves the next session.

## Dashboard Pattern

- Start with navigation, scope controls, high-signal metrics, primary table/chart, and recent activity.
- Include loading, empty, error, selected, disabled, and destructive states when the UI implies data.
- Use tables for comparison and scanning; use cards for entities or repeated summaries.
- Keep filters visible and reversible.

## Form Pattern

- Group fields by decision, not by database shape.
- Use native labels, input types, validation messages, and submit states.
- Keep destructive actions visually separate from primary save/continue actions.

## Verification Targets

- Desktop: 1366x768 or 1440x900.
- Mobile: 390x844 and one narrow width near 320px when text is dense.
- Check keyboard tab order, focus visibility, scroll behavior, and asset paths.
