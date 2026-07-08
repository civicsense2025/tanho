# Team / Staff Management — Executive Summary

**Date:** 2026-07-07
**Status:** Planning complete. Ready for Tier 1 implementation.
**Full spec:** `TECH-SPEC.md`

---

## What we're building

A full team/staff management system for the admin panel: custom roles with a permission matrix, email invitations with a secure accept flow, TOTP 2FA, and a session management UI. Built on top of the existing `users` table — linked, not merged, with `people`.

## Why

Today the platform has a two-role model (`owner` / `editor`) and no way to invite staff from the web (only the first-owner bootstrap creates admins). There is no role management, no MFA, and no session management. As the team grows, this is both a usability blocker and a security gap.

## How — three tiers, each independently shippable

| Tier | What | Size | Demo |
|---|---|---|---|
| **1** | Schema + system roles + invite/accept + permission-aware guards | M (~1 wk) | Owner invites a staff member by email; invitee accepts, logs in, constrained by role |
| **2** | Custom role CRUD + session management + account self-service | M (~1 wk) | Owner creates a "Content Lead" role with a permission subset; staff manage their own sessions |
| **3** | TOTP 2FA (enroll, verify, backup codes, org-wide enforcement) | L (~1.5 wks) | Staff enroll an authenticator app; login requires TOTP; owner can require MFA org-wide |

## Key design decisions

1. **Link, don't merge** — staff stay in `users`; a nullable `personId` FK links to a CRM profile. Preserves the documented auth boundary.
2. **Custom roles + permissions** — `roles` + `permissions` + `role_permissions` junction. Five system roles seeded (Owner/Editor/Author/Moderator/Viewer); owners create custom roles.
3. **Zero call-site edits (reusable abstraction principle)** — `requireUser("owner")` is called in ~140 places. The permission resolver is the single choke point; existing call sites are untouched. New actions use a `withPermission()` wrapper (1 line vs 3). UI uses `<PermissionGate>` + `usePermissions()`. Tests use a `createTestUser()` factory. One abstraction changes, zero call sites edit.
4. **Reuse existing primitives** — signed tokens, sessions, audit, argon2, rate-limit. Two new deps only: `otplib`, `qrcode.react`.
5. **Security hardening (secure-review)** — spec reviewed through Sentinel's CWE-mapped knowledge base. 9 findings addressed: privilege escalation via role injection (CWE-269), mass-assignment on accept-invite (CWE-915), IDOR on session management (CWE-639), fail-closed permission resolver (CWE-440), MFA pending cookie cross-user attack (CWE-384), backup code double-spend race (CWE-362), no secrets in audit log (CWE-532), rate-limiting public endpoints (CWE-307), constant-time backup code comparison (CWE-208). See `TECH-SPEC.md` §9.

## Top 3 risks

1. **Breaking the ~140 `requireUser("owner")` call sites** — mitigated by additive `AdminUser` type + backward-compat resolver; `typecheck` catches breakage.
2. **MFA login branch breaking existing logins** — mitigated by opt-in per user; unenrolled users hit the unchanged path.
3. **Privilege escalation via role injection** — mitigated by server-side validation that target role's `team:owner` sentinel requires caller to be owner (CWE-269).

## Day 0 (tomorrow morning)

1. Create branch `feat/team-management` off `feat/block-style-layer`.
2. Add the schema.ts deltas (`users` columns, `roles`/`permissions`/`role_permissions`) and re-export through `src/lib/db/schema/index.ts`.
3. Run `npm run db:generate`; review the generated migration SQL.
4. Write `seed/team.ts` (permission catalog + system roles + existing-user backfill); run `npm run seed:reset` to verify.
5. Resolve the 5 open questions in `TECH-SPEC.md` §11 with the team.

## Open questions for the team

1. Should the first owner get a linked `people` profile on install? (Default: yes.)
2. Fixed permission catalog (~20 keys) vs freeform? (Default: fixed.)
3. MFA enforcement: org-wide + per-role override? (Default: yes.)
4. Can invited staff set their own name on accept? (Default: owner-set, editable later.)
5. MFA enforcement grace period? (Default: 7 days.)

## Testing

Full test pyramid (e2e-test-engineer workflow): ~70% unit/integration (Vitest, file-backed temp DB + drizzle migrate), ~20% integration (full action flows against temp DB), ~10% E2E (Playwright, critical user journeys through the browser). Reusable `createTestUser()` + `setupTestDb()` test helpers eliminate per-file boilerplate. 90% coverage thresholds for auth + MFA modules. See `TECH-SPEC.md` §8 for the full test matrix including CWE-mapped security test cases. Verification: `npm test`, `npm run test:e2e`, `npm run typecheck`, `npm run lint`, `npm run db:generate`, `npm run db:migrate`, `npm run seed:reset`.
