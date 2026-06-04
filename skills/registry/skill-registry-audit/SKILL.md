---
name: skill-registry-audit
description: Evaluate external GitHub, Reddit, forum, marketplace, and registry agent skills before adding them to ONDIGITAL; use for sourcing design, backend, coding, QA, business, security, and workflow skills, deciding replace/complement/vendor/reject, and documenting supply-chain risk.
---

# Skill Registry Audit

## Overview

Use this skill whenever ONDIGITAL considers adding, copying, vendoring, or replacing skills from the open ecosystem. Treat skills as privileged dependencies because they can steer agent behavior, commands, file access, and external requests.

Pair with `skills/security/skill-supply-chain-audit/SKILL.md`.

## Acquisition Modes

| Mode | Use when | Rule |
|---|---|---|
| House skill | External source has useful ideas but mixed trust or too broad scope | Write ONDIGITAL-owned `SKILL.md` and cite source in registry |
| Vendor copy | Source is focused, licensed, audited, and directly useful | Copy into `skills/vendor/<source>/<skill>` after full file review |
| Reference only | Source is useful for research but not needed at runtime | Add URL and notes to registry reference |
| Reject | Source asks for secrets, exfiltration, unsafe commands, or policy override | Do not install; record reason |

Default to house skills for ONDIGITAL production guidance.

## Audit Workflow

1. Collect candidates from GitHub search, Reddit/forum threads, SkillsMP/SkillsMD-style registries, and direct recommendations.
2. Record provenance: URL, owner, license, stars/forks, latest push, skill count, scripts, package manifests, and install method.
3. Inspect files before use: `SKILL.md`, references, scripts, package manifests, hidden files, hooks, generated assets.
4. Search risky patterns:

```bash
rg -n "curl|wget|fetch\\(|api[_-]?key|token|secret|password|eval\\(|child_process|subprocess|exec\\(|base64|webhook|paste|ignore previous|system prompt|rm -rf|sudo|npm install -g|pip install" <candidate-dir>
```

5. Classify fit for ONDIGITAL: design, backend, QA, coding quality, business ops, sales/POS, data, security, migration, documentation.
6. Decide: replace, complement, house-copy, vendor-copy, or reject.
7. Update `references/open-source-skill-map.md` with the decision and rationale.

## Acceptance Criteria

An external skill can be adopted only if:

- License allows project use.
- The relevant files have been read.
- Executable scripts are necessary and reviewed.
- It does not instruct agents to weaken safety, ignore system/user instructions, leak secrets, upload private data, or run destructive commands.
- It has a clear role in the ONDIGITAL folder map.
- It improves an existing skill or fills a real gap.

## ONDIGITAL Folder Policy

- Keep first-party skills under functional folders: `backend`, `business`, `core`, `data`, `design`, `engineering`, `flutter`, `product`, `security`, `testing`.
- Put external audits and maps under `skills/registry`.
- If vendoring external skills later, use `skills/vendor/<owner>/<repo>/<skill-name>` and include a `SOURCE.md` with URL, commit, license, audit date, and constraints.
- Do not mix third-party scripts into first-party skills without provenance.

## Source Map

Read `references/open-source-skill-map.md` before adding or replacing skills. It contains the current ONDIGITAL analysis of community and official sources.
