---
name: auth-access-control
description: Implement or review secure authentication, authorization, RBAC/ABAC, tenant isolation, protected admin routes, sessions, login/logout, password reset, passkeys, and role-gated UI. Use when an app has admin panels, dashboards, multi-user SaaS, private routes, or any concern that privileged screens load before login.
---

# Auth Access Control

## Overview

Build auth as a server-enforced system, not a frontend illusion. The browser may improve UX by hiding unavailable controls, but the server/API must be the authority.

## Hard Rule

Never mount or fetch privileged admin data before the server confirms the current user is authenticated and authorized for that exact operation, tenant, and object.

## Implementation Workflow

1. Define identities: anonymous, user, staff/admin, owner, service account.
2. Define resources and actions: view, create, update, delete, export, invite, bill, configure, impersonate.
3. Define policy in one place: role permissions, tenant ownership, object ownership, and special admin constraints.
4. Protect server/API routes first. Frontend route guards are secondary UX only.
5. Split public and private boot paths so login pages do not import or execute admin app modules unless authorized.
6. Add tests for unauthenticated, wrong role, wrong tenant, wrong object, expired session, and logout.
7. Log privileged actions without leaking secrets.

## Admin Loading Pattern

- Public login shell loads only public assets, login form, and auth bootstrap.
- Auth bootstrap calls a minimal session endpoint such as `/api/session`.
- If unauthenticated, stay on login and do not import admin modules.
- If authenticated, fetch profile/permissions.
- If authorized, dynamically load the private app shell and then fetch scoped data.
- If unauthorized, show a safe "sin acceso" state without exposing admin payloads.

## Anti-Patterns

- Admin dashboard HTML/JS bundled into the login page when the app has real privileged data.
- `if (localStorage.isAdmin)` or `sessionStorage.role` as production authorization.
- Hiding admin links with CSS while routes and APIs remain callable.
- Filtering tenant data client-side after downloading all tenants.
- Trusting user IDs, company IDs, roles, prices, or permissions submitted by the browser.
- Using predictable IDs as the only barrier to reading records.

## References

Read `references/auth-patterns.md` for concrete route/API/test patterns.
