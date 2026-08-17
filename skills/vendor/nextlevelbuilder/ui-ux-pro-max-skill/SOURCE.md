# Source Record: ui-ux-pro-max and brand

- Source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Commit: `a38d04c3d5c298c851dbe5e6ee1965ee3de42cb5`
- Original paths:
  - `.claude/skills/ui-ux-pro-max`
  - `.claude/skills/brand`
- Ossus status: `approved-conditional`
- License: MIT; upstream `LICENSE` is preserved here.
- Audit date: 2026-08-16
- Import decision: vendor-copy, limited to the two catalog-listed skills.

## Scope

The `ui-ux-pro-max` snapshot keeps its local searchable data, references, and
Python helpers. The `brand` snapshot keeps its references, templates, and
asset/token helpers. No other bundled skills or repository directories were
imported.

## Audit constraints

- The upstream installer and unpinned package commands were not run.
- `ui-ux-pro-max` search helpers are intended to read the bundled local data;
  review any refresh or persistence command before use. Never use `--force`
  to overwrite an existing ONDIGITAL design system without explicit approval.
- `brand` helpers can read and write project token and guideline files. Run them
  only when the target files and expected diff are explicitly in scope.
- Do not pass secrets or private project data into queries, prompts, or scripts.
