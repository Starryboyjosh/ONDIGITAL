# Source Record: Emil Kowalski motion skills

- Source: https://github.com/emilkowalski/skills
- Commit: `78761e1b57f97dce65b983d640c70a68f39e8163`
- Original paths:
  - `skills/review-animations`
  - `skills/improve-animations`
  - `skills/find-animation-opportunities`
  - `skills/apple-design`
  - `skills/prototype`
- Ossus status: approved; `apple-design` is source-sensitive.
- License: MIT; upstream `LICENSE` is preserved here.
- Audit date: 2026-08-16
- Import decision: selective vendor-copy of the five motion skills listed by
  the supplied registry.

## Audit constraints

- The selected paths are text-only guidance and contain no executable helper,
  installer, hook, or package manifest.
- `review-animations`, `improve-animations`, `find-animation-opportunities`,
  and `prototype` are advisory/read-only workflows; they must not be treated
  as permission to edit production code without a separate user request.
- `apple-design` is retained as source-sensitive guidance. Verify current
  platform behavior against primary documentation when relying on it.
