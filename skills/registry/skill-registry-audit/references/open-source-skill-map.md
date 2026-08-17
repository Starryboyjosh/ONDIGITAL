# ONDIGITAL Open Source Skill Map

Audit date: 2026-06-04
Last selective import review: 2026-08-16

This file records external agent-skill sources reviewed for ONDIGITAL. It is not an install script. Use it to decide whether to house-copy, vendor-copy, complement, or reject a source.

## Executive Decision

Do not bulk-install external skill packs into ONDIGITAL. The ecosystem is useful but noisy, and many repos include CLIs, shell scripts, global installs, browser automation, or broad persona prompts. ONDIGITAL should keep first-party operational skills and selectively vendor only focused skills after review.

Current action taken:

- Added first-party skills for backend production, QA automation, coding quality, business digitalization, and sales/POS/inventory.
- Kept external repos as cited sources and future vendor candidates.
- Did not copy third-party scripts into production folders.
- Selectively vendored the 18 frontend and motion entries supplied from the
  Ossus v0.1 almanac under `skills/vendor`; they remain separate from
  first-party skills.
- Did not import Ossus tools, policies, rejected entries, or unrelated skills
  from the source repositories.

## Sources Reviewed

| Source | URL | Signals | Useful for ONDIGITAL | Decision |
|---|---|---|---|---|
| proflead/codex-skills-library | https://github.com/proflead/codex-skills-library | 62 skills, focused developer workflows, mostly concise text skills, 106 stars at audit | Codebase orientation, API contracts, backend/system design, security quick scan, testing starters, PR review | Complement. Use as pattern source for `engineering/coding-quality` and `backend/backend-api-production`; do not bulk-copy yet |
| jMerta/codex-skills | https://github.com/jMerta/codex-skills | Mentioned on Reddit; 19 skills, MIT, 127 stars, includes CLIs/scripts and agent-scripts | AGENTS.md generation, CI fixing, coding guidelines, bug triage, plan-work | Conditional vendor candidate. Good operational workflows, but scripts require review before use |
| MoizIbnYousaf/Ai-Agent-Skills | https://github.com/MoizIbnYousaf/Ai-Agent-Skills | MIT, 17 skills, 1066 stars, CLI/library manager | Backend development, database design, best practices, skill library curation | Reference source. Useful ideas, but mixed upstream/source metadata and installer surface make house-copy safer |
| mxyhi/ok-skills | https://github.com/mxyhi/ok-skills | Apache-2.0, active, 45 skills, 405 stars, scripts/extensions present | TDD, systematic debugging, architecture improvement, browser automation, docs lookup | Complement. Strong coding-process ideas; vendor individual skills only after script/reference audit |
| nextlevelbuilder/ui-ux-pro-max-skill | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | MIT, very popular, large design dataset, multiple skills/scripts | Advanced UI/UX, design system generation, accessibility/performance checks | Optional design vendor candidate. Current ONDIGITAL `frontend-quality-review` and `design-systems` cover the default. Consider vendoring only for dedicated design-system work |
| pbakaus/impeccable | https://github.com/pbakaus/impeccable | Apache-2.0, focused frontend skill, references plus deterministic detector and optional networked helpers | UI critique, responsive/accessibility polish, design-system context, frontend anti-pattern detection | Selective vendor-copy of `impeccable` at a pinned commit; scripts remain constrained and are not run by default |
| emilkowalski/skills | https://github.com/emilkowalski/skills | MIT, focused text-only motion guidance | Animation review, motion planning, restrained opportunities, Apple-style interaction, isolated prototypes | Selective vendor-copy of the five listed motion skills; advisory/read-only rules retained |
| greensock/gsap-skills | https://github.com/greensock/gsap-skills | MIT, official text-only GSAP guidance | Core tweens, timelines, ScrollTrigger, plugins, framework lifecycle, React and performance | Selective vendor-copy of the eight listed GSAP skills at the registry-pinned commit; no package install |
| lottiefiles/motion-design-skill | https://github.com/lottiefiles/motion-design-skill | MIT, text-only motion design framework | Motion personality, timing, choreography and feedback patterns | Selective vendor-copy of `motion-design`; apply ONDIGITAL accessibility and performance gates |
| zanwei/design-dna | https://github.com/zanwei/design-dna | MIT, structured design-system/style/effects workflow plus one example image | Extracting and applying design tokens, qualitative style and visual effects | Selective vendor-copy of `design-dna`; references and assets remain advisory, no automatic retrieval |
| cosmicstack-labs/mercury-agent-skills | https://github.com/cosmicstack-labs/mercury-agent-skills | MIT, 130 skills, 23 categories, 258 stars, broad business/product/testing/backend coverage | Business digitalization, product strategy, inventory optimizer, API design, E2E testing, accessibility testing | Reference source. Strong for SMB operations; house-copy relevant patterns into ONDIGITAL-owned skills |
| Siddharth00/agent-revamp-skills | https://github.com/Siddharth00/agent-revamp-skills | MIT, small/new, 9 migration skills, 1 star | Prototype-to-production migrations, audit to plan to validate workflow | Reference source. Useful migration discipline, but low maturity; do not vendor yet |
| seb1n/awesome-ai-agent-skills | https://github.com/seb1n/awesome-ai-agent-skills | MIT, 90+ universal skills, 94 stars | Broad cross-domain inspiration | Future review only. Not audited locally in this pass |
| eigent-ai/agent-skills | https://github.com/eigent-ai/agent-skills | Apache-2.0, small, 11 stars | Copywriting, MCP, productivity workflows | Future review only. Potential marketing/business source |
| openai/skills | https://github.com/openai/skills | Official source, curated | Browser/testing/security/foundational skills | Baseline high-trust source, but user asked to prioritize small/community sources |
| firebase/agent-skills | https://github.com/firebase/agent-skills | Official Firebase source | Firestore rules, Firebase Auth, deployment | Keep as high-trust baseline because ONDIGITAL currently uses Firebase |

## Reddit And Forum Signals

- Reddit posts around `jMerta/codex-skills` confirm a working Codex skill-sharing pattern and note that only metadata is loaded while skill bodies/references are opened as needed.
- Reddit posts around `agent-revamp-skills` show demand for migration-specific skills rather than only greenfield app generation.
- Registry/forum surfaces such as SkillsMD, SkillsMP, OpenAgentSkills, SkillsHunt, and marketplace indexes are useful for discovery but should not be treated as trust guarantees.
- Recent research and marketplace discussions repeatedly flag supply-chain risk in agent skills. Treat natural-language instructions as executable influence, not harmless docs.

## Replace Or Improve Map

| Existing ONDIGITAL area | Keep | Improve with | New/updated house skill |
|---|---|---|---|
| `core/html-app-production` | Yes | UI/UX Pro Max concepts for accessibility, touch, performance, design systems | Existing skill plus `testing/qa-automation` |
| `core/frontend-quality-review` | Yes | UI/UX Pro Max and Mercury accessibility/e2e/testing patterns | Existing skill plus `testing/qa-automation` |
| `data/database-system` | Yes | Ai-Agent database-design, Proflead db migration review, Mercury database design | `backend/backend-api-production` complements it |
| `product/saas-platform` | Yes | Proflead system-design, Mercury product strategy, backend/API rules | `business/business-digitalization`, `backend/backend-api-production` |
| `product/saas-product-ui` | Yes | UI/UX Pro Max operational UI patterns | Keep as ONDIGITAL style authority |
| `security/*` | Yes | Proflead threat-modeling and dependency-risk-audit | Keep existing security skills as stricter production gates |
| Missing backend production | Add | Ai-Agent backend-development, Mercury API design, Proflead API contract checker | `backend/backend-api-production` |
| Missing QA automation | Add | Mercury E2E/API/accessibility/test-strategy, OK TDD | `testing/qa-automation` |
| Missing coding-process quality | Add | OK systematic-debugging/TDD/architecture, Proflead codebase orientation | `engineering/coding-quality` |
| Missing business digitalization | Add | Mercury product strategy, local business growth, inventory optimizer | `business/business-digitalization` |
| Missing POS/inventory | Add | Mercury inventory optimizer, shop/restaurant ops patterns | `product/sales-pos-inventory` |

## Install Constraints

Before any future vendor-copy:

1. Pin a commit SHA.
2. Read every executable file.
3. Run risky-pattern search.
4. Record license and audit date.
5. Keep external code under `skills/vendor`, not mixed into first-party folders.
6. Do not run CLIs from skill repos until their install/update behavior is reviewed.

The 2026-08-16 Ossus import follows these constraints: only the 18 supplied
frontend and motion entries were copied; upstream licenses and pinned commits
are recorded in adjacent `SOURCE.md` files; no installer, hook, package
install, or networked helper was executed.
