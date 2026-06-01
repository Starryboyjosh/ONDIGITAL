# OWASP-Oriented Release Checklist

## Access Control

- Deny by default on every server/API route.
- Check object ownership for every record by ID.
- Enforce tenant/company scope in the query, not after fetching.
- Test by changing IDs, tenant IDs, role flags, and direct URLs.
- Do not send admin payloads to the browser until authorization passes.

## Authentication And Sessions

- Use secure server-side or provider-managed sessions for production.
- Rotate session identifiers after login and privilege changes.
- Invalidate sessions on logout, idle timeout, and absolute timeout.
- Rate-limit login, password reset, and OTP/passkey endpoints.
- Use generic failure messages to reduce account enumeration.

## Input, Output, And Injection

- Validate inputs at API boundaries with schemas.
- Use parameterized database queries or ORM-safe APIs.
- Escape output by default.
- Avoid dangerous DOM sinks: `innerHTML`, `outerHTML`, `document.write`, string-based `setTimeout`, `eval`.

## Secrets And Data

- Keep API keys, service credentials, JWT signing keys, database URLs, and webhooks server-side.
- Never store long-lived tokens in localStorage.
- Mask sensitive values in logs and error reports.
- Keep backups and exports permissioned.

## Dependencies And Deployment

- Run dependency audit tooling when available.
- Remove default credentials, sample admin users, debug routes, verbose stack traces, and seed-only shortcuts.
- Configure security headers, HTTPS, and secure cookies.
- Add audit logs for privileged actions.
