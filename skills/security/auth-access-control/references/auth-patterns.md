# Auth And Access Control Patterns

## Route Guard Model

Frontend route guard:

- Good for UX redirects and loading states.
- Not sufficient for security.

Backend/API guard:

- Required for every private route.
- Must verify authentication, authorization, tenant/object scope, and request method.

## Safe API Shape

- `GET /api/session`: returns minimal identity and permission summary; no sensitive business data.
- `GET /api/admin/...`: requires session and admin permission.
- `GET /api/tenants/:tenantId/...`: checks session tenant membership before query.
- `POST/PATCH/DELETE`: validates CSRF/session strategy, schema, permission, tenant, object, and audit logging.

## Tests To Add

- Anonymous direct URL to admin returns redirect or 401/403 with no data.
- Logged-in non-admin direct URL to admin returns 403 with no data.
- User from tenant A cannot read tenant B by changing URL/body IDs.
- Logout invalidates the session and private data fetches fail.
- Expired session fails closed.
- UI does not import/admin-fetch private modules before authorization.

## Prototype Caveat

For local demos, localStorage auth is acceptable only when:

- UI clearly treats it as a mock.
- No real user data or secrets are stored.
- Production notes say to replace it with real server/provider auth.
- Generated code keeps the same API boundary so real auth can replace the mock later.
