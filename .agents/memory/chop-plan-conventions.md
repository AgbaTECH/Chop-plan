---
name: Chop Plan app conventions
description: Seeding, generated-hooks, and payment/subscription conventions for the Chop Plan app (artifacts/chop-plan + artifacts/api-server).
---

- Seed data via the `executeSql` CodeExecution callback, not standalone pg/node scripts.
- Generated React Query hooks (orval) that pass `enabled` need an explicit `queryKey` too — `enabled` alone doesn't stabilize the key.
- Customer-facing prices must always go through the hidden-platform-fee display-price helper; vendor-facing/payout paths use the raw stored price. Any new customer-facing read path (or payment charge amount) must use the display price, not the raw one.

## Paystack checkout (real payments)

A subscription is only ever created after Paystack confirms the charge succeeded — never speculatively. Activation (creating the subscription + its schedule) must be a single idempotent, transactionally-locked operation, since both the webhook and a client-triggered verify fallback can race to activate the same payment.

**Why:** per Paystack's own docs, webhooks are only reliably sent for successful transactions, and hosted-checkout `callback_url` redirects only fire on success too — declines are retried in-page on Paystack's own UI, and abandoned sessions never call back at all. A manual "verify with Paystack directly" endpoint is the only reliable way to learn a transaction never completed, so both that endpoint and the webhook must be able to safely race without double-creating a subscription.

**How to apply:** any future work touching subscriptions/payments (e.g. vendor withdrawals, recurring billing) should keep using the same idempotent activation path rather than inserting subscription rows directly elsewhere. Also always validate that a plan actually belongs to the vendor it's being purchased under before charging.

## Schema changes on the dev database

`drizzle-kit push` fails non-interactively (`Interactive prompts require a TTY`) whenever it detects a possible table/column rename — there's no flag to script past that prompt.

**Why:** its rename-disambiguation UI requires a real TTY; this environment can't provide one.

**How to apply:** for structural changes agents can safely author by hand (drop/add columns, new tables, enums), apply the DDL directly via the `executeSql` CodeExecution callback as one transactional script, then re-run `drizzle-kit push` once to confirm zero drift. There's no seed npm script in this project — run `seed.ts`-style scripts directly with any workspace package's `tsx` binary (pnpm's workspace symlinks make cross-package module resolution work regardless of which package's `tsx` you invoke from). Truncate affected tables first (`CASCADE`) so reseeding doesn't collide with old rows on unique constraints.

## Extending the payments table for new order types

`paymentsTable` was extended (rather than adding a parallel order table) to support a second purchase type (à la carte / off-schedule) alongside subscriptions, by adding an `orderType` discriminator column and making `planId` nullable.

**Why:** reusing the existing Paystack checkout/webhook/verify/idempotent-activation machinery avoided duplicating payment-provider integration and its race-safety guarantees (see the idempotent-activation entry above) for a second flow that's payment-shaped but not subscription-shaped.

**How to apply:** when adding another kind of paid purchase, branch `activatePaymentSuccess` on the discriminator column instead of writing a parallel activation path, and check the idempotency guard uses the generic `status === "success"` condition (not something type-specific like `subscriptionId` presence) so every order type short-circuits correctly under concurrent webhook/verify races.

## Resend email (OTP / password reset)

The project's Resend connection is in sandbox mode (no verified domain): sending from `onboarding@resend.dev` only succeeds when the recipient is the account owner's own verified email — sends to any other address fail with a 403. This is a real, current limitation, not a bug in app code.

**Why:** discovered while building signup-OTP/password-reset email delivery — every send to a test/customer address failed until domain verification is done in Resend's dashboard.

**How to apply:** don't trust "the email API call succeeded" during dev testing unless sending to the account owner's address; use a temporary server-side log of the generated code (removed before shipping) or a DB query to get the plaintext-equivalent for manual verification instead. A follow-up task tracks doing the domain verification for real delivery.

## Object storage uploads (Kitchen Profile / meal photos)

This app has its own custom Bearer-token session auth (`requireAuth("vendor")`), not Replit Auth — the `object-storage-web` skill template's `useUpload` hook does a raw unauthenticated `fetch` for step 1 (requesting the presigned URL), which silently fails here.

**Why:** the skill assumes Replit Auth's cookie-based session, which rides along automatically with `fetch`; a custom Bearer-token scheme needs the token attached explicitly.

**How to apply:** don't wire the template's `ObjectUploader`/`useUpload` directly in apps with custom token auth. Instead write a small custom hook that calls the generated, auth-aware API client function for the "request upload URL" step (so the Bearer token is attached automatically), then does a plain unauthenticated `fetch` PUT to the returned presigned URL for the actual bytes. Store the resulting fully-servable path (e.g. `/api/storage/objects/uploads/<uuid>`) directly in the DB field, matching whatever convention existing image fields already use, so read-side rendering needs zero changes.

Also: seeded demo vendor accounts here have `verified=false`, which blocks login — any DB-side testing of a vendor flow needs a temporary `UPDATE vendors SET verified = true` (and revert after) to log in as one. Same applies to demo user/customer accounts.

## Security hardening (passwords/OTPs, CORS, rate limits)

Password and OTP hashing migrated from SHA-256+hardcoded-salt to bcrypt (bcryptjs), with legacy-hash detection (64-char hex vs. bcrypt's `$2` prefix) so old accounts keep working and get transparently rehashed to bcrypt on next successful login — no forced password reset.

**Why:** avoids a disruptive mass password reset while still closing the weak-hashing gap; legacy and bcrypt hash formats never collide so detection is unambiguous.

**How to apply:** any new place that creates or checks a password/OTP hash must go through the shared helpers in `sessions.ts`/`otp.ts` (`hashPassword`, `verifyAndMaybeUpgradePassword`, the otp equivalents) rather than hashing inline — this includes seed scripts (`seed.ts` imports the same `hashPassword`).

CORS is an allowlist (Replit dev/prod domains from `REPLIT_DOMAINS`/`REPLIT_DEV_DOMAIN`, plus localhost in dev) instead of a wildcard, since the web app and API share an origin via path-based proxy routing and never need arbitrary cross-origin browser access. A JSON-returning error handler was added in `app.ts` so a rejected CORS origin (or any other unhandled error) gets a clean 403/500 instead of Express's default HTML page with a leaked stack trace/file paths.

Login/signup/OTP-request/OTP-verify/withdrawal endpoints have IP-based rate limits (`lib/rate-limit.ts`, via `express-rate-limit`) as a coarse first line of defense against brute-forcing passwords or the 6-digit OTP codes.

## Rebuilding `lib/db`'s dist after a schema change

When `artifacts/api-server` typecheck fails with `TS6305: Output file '.../lib/db/dist/index.d.ts' has not been built from source file` right after editing `lib/db/src/schema/*`, deleting and rebuilding just `dist/` is not enough.

**Why:** `lib/db`'s `tsconfig.json` is `composite: true` with incremental builds; a stale `tsconfig.tsbuildinfo` at the package root makes `tsc` think the (now-deleted) output is still current, so it skips re-emitting and `dist/` stays empty/stale.

**How to apply:** from `lib/db/`, run `rm -f tsconfig.tsbuildinfo && rm -rf dist && npx tsc -p tsconfig.json`, then re-run the dependent package's typecheck. Deleting `dist` alone without also deleting `tsconfig.tsbuildinfo` silently no-ops.

## Dev vs. production database

Dev and the published production deployment use separate databases — a dev-only data fix (`executeSql`, seed reruns, manual UPDATEs) never reaches prod, and vice versa.

**Why:** confirmed by directly querying both; a stale-image-path data bug fixed in dev via SQL was still present in prod's database after the fix, since they don't share storage.

**How to apply:** any one-off data repair (not just schema/code) needs either a permanent idempotent maintenance endpoint (safe to call once against prod after publish) or a manual prod SQL pass — a dev-side fix alone is not enough. Always verify by querying prod directly rather than assuming symmetry with dev.

## Auth state must be read synchronously on mount, not in a `useEffect`

`AuthProvider`'s token/role/name state must be initialized straight from `localStorage` in the `useState` initializer (`useState(() => localStorage.getItem(...))`), not read inside a `useEffect` that runs after the first render.

**Why:** reading in a `useEffect` leaves `isAuthenticated` false for the very first render after every page load/hard refresh. Any layout/page that guards routes by checking `isAuthenticated` on mount (a pattern used per-page here instead of one shared `ProtectedRoute`) would see "logged out" for that first render and redirect to login — even though a valid token existed in storage the whole time. This presented as "refreshing the dashboard logs you out."

**How to apply:** any new auth/session context in this codebase (or a similar per-page-guard pattern) must hydrate its initial state synchronously from storage, never lazily via an effect.
