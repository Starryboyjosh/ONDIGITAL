---
name: web-security-hardening
description: Harden browser-facing web apps against XSS, unsafe cookies, missing security headers, clickjacking, unsafe postMessage, CORS mistakes, third-party script risk, and privacy leaks. Use for HTML/static apps, SaaS web apps, deployment config, CSP, secure cookies, and production web security review.
---

# Web Security Hardening

## Overview

Apply browser defenses incrementally. Start with low-risk hygiene, then add report-only policies before enforcing strict headers on existing apps.

## Quick Wins

- Serve production over HTTPS.
- Use secure cookies: `HttpOnly`, `Secure`, `SameSite=Lax` by default; prefer `__Host-` cookie prefix when possible.
- Prevent clickjacking with `Content-Security-Policy: frame-ancestors 'self'` or `X-Frame-Options`.
- Add `X-Content-Type-Options: nosniff`.
- Use a tight `Referrer-Policy`.
- Use `Permissions-Policy` to disable unused features such as camera, microphone, geolocation, and payment.
- Avoid dangerous DOM sinks and inline event handlers.
- Validate `postMessage` origins and never use `*` for sensitive messages.

## CSP Rollout

1. Inventory inline scripts/styles, third-party origins, OAuth/payment popups, iframes, and embeds.
2. Add `Content-Security-Policy-Report-Only` first on existing apps.
3. Collect reports and filter browser-extension/noise.
4. Replace unsafe inline scripts with nonces/hashes or external files.
5. Enforce CSP after core flows pass.

## Static HTML Caveat

Static HTML can demonstrate UI, but production security headers must be configured in the server, CDN, hosting provider, or framework middleware. A `<meta http-equiv>` CSP is weaker and cannot express every deployment control.

## References

Read `references/browser-hardening.md` for header and DOM sink checklist.
