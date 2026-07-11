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
