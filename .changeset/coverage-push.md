---
'@ribrewguy/nuxt-openfeature': patch
---

**Tests:** raise overall coverage from 51.6% to 98.55% statements / 93.24% branches / 98.5% functions / 98.55% lines.

Added unit tests for every previously 0%-coverage file under `src/runtime/`:

- `server/utils/featureFlags.ts` — `getFeatureFlagContext` merge matrix and `evaluateFeatureFlag` dispatch (boolean/number/string/object/unsupported, timeout, error fallback).
- `runtime/utils/contextHeaders.ts` — single-header, chunked, and oversized-payload paths; key-order canonicalization determinism; base64url alphabet check.
- `server/api/feature-flags/{[key].get,index.get,diagnostics.get}.ts` — handler invocations with mocked `h3`/runtime config; provider-diagnostics delegation.
- `composables/useFeatureFlag.ts` — both `useFeatureFlags` and `useFeatureFlag`, including query-key composition, fetch wiring, default-value coercion, and slash trimming.
- `plugins/openfeature-context.client.ts` — `$fetch` wrapper attaches encoded headers, oversized-payload skip path, encoder-error warn path.
- `server/plugins/openfeature.server.ts` — Nitro plugin registers providers from runtime config and tolerates missing config.
- `components/FeatureFlag.vue` — slot rendering for enabled/fallback/pending states (uses `@vue/test-utils` + `happy-dom`).
- `runtime/server/plugins/flagsmith/index.ts` — full `buildFlagsmithProvider` + `fetchFlagsmithEnvironmentFlags` coverage including env-var fallbacks.

Strengthened existing partial coverage:

- `runtime/server/plugins/posthog/index.ts` (86.8% → 100%) — TYPE_MISMATCH and GENERAL-error paths for all four resolvers, `onClose` shutdown, `POSTHOG_KEY`/`POSTHOG_HOST` env fallbacks, non-Error throwables, non-object group/person property filtering.
- `runtime/server/plugins/vercel/index.ts` (90% → 100%) — separate install-hint test for the `/openfeature` subpath.
- `runtime/server/utils/providerRegistration.ts` (81.9% → 100%) — hybrid happy path (two successful providers → `MultiProvider` + `FirstMatchStrategy`), single-provider promotion, default `consoleLogger`, unknown-adapter fallback to `InMemoryProvider`.
- `src/utils/options.ts` (79.3% → 89.7%) — whitespace, missing-leading-slash, and `existingPublicOptions.flagRouteBase` fallback edge cases.

Tooling:

- Added `@vue/test-utils`, `happy-dom`, and `@vitejs/plugin-vue` as devDeps; configured Vitest with the Vue plugin and a `#imports` resolve alias pointing at `test/stubs/imports.ts` so `.vue` files load under unit tests without a Nuxt build.
- Added a `*.vue` ambient module declaration in `test/stubs/vue-sfc.d.ts` for TypeScript.

`FeatureFlag.vue` is now exercised at 100% line coverage. No source-file change to the published runtime in this entry — only tests and test tooling.
