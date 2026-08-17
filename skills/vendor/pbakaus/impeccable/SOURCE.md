# Source Record: impeccable

- Source: https://github.com/pbakaus/impeccable
- Commit: `5c5553b1d7f9e89bb833f9179cea681742a17720`
- Original path: `plugin/skills/impeccable`
- Ossus status: `approved`
- License: Apache-2.0; upstream `LICENSE` and `NOTICE.md` are preserved here.
- Audit date: 2026-08-16
- Import decision: vendor-copy, selective frontend skill only.

## Scope

The snapshot contains the canonical `impeccable` skill, its references, and its
detector/support scripts. No other repository directories were imported.

## Audit constraints

- No upstream installer, `npx impeccable install/update`, hook manager, or live
  browser workflow was run during import.
- `concept-seed.mjs`, update-check helpers, and image-generation helpers can
  contact external services; do not run them without explicit task scope,
  network approval, and a fresh review.
- Hook and live-edit scripts can write project files or agent configuration;
  do not enable them as a side effect of a normal UI task.
- Prefer the text guidance and local deterministic checks. Review the exact
  script before executing any bundled helper.
