# Phase 7 — Payments: maintainer handoff

Claude built the Stripe payments module in **isolated new files** (to avoid colliding with your
in-progress SiteSetting / block-type / AI-crawler work). Everything below is self-contained and
tested EXCEPT three small edits to shared files that only you should apply, listed here.

## New files (complete, typechecked, tested)

- `src/lib/stripe/client.ts` — lazy Stripe client + webhook secret accessor (Node runtime).
- `src/lib/stripe/checkout.ts` — one-time / subscription / donation Checkout Sessions (server sets
  price; donations use Stripe's bounded `custom_unit_amount`).
- `src/lib/stripe/webhook.ts` — `verifyEvent` (raw body + `constructEvent`) + idempotent `handleEvent`.
- `src/lib/stripe/entitlement.ts` — subscriber tokens (jose, **distinct `reader` audience** from the
  admin cookie), `verifyPostAccess(token)` with a **live subscription re-check** (canceled → denied
  immediately, regardless of token TTL).
- `src/lib/stripe/schemas.ts` — Zod payload for checkout.
- `src/app/api/checkout/route.ts` (PUBLIC), `src/app/api/webhooks/stripe/route.ts` (PUBLIC, raw body).
- `src/components/ManageSubscription.tsx` — links to Stripe's HOSTED portal login (env
  `NEXT_PUBLIC_STRIPE_PORTAL_URL`); renders nothing if unset.

## Model decisions (locked with the owner)

- **Paid content is SUBSCRIPTION-ONLY** — no one-time paid-post purchases. Entitlement = "does this
  email have an active subscription?". This removed the per-post access-token machinery and the last
  payment-related ESP dependency.
- **Stripe owns all payment emails + subscription management.** Receipts, renewal/failure/refund
  notices, and the customer portal (cancel, update card, invoices) are handled by Stripe's hosted
  portal + Stripe customer emails — the OWNER enables these in the Stripe Dashboard (Settings →
  Customer emails, and the Customer Portal config). The template sends NO billing emails and hosts NO
  portal auth. The old app-sent magic-link portal was DELETED (it was also an IDOR risk).
- `src/app/checkout/success/page.tsx`, `src/app/checkout/cancel/page.tsx`.
- `src/components/BuyButton.tsx` — reusable purchase button (redirects to Stripe Checkout URL).
- Tests: `test/unit/entitlement.test.ts`, `test/integration/stripe-webhook.test.ts` (real signatures).

The Order/Subscription DB entities + adapter methods + queries were already added across all three
adapters (before we split to isolated-files mode) and are covered by the contract-suite pattern.

## ⚠️ Three shared-file edits for YOU to apply

### 1. `src/proxy.ts` — keep payment routes PUBLIC
Do **NOT** add `/api/checkout`, `/api/webhooks`, or `/api/portal` (incl. `/api/portal/redeem`) to
`PROTECTED_API_PREFIXES` (they must be reachable unauthenticated — buyers aren't admins, the
webhook is called by Stripe, and the portal magic-link is clicked from an email). The webhook
especially must never be in the matcher, so middleware can't consume the raw body its signature
check needs. If you want an admin-only orders dashboard route later, add `/api/orders` to both lists.

Note the portal is a two-step magic-link flow (fixes an IDOR where an email lookup would hand out
another person's Stripe portal): POST `/api/portal` always returns a generic message and emails a
short-lived token; GET `/api/portal/redeem?token=` verifies it (proving inbox ownership) and opens
the portal. Requires the ESP (`EMAIL_PROVIDER`) to be configured to actually deliver the link.

### 2. `src/app/api/posts/[id]/content/route.ts` — wire real entitlement
The GET handler currently withholds paid bodies from everyone non-admin (safe default). To let an
active subscriber through, replace the `post.visibility === "paid"` denial with a subscription check
(`verifyPostAccess` takes just the token now — subscription grants ALL paid posts):

```ts
import { verifyPostAccess, ACCESS_COOKIE_NAME } from "@/lib/stripe/entitlement";
// ...
const isAdmin = await getAdminSession();
if (!isAdmin && post.status !== "published") return NotFound;
if (!isAdmin && post.visibility === "paid") {
  const token = req.nextUrl.searchParams.get("access")
    ?? req.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (!(await verifyPostAccess(token ?? undefined))) return NotFound;   // live sub re-check inside
}
```
Apply the same check in `src/app/posts/[slug]/page.tsx` (swap `entitled = visibility === "public"`
for `entitled = visibility === "public" || (await verifyPostAccess(token))`). A subscriber gets a
`post_access` cookie/token minted after they confirm their email against an active subscription
(you decide where to mint it — e.g. a small "unlock with your subscriber email" form that checks
`getActiveSubscriptionByEmail` then sets the cookie via `signSubscriberToken`).

### 3. `.env.local.example` — payments vars (append)
```
# Payments (only when NEXT_PUBLIC_FEATURE_PAYMENTS=true). The site OWNER's Stripe account.
# STRIPE_SECRET_KEY=sk_live_...            # server-only
# STRIPE_WEBHOOK_SECRET=whsec_...          # per-endpoint (Dashboard); CLI `listen` gives a different one for dev
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...   # only if you load Stripe.js client-side
# NEXT_PUBLIC_STRIPE_PORTAL_URL=https://billing.stripe.com/p/login/...   # Stripe-hosted portal login page
# ENTITLEMENT_SECRET=<32+ chars>           # signs subscriber access tokens; falls back to ADMIN_SECRET
```
Owner Dashboard setup (no code): enable **Settings → Customer emails** (receipts + subscription
notices) and configure the **Customer Portal**, then copy its **login page URL** into
`NEXT_PUBLIC_STRIPE_PORTAL_URL`. Stripe then sends all payment emails and hosts subscription
management — the template sends none.

## Local webhook testing
```
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # prints the whsec_ to use as STRIPE_WEBHOOK_SECRET
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
```
