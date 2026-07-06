# Security

## Reporting

Report vulnerabilities privately via GitHub Security Advisories for this
repository (Security → Advisories → Report a vulnerability). Please do not
open public issues for security reports.

## Posture

- All database access goes through Drizzle ORM parameterized queries; every
  write is zod-validated (including block/form JSON payloads).
- Rich text is sanitized server-side with an allowlist before rendering;
  embeds are restricted to an allowlist of providers in sandboxed iframes.
- Sessions are opaque tokens stored hashed; passwords use argon2id; admin
  and reader sessions are separate cookies (httpOnly, SameSite=Lax).
- Membership-gated content is enforced in the server renderer — gated blocks
  are never serialized into HTML or RSC payloads for unauthorized viewers.
- Stripe webhooks are signature-verified and idempotent (event-id ledger);
  amounts are integer cents and prices never come from the client.
- Uploads are MIME/extension allowlisted with size caps and randomized
  storage keys. SVG uploads are accepted only after server-side sanitization
  (DOMPurify SVG profile: scripts, event handlers, `<foreignObject>`, `<use>`,
  external references, and `javascript:` URLs are stripped before the file is
  stored) and are served with a restrictive CSP (`sandbox`) and rendered
  exclusively via `<img>`/`<link rel=icon>`, which do not execute embedded
  script. Font uploads (woff2/woff/ttf/otf) are allowlisted and served as
  static assets; their bytes are parsed only for metadata (fontkit).
- Integration credentials are AES-GCM encrypted at rest with a key from the
  environment; secrets never reach the client.
