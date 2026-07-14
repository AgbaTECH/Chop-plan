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
