---
name: backend-api-production
description: Design production backend and API layers for ONDIGITAL apps, SaaS dashboards, management systems, Firebase/Supabase/Postgres migrations, tenant-aware data, auth, audit logs, jobs, integrations, and replacing browser-only prototypes with real server-side security.
---

# Backend API Production

## Overview

Use this skill when an ONDIGITAL prototype needs a real backend boundary. The goal is to move security, validation, tenant isolation, data integrity, and integrations out of the browser and into an API, database rules, or managed backend.

Pair with `skills/data/database-system/SKILL.md`, `skills/security/auth-access-control/SKILL.md`, `skills/security/app-security-review/SKILL.md`, and `skills/testing/qa-automation/SKILL.md`.

## Backend Choice

Choose the smallest backend that can enforce the product's trust boundary:

| Product state | Default backend | Use when |
|---|---|---|
| Demo only | Static HTML plus local mock data | No real users, no real private data, sales demo only |
| Firebase-first MVP | Firebase Auth, Firestore rules, Cloud Functions | Realtime CRUD, small team, low ops budget |
| Relational SaaS | Supabase/Postgres or Node/Fastify/Postgres | Reporting, payments, inventory, multi-tenant joins |
| Custom API | Fastify/Nest/FastAPI plus Postgres | Complex workflows, integrations, jobs, audit trails |
| Mobile plus web | API-first backend plus typed client SDK | Flutter/web clients share the same business rules |

Do not keep patient, payment, payroll, tenant, admin, or inventory authorization only in client JavaScript.

## Production Workflow

1. Map actors, tenants, data classes, and privileged actions.
2. Define API resources before endpoints: users, tenants, customers, patients, appointments, invoices, payments, inventory items, suppliers, audit events.
3. Write an auth model: identity provider, roles, permissions, tenant membership, session lifetime, password reset, admin recovery.
4. Define validation schemas at the API edge. Reject unknown or malformed fields by default.
5. Design server-side tenant isolation. Every query must be constrained by authenticated tenant context.
6. Add audit logs for create/update/delete on private, financial, clinical, and admin data.
7. Add background jobs for reminders, sync, exports, webhook retries, stock alerts, invoice numbering, and backups.
8. Publish an API contract with OpenAPI or typed route definitions before building wide UI surfaces.
9. Build tests for auth, tenant isolation, input validation, destructive actions, and replay/idempotency.

## API Rules

- Use resource URLs: `/api/v1/patients/{id}/appointments`, not `/getPatientAppointments`.
- Use consistent JSON envelopes for success and errors.
- Return 401 for unauthenticated, 403 for authenticated but unauthorized, 404 only when the caller may not learn whether a resource exists.
- Use idempotency keys for payments, imports, outbound messages, and external webhooks.
- Use cursor pagination for growing records; offset pagination is acceptable only for small admin lists.
- Never expose internal auto-increment IDs as authorization checks. Public IDs are identifiers, not permissions.
- Validate server timestamps, totals, discounts, taxes, commissions, and inventory movement calculations on the server.
- For fiscal billing, generate canonical invoice artifacts server-side. Printable PDFs/receipts must be derived from immutable fiscal data such as XML, authorization codes, tax breakdowns, and issue timestamps.

## ONDIGITAL Minimum Backend Contract

For any production SaaS or management app, deliver these artifacts:

- Entity map with tenant ownership and sensitivity classification.
- Auth/RBAC matrix covering admin, staff, owner, client, and support roles.
- API route list with method, auth, validation schema, and audit requirement.
- Data model with indexes, unique constraints, and migration notes.
- Security rules or server middleware strategy.
- Seed/demo-data strategy separate from production data.
- Backup, export, deletion, and retention plan.
- Test plan covering API, UI, and security smoke paths.

## Honduras Fiscal Billing Backend

For Honduras billing, POS, collections, or invoice modules, assume the backend must be ready for SAR electronic invoicing and autoimpresor workflows. Verify current SAR rules before production release because taxpayer scope, deadlines, schemas, and integration details may change.

Minimum backend responsibilities:

- Store fiscal profile data for each tenant: RTN, legal name, billing regime, autoimpresor/electronic status, and SAR authorization metadata.
- Generate fiscal XML as the canonical invoice document when electronic issuance applies.
- Keep CAI and CAEE fields separate. CAI supports authorized print ranges; CAEE identifies/authorizes electronic fiscal documents.
- Track SAR submission and validation state: draft, submitted, authorized, rejected, canceled/voided, printed/sent.
- Preserve authorized invoice data immutably: XML/hash, buyer/seller RTN, document type, sequence, ISV/tax breakdown, totals, issue date/time, authorization code, and SAR response.
- Archive issued invoices, XML, printable representation, delivery evidence, and audit events for at least 5 years or the current legal retention period, whichever is stricter.
- Add tests for XML generation, authorization status transitions, duplicate numbering, retention metadata, and forbidden edits after authorization.

## Firestore Specifics

For Firebase projects, Firestore rules must enforce:

- `request.auth != null` for all private collections.
- Tenant membership lookup that cannot be self-assigned by the client.
- `companyId` immutability after create unless a privileged server path changes it.
- Role checks for admin-only user, config, procedure, price, and payment writes.
- Field allowlists and type checks for every sensitive collection.
- Deny-by-default fallback after explicit collection rules.

If rules cannot express a business invariant, move that write to Cloud Functions or a custom API.

## External Source Notes

This skill is an ONDIGITAL house copy informed by community patterns, not a vendored third-party bundle. See `skills/registry/skill-registry-audit/references/open-source-skill-map.md` for source decisions.
