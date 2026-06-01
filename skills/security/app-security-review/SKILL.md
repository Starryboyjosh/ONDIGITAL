---
name: app-security-review
description: Audit and harden application security before release. Use when building or reviewing production apps, SaaS dashboards, admin panels, APIs, auth flows, database access, file uploads, secrets, dependencies, logging, tenant isolation, or vibe-coded apps that may expose privileged UI/data.
---

# App Security Review

## Overview

Review apps as if the frontend is fully attacker-controlled. Do not accept hidden buttons, client-side route guards, localStorage flags, or obscured admin screens as security boundaries.

## Review Workflow

1. Map trust boundaries: browser, server/API, database, third-party services, storage, background jobs, and admin tooling.
2. Identify assets: user data, tenant data, credentials, payment data, files, audit logs, API keys, admin operations.
3. Review high-risk classes first: access control, auth/session, injection/XSS, secrets, uploads, dependencies, security headers, logging.
4. Verify exploitability with safe local tests where possible: direct URL access, ID tampering, role changes, unauthenticated API calls, repeated login attempts, and malicious input rendering.
5. Fix the server-side control first, then clean up frontend UX.
6. Report findings by severity with file/route references and validation performed.

## Production Gates

- No admin data, admin routes, or privileged API responses may be delivered to unauthenticated or unauthorized users.
- No security decision may depend only on JavaScript hiding, route names, CSS, localStorage, sessionStorage, query params, or disabled controls.
- Every privileged API endpoint must authenticate, authorize, validate tenant ownership, and reject by default.
- Demo auth may exist only when clearly labeled as non-production and isolated from production deployment paths.
- Secrets must not appear in source, frontend bundles, localStorage, logs, screenshots, or error messages.
- User input rendered into HTML must be escaped/sanitized. Prefer text APIs over HTML sinks.
- Dependencies and generated code must be reviewed before release.

## References

Read `references/owasp-release-checklist.md` for the compact OWASP-oriented release checklist.

Pair with `$auth-access-control` for login/admin/roles, `$web-security-hardening` for browser headers/XSS defenses, and `$skill-supply-chain-audit` when installing external skills.
