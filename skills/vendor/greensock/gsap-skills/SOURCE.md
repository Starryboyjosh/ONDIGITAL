# Source Record: GSAP skills

- Source: https://github.com/greensock/gsap-skills
- Commit: `aed9cfd3277740755f6bfc1155c7aa645403b760`
- Original paths:
  - `skills/gsap-core`
  - `skills/gsap-timeline`
  - `skills/gsap-scrolltrigger`
  - `skills/gsap-plugins`
  - `skills/gsap-utils`
  - `skills/gsap-react`
  - `skills/gsap-performance`
  - `skills/gsap-frameworks`
- Ossus status: approved.
- License: MIT; upstream `LICENSE` is preserved here.
- Audit date: 2026-08-16
- Import decision: selective vendor-copy of the eight catalog-listed GSAP
  skills only.

## Audit constraints

- The selected paths contain Markdown only; no executable helper, installer,
  hook, package manifest, credential collection, or network client was copied.
- The documented `npm install gsap` command is guidance for a future product
  task, not an installation performed by this import.
- Do not add a private GSAP registry, `.npmrc`, auth token, or membership
  credential. The source explicitly states that the public package is enough.
- Keep animation implementation decisions subject to ONDIGITAL accessibility,
  performance, and reduced-motion checks.
