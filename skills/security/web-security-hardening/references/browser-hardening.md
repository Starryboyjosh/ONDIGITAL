# Browser Hardening Checklist

## Dangerous DOM Sinks

Search and review:

- `innerHTML`
- `outerHTML`
- `insertAdjacentHTML`
- `document.write`
- `eval`
- string-based `setTimeout` or `setInterval`
- dynamic `script.src`

Prefer:

- `textContent`
- `createElement`
- framework escaping defaults
- vetted sanitization when rich HTML is truly required

## Baseline Headers

Start with:

- `Strict-Transport-Security`
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy` when compatible
- `Cross-Origin-Resource-Policy` for owned resources where appropriate

## CORS

- Do not use `Access-Control-Allow-Origin: *` with credentials.
- Allow only trusted origins.
- Keep admin APIs same-origin when possible.
- Validate server-side regardless of CORS; CORS is not authorization.

## Third-Party Scripts

- Minimize analytics/tag managers.
- Prefer version-pinned scripts.
- Use Subresource Integrity when a script URL is immutable.
- Treat third-party scripts as having page-level access.
