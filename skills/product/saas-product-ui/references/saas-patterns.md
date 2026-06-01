# SaaS Patterns Reference

## Common Surfaces

- Dashboard: metrics, trend, exceptions, task queue, recent activity.
- List/table: filters, saved views, search, sorting, pagination, selection, bulk actions.
- Detail page: summary, status, timeline, related records, notes, actions.
- Settings: grouped forms, roles, permissions, integrations, audit trail.
- Billing: plan, usage, invoices, payment methods, limits, alerts.
- Reporting: date range, dimensions, export, scheduled delivery, definitions.

## Data Table Checklist

- Column names are concrete.
- Numeric values align for comparison.
- Empty/missing values are visibly different from zero.
- Row actions and bulk actions are not confused.
- Sorting/filtering state is visible and resettable.
- Truncated text has a way to inspect full content.

## Form Checklist

- Required fields are obvious.
- Validation messages say how to fix the issue.
- Save states prevent duplicate submissions.
- Dangerous changes ask for confirmation and explain impact.
- Unsaved changes are protected when navigation would lose work.

## Visual System

- Use neutral surfaces and borders for structure.
- Reserve accent color for primary action, selected state, or important status.
- Status colors must be distinguishable by label/icon, not color alone.
- Keep radius modest unless the repo design system says otherwise.
