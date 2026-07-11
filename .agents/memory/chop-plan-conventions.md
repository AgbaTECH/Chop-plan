---
name: Chop Plan app conventions and sandbox quirks
description: DB seeding approach and a generated-hook typing quirk relevant to any pnpm-monorepo artifact using @workspace/api-client-react + Drizzle/Postgres.
---

- The CodeExecution sandbox's plain Node context cannot import the `pg` npm package, and running compiled server scripts (e.g. `node dist/index.mjs`) outside the workflow fails because `PORT` isn't set there. For one-off DB seeding/fixes from the agent, use the `executeSql` callback with parameterized/escaped SQL instead of writing a Node/Drizzle script.
  **Why:** confirmed by repeated failures trying both approaches during a data-seeding pass.
  **How to apply:** when asked to seed or backfill data in a Postgres-backed artifact, reach for `executeSql` first rather than authoring a seed script.

- Generated react-query hooks from `@workspace/api-client-react` (orval-style codegen) that accept a dynamic path param (e.g. `useGetBlogPost(id, { query: { enabled } })`) require an explicit `queryKey` in the `query` options when `enabled` is also passed — TS complains `Property 'queryKey' is missing` otherwise. Import the paired `getGet<X>QueryKey(id)` helper and pass `queryKey: getGet<X>QueryKey(id)`.
  **Why:** the generated types don't infer a default queryKey once you override `query` with `enabled`.
  **How to apply:** anywhere you conditionally fetch by a parsed route param with one of these generated hooks.

- `seed.ts` inserts fixture rows directly rather than going through the runtime create routes, so any feature that generates derived rows on creation (e.g. a schedule/ledger table populated when a parent record is created) needs its generation logic added to the seed script too, or fixture data silently diverges from what real usage produces.
  **Why:** the seed script and the live API are separate code paths; adding logic to one doesn't propagate to the other automatically.
  **How to apply:** whenever a "generate related rows on create" feature is added anywhere in this app, check `seed.ts` for the same entity and update it in the same change, reusing the shared helper the runtime route uses rather than re-deriving the logic.
  Also seed a bootstrap admin/owner account (using a secret-provided password, e.g. `process.env.ADMIN_PASSWORD`, with a dev-only fallback) whenever an admin-gated area is added, so a fresh environment has usable credentials immediately.
