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
