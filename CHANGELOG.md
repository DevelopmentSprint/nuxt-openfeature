# Changelog

## 0.2.4

### Patch Changes

- 0813609: **Fix:** make module config layer-aware. Previously, `openFeature` config defined in a parent Nuxt layer was silently dropped — the module only read the final app's `nuxt.options.openFeature` and relied on Nuxt's default `defu`-based merging, which overwrites arrays rather than concatenating and (for arbitrary module config keys) may not populate from the layer chain reliably.

  The module now walks `nuxt.options._layers` explicitly and merges with deterministic semantics:

  | Field           | Merge rule                                                                                                                                            |
  | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `providers`     | Concatenated **app-first** across the chain. App-layer providers appear FIRST so they win under `FirstMatchStrategy`. Parent layers act as fallbacks. |
  | `publicFlags`   | Deep-merged, child layers win on key collision.                                                                                                       |
  | `flagRouteBase` | Last-defined wins (app overrides parent).                                                                                                             |

  A new integration test (`test/integration/layers.integration.test.ts`) builds a real Nuxt fixture with `extends:` to a parent layer that defines providers + `publicFlags`. The app declares no `openFeature` config. The test verifies `runtimeConfig.openFeature` is populated entirely from the parent layer — this is the exact case that was silently broken before.

  **Docs cleanup shipped alongside:**

  - **TOC ordering** — all docs files renamed with Nuxt Content v3 numeric prefixes (`1.installation.md`, `2.configuration.md`, etc.). Top-level directories follow the same convention. The layout's hardcoded priority map is removed since Nuxt Content's natural sort now handles ordering. URLs are unchanged (prefixes are stripped from slugs).
  - **Escape artifacts** — `\\|` in the configuration reference tables corrected to `\|`. Previously these rendered as literal `\|` instead of `|`.
  - **`publicFlags` documentation** — dedicated section explaining what it does (allowlist + type contract + worst-case fallback), why it's separate from provider config, the common pitfall of seeing `{ flags: {} }` from the batch endpoint, and how to choose the default value.
  - **Nuxt Layers section** — documents the merge semantics with examples, including how to add an override provider on top of a parent layer's defaults.

  **Code surface:** new exported helper `mergeOpenFeatureLayerOptions` in `src/utils/options.ts`. The module's `setup` now passes layer-merged options through `normalizeOpenFeatureOptions`. Backwards compatible for non-layered projects.

## 0.2.3

### Patch Changes

- 7153ece: **Feature:** expose all three Vercel provider configuration paths and document them on the docs site.

  ### Code

  The Vercel provider wrapper now supports three configuration paths, all backwards compatible:

  1. **Env-driven (Path 1, existing)** — set `FLAGS=flags:?sdkKey=vf_server_...` (Vercel's auto-provisioned env var) and configure with `{ type: 'vercel' }`. `@vercel/flags-core` lazily reads `process.env.FLAGS`.
  2. **Explicit connection string (Path 2, new)** — pass via `options.connectionString`:
     ```ts
     { type: 'vercel', options: { connectionString: process.env.MY_FLAGS_KEY } }
     ```
     Accepts both URI form (`flags:?sdkKey=vf_server_...`) and raw SDK key (`vf_server_...`). Passes directly to `new VercelProvider(connectionString)`.
  3. **Pre-built `FlagsClient` (Path 3, existing — moved namespace)** — pass via `providerOptions.flagsClient`. For advanced use (custom polling/streaming, shared clients, testing stubs).

  Resolution order: explicit `flagsClient` > explicit `connectionString` > env-driven default. Backwards compatible: `{ type: 'vercel' }` with no options still works exactly as in 0.2.2.

  Naming aligns with peer providers — credentials in `options`, behavior tweaks in `providerOptions`:

  | Provider   | Credential slot                            | Behavior slot                           |
  | ---------- | ------------------------------------------ | --------------------------------------- |
  | Flagsmith  | `options.environmentKey`, `options.apiUrl` | `providerOptions.useFlagsmithDefaults`  |
  | PostHog    | `options.apiKey`, `options.host`           | `providerOptions.sendFeatureFlagEvents` |
  | **Vercel** | **`options.connectionString`**             | `providerOptions.flagsClient`           |

  ### Docs

  - **`docs/content/providers/vercel.md`** — full rewrite to document all three paths with examples and a "when to use which" matrix. Explains the connection-string format and that there is no separate team/project/token config (it's all encoded in the SDK key).
  - **`docs/content/getting-started/configuration.md`** — backfilled PostHog `options` table, PostHog `providerOptions` table, Vercel `options` table, Vercel `providerOptions` table. Added PostHog and Vercel sections to the Environment Variables reference. Updated the cross-provider `options`/`providerOptions` row to include Vercel.

  ### Tests

  7 new path-specific test cases in `test/unit/providers/vercel.test.ts`:

  - Path 1: no options → default `flagsClient` used
  - Path 1: empty objects also fall through to default
  - Path 2: connection string (URI form) passed directly to constructor
  - Path 2: raw SDK key form also accepted
  - Path 3: pre-built `flagsClient` passed directly
  - Precedence: `flagsClient` wins over `connectionString`
  - Precedence: `connectionString` wins over env-driven default

  181/181 tests passing.

## 0.2.2

### Patch Changes

- 29c52c3: **Fix:** silence consumer-bundler "could not be resolved – treating it as an external dependency" warnings for optional provider SDKs.

  `0.2.1` (bead `cfb`) moved optional SDK imports from static to dynamic `await import('posthog-node')`, which fixed the runtime hazard but left the warning intact because Rollup/Vite statically analyzes dynamic imports with literal-string arguments. When the consumer hadn't installed the optional peer, Rollup still warned at build time even though the runtime path was sound.

  This patch defeats the static analysis via variable-string indirection:

  ```ts
  const posthogSpecifier = "posthog-node";
  const mod = (await import(posthogSpecifier).catch(() => {
    throw new Error(
      "PostHog provider configured but 'posthog-node' is not installed. Run: pnpm add posthog-node"
    );
  })) as typeof import("posthog-node");
  ```

  Rollup leaves dynamic imports with non-literal arguments completely untouched and emits no resolution warning. The `as typeof import(...)` cast restores typing; the `import type` declarations at the top of each plugin keep the IDE happy.

  **Empirically verified** against an isolated Rollup build:

  - `0.2.1` dist → `(!) Unresolved dependencies` warning for `@vercel/flags-core`, `@vercel/flags-core/openfeature`, `posthog-node`, `flagsmith-nodejs`, `@openfeature/flagsmith-provider`.
  - This patch's dist → zero warnings.

  Same dynamic-import boundary as `0.2.1`: runtime behavior is identical, install hints still fire if a configured provider's SDK is missing. Affects three files: `src/runtime/server/plugins/{posthog,vercel,flagsmith}/index.ts`. Existing 176 unit/integration tests still pass (vitest mocks resolve by module specifier, which is unchanged regardless of literal-vs-variable).

## 0.2.1

### Patch Changes

- 3c969f5: **Tests:** raise overall coverage from 51.6% to 98.55% statements / 93.24% branches / 98.5% functions / 98.55% lines.

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

- ded2bfd: **Chore:** upgrade `eslint` 9.39.2 → 10.4.0 and `@eslint/js` 9.39.4 → 10.0.1.

  Supersedes Dependabot PR #75. Deferred from the dp7 upgrade sweep because major linter bumps historically require config migration; turned out our flat-config (`eslint.config.mjs`) uses only `js.configs.recommended` + `@typescript-eslint/parser`, so no rule or plugin migration is needed. `pnpm lint` and `pnpm docs:lint` pass clean under eslint 10 with the existing config.

  Dev-only tooling — no impact on the published runtime.

- 3c969f5: **Fix:** eliminate consumer-build "could not be resolved" warnings for unresolved optional provider SDKs.

  Plugin wrappers (`runtime/server/plugins/{posthog,vercel,flagsmith}/index.mjs`) previously used static top-level `import` statements for their optional peer SDKs (`posthog-node`, `@vercel/flags-core`, `@vercel/flags-core/openfeature`, `flagsmith-nodejs`, `@openfeature/flagsmith-provider`). Consumer bundlers walking the dynamic-import target emitted warnings — and a future bundler pre-load could surface as `ERR_MODULE_NOT_FOUND` at runtime even when the affected provider was never configured.

  The closed bead `nuxt-openfeature-37o` lazy-loaded the plugin wrapper file but left the SDK imports inside the wrapper static. This change moves the lazy boundary one layer deeper so optional SDKs are only imported when the provider is actually built.

  - SDK value imports converted to `await import(...)` inside `buildXxxProvider`.
  - Type-only references migrated to `import type` (zero runtime).
  - Each dynamic import wraps a `.catch(...)` that throws a precise install hint (e.g. `"PostHog provider configured but 'posthog-node' is not installed. Run: pnpm add posthog-node"`) instead of an opaque module-resolution stack trace.
  - `build.config.ts` `externals` list backfilled with `posthog-node`, `@vercel/flags-core`, and `@vercel/flags-core/openfeature` for internal consistency.
  - New regression test (`test/unit/providers/dynamicSdkImport.test.ts`) verifies the plugin wrapper files load when their optional peers are absent, and that `buildXxxProvider` then throws the install hint without leaking option values.

  **Public surface:** `buildPosthogProvider`, `buildVercelProvider`, and `buildFlagsmithProvider` are now `async` and return `Promise<Provider>`. The adapter registry already `await`s these, so module consumers are unaffected. Direct callers (if any) must `await` the result.

- 61f1f83: **Release infra:** unify versioning and publishing into a single `changesets.yml` workflow.

  The previous `changesets.yml` only created the version PR; a separate `publish.yml` was supposed to handle npm publish on tag push. But `changesets.yml` had no `publish:` directive configured, so it never created the `vX.Y.Z` tag — meaning `publish.yml` never fired and releases stalled at the version-bump commit on `main`.

  This consolidation:

  - `changesets.yml` now declares `id-token: write`, configures `actions/setup-node` with `registry-url`, and passes `publish: pnpm release` to `changesets/action@v1`. After a release PR merges, the action calls `pnpm release` (alias for `changeset publish`) which both pushes the `vX.Y.Z` tag and runs `npm publish` with provenance.
  - `package.json#publishConfig.provenance: true` ensures `npm publish` always includes provenance attestation, no flag needed.
  - `publish.yml` removed; the tag-push pipeline is no longer needed.
  - `REPOSITORY_SETUP.md` updated to point npm Trusted Publisher at `changesets.yml` (was `publish.yml`).
  - `scripts/oss/setup-branch-protection.sh` no longer lists `analyze (javascript-typescript)` as required (it stopped running on PRs after the CI consolidation; was already removed from live branch protection).

  **Action required:** the npm Trusted Publisher config on the package (npmjs.com → package access) must be updated to reference `changesets.yml` instead of `publish.yml`. Without that update, the next release will fail at npm publish with an unauthorized error.

- b8226ec: **Chore:** coordinated package upgrade sweep — supersedes 13 individual Dependabot PRs that were blocked by lockfile sync and Nuxt 4.4 type skew.

  Bumps in one coherent change so peer-deps line up across the graph:

  **Root devDependencies:**

  - `nuxt` 4.3.1 → 4.4.6 (was #78)
  - `@nuxt/kit` 4.3.1 → 4.4.6 (was #86)
  - `vue` 3.5.33 → 3.5.34 (was #83)
  - `vue-tsc` 3.2.7 → 3.3.0 (was #68)
  - `@tanstack/vue-query` 5.100.7 → 5.100.10 (was #84)
  - `@typescript-eslint/parser` 8.59.1 → 8.59.4 (was #81)
  - `h3` 1.15.5 → 1.15.11 (was #71)
  - `posthog-node` 5.33.0 → 5.34.4 (was #85)
  - `@changesets/cli` 2.29.8 → 2.31.0 (was #70)

  **Docs devDependencies:**

  - `nuxt` 4.4.4 → 4.4.6 (was #77)
  - `tailwindcss` 4.2.4 → 4.3.0 (was #80)
  - `@iconify-json/simple-icons` 1.2.80 → 1.2.82 (was #79)
  - `@iconify-json/lucide` 1.2.105 → 1.2.107 (was #82)

  **Fix landed alongside the bumps:** added `pnpm.overrides.vite: "^7.3.3"` to root `package.json`. Without it, `nuxt 4.4` pulls `vite@7.3.3` while `@nuxt/test-utils@3.23` and `@vitest/coverage-v8@3.2.4` still resolve `vite@7.3.3`'s peer down to `vite@7.3.1`, producing two Vite versions in the graph. The TS2769 typecheck error on `vitest.config.ts` `plugins: [vue()]` came from `@vitejs/plugin-vue@6` being resolved against the newer Vite types while `vitest`'s `defineConfig` was resolved against the older ones. The override forces a single `vite@7.3.3` and eliminates the skew.

  **Out of scope (left as open PRs):**

  - `eslint` 9 → 10 (#75) — major bump, requires `eslint.config.mjs` migration.
  - `actions/dependency-review-action` 4 → 5 (#76) — GH Action, unrelated to lockfile sync.
  - `chore(release): version packages` (#63) — release-trigger PR.

  After this lands, Dependabot PRs #68, #70, #71, #77-86 (except #75 and #76) will be closed as superseded.

## 0.2.0

### Minor Changes

- 946d8aa: **Types:** widen `OpenFeatureFlagValue` to include `JsonValue`.

  The public type was `boolean | string | number`, but the runtime evaluator handles object/JSON flag defaults (via `getObjectValue`) and the docs document object evaluation. The type now matches: `boolean | string | number | JsonValue` (re-exported from `@openfeature/server-sdk`). Existing callers using only primitive flag values are unaffected. Consumers can now type-safely configure JSON flags through `openFeature.publicFlags` and in-memory `variants` records.

  **Tests:** add focused unit coverage for `readOpenFeatureContextHeaders`.

  The header-validation utility (security-sensitive: it backs every `X-OF-CTX` request) had no direct unit tests. The new `test/unit/contextHeaders.test.ts` covers eleven cases: valid single-header decode, valid chunked decode, missing chunk, wrong encoding, missing sha256 header, hash mismatch, oversized payload, invalid chunk-count value, chunk count exceeding `MAX_CHUNKS`, malformed JSON inside the decoded body, and the no-context-headers no-op path. Each negative case asserts a 400 client error per the architecture's "fail-closed on invalid context" requirement.

- 84e9e53: Add PostHog and Vercel feature flag providers.

  - `type: 'posthog'` — custom OpenFeature provider built on `posthog-node@5`. Maps OpenFeature `targetingKey` → `distinctId`, context attributes → person properties, and supports groups + groupProperties. Number and object flag evaluation use PostHog's payload mechanism.
  - `type: 'vercel'` — thin wrapper around the official `VercelProvider` from `@vercel/flags-core/openfeature`. Server-side only; uses the auto-provisioned `flagsClient` by default, with optional injection for tests or custom configurations.
  - Provider SDKs (`posthog-node`, `@vercel/flags-core`, `flagsmith-nodejs`, `@openfeature/flagsmith-provider`) are now declared as **optional** peer dependencies via `peerDependenciesMeta`, so consumers only install the SDKs for the providers they actually use.

- acbcc68: **Breaking (security):** `GET /api/feature-flags/:key` no longer accepts evaluation context via the `?context=` query parameter.

  Context is now read exclusively from the validated `X-OF-CTX` request headers (same path the bulk `/api/feature-flags` endpoint already uses). The header path enforces:

  - Explicit `x-of-ctx-enc: json+gzip+base64url` encoding
  - `x-of-ctx-sha256` integrity hash
  - Size and chunk-count limits
  - 400 client errors on invalid payloads

  The query-string path bypassed all of these and risked sensitive targeting data landing in access logs, browser history, and HTTP referrer headers. The `?context=` parameter was never validated and is not used by the module's client plugin (which already sets the headers).

  **Migration:** if you were calling `/api/feature-flags/:key?context=...` directly, switch to setting the `X-OF-CTX` headers — the client plugin does this automatically when configured. The `?default=` query parameter is unchanged.

  Addresses architecture spec section: _"Context payload size/chunk limits are enforced server-side. Context integrity is verified prior to use."_

### Patch Changes

- ca40bb6: **Tooling:** add code coverage reporting via Vitest v8 provider with Codecov upload.

  - New `pnpm test:coverage` script runs the existing test suite with coverage instrumentation, emitting `text-summary`, `lcov`, and `json-summary` reports under `coverage/`.
  - Coverage scope is `src/**/*.{ts,vue}` minus tests, types, and shims. Components, composables, and Nuxt plugins are explicitly _included_ — coverage is for visibility, not vanity.
  - CI runs coverage on every push and PR via `ci.yml`'s `Test (with coverage)` step, then uploads `coverage/lcov.info` to Codecov via `codecov/codecov-action@v5`.
  - README displays a Codecov badge linking to the project's coverage page.
  - No coverage thresholds enforced — the OSS repo PRD intentionally favours visibility before gating, so contributors see drops without merge friction.

  Maintainers should set the `CODECOV_TOKEN` repository secret. Codecov works tokenless on public repos but the token improves reliability for fork PRs.

- b8ddc9f: **Security:** validate the shape of decoded `X-OF-CTX` payloads.

  `readOpenFeatureContextHeaders` previously cast the parsed JSON to `OpenFeatureClientContextPayload` without runtime validation. A syntactically valid JSON value of the wrong shape — a string, array, number, `null`, an object with a numeric `targetingKey`, or non-object `traits` — would pass the decoder and reach `evaluateFeatureFlag` as evaluation context.

  The decoder now asserts the payload is a plain object, and that `targetingKey` (when present) is a string and `traits` (when present) is a plain object. Invalid shapes throw `400 Invalid feature flag context payload` through the existing fail-closed path.

  Eight new test cases cover string/array/number/null payloads, non-string `targetingKey`, and string/array `traits`. Plus two positive cases asserting that targetingKey-only and traits-only payloads decode correctly.

- 581ff2e: **Security:** redact provider secrets from `GET /api/feature-flags/diagnostics` response.

  Previously the diagnostics endpoint returned `runtimeConfig.openFeature.providers` verbatim, including each provider's `options` and `providerOptions`. Those objects can contain credentials (Flagsmith `environmentKey`, PostHog `apiKey`). The response now exposes only `type`, `envPrefix`, `flags` (for in-memory/env providers), and a `configured: boolean` indicator per provider. Vendor-specific config and credentials are no longer reachable through this endpoint.

  If you depended on reading provider `options` from diagnostics, source them from your application's runtime config directly instead.

- e2136c8: **Fix:** honor optional peer dependencies for provider SDKs.

  The provider adapter registry previously imported every provider implementation statically, including `posthog-node`, `@vercel/flags-core`, `flagsmith-nodejs`, and `@openfeature/flagsmith-provider`. These are declared as **optional** peer dependencies via `peerDependenciesMeta`, but the static imports forced them to resolve at server startup — meaning a consumer using only `in-memory` or `env` providers would fail with `Cannot find module` if any optional SDK was absent.

  The Flagsmith, PostHog, and Vercel adapters now lazy-load their plugin modules inside `build` and `getDiagnostics` via `await import(...)`. The `in-memory` and `env` adapters keep static imports (no SDK to defer). `ProviderAdapter.build` now returns `Promise<Provider>`; `registerProviders` awaits it.

  A new `test/unit/providerLazyLoad.test.ts` regression suite proves this contract: it mocks the optional plugin modules to throw on import, then registers `in-memory` / `env` providers successfully, asserting the optional plugins were never loaded. A third case verifies that attempting to register an optional provider whose module fails to load still routes through the resilient warn-and-skip path established for misconfigured providers.

  Also updates `docs/content/getting-started/configuration.md` to include `'posthog'` and `'vercel'` in the documented `type` union and points to the per-provider docs pages.

- 9c8fe38: **Internal refactor:** introduce a provider adapter registry to eliminate hardcoded provider branches.

  Both the Nitro plugin (provider construction) and the diagnostics endpoint (flag enumeration) previously had their own `switch (provider.type)` dispatches with provider-specific imports. The diagnostics endpoint imported `fetchFlagsmithEnvironmentFlags` directly and silently returned an empty flag list for PostHog and Vercel providers (which were added without diagnostics support).

  A single `adapters` registry in `src/runtime/server/utils/providerAdapters.ts` now defines `{ build, getDiagnostics }` for every supported provider type. The Nitro plugin and diagnostics endpoint both look up adapters by `type` instead of branching on it. Adding a new provider becomes: register a new entry in the adapters map.

  PostHog and Vercel report `flags: []` in diagnostics by design (their flag catalogues are not enumerable without an evaluation context). Flagsmith continues to fetch its environment flags. In-memory and env-based providers report their configured definitions as before.

  No public API changes; no behaviour changes for consumers. Existing tests pass; 8 new unit tests cover the registry contract.

- 4e0e850: **Reliability:** provider initialization failures no longer crash request handling.

  The Nitro plugin now wraps each provider's construction in `try/catch` and skips providers that throw (e.g. Flagsmith without `FLAGSMITH_ENVIRONMENT_KEY`, PostHog without `POSTHOG_API_KEY`). Survivors are still registered through `MultiProvider` + `FirstMatchStrategy`. If every configured provider fails, no provider is registered and OpenFeature's NoopProvider returns the requested defaults — flag evaluation continues to work without throwing.

  The dispatch was also extracted to `src/runtime/server/utils/providerRegistration.ts` so the resilience behaviour is unit-testable. Sanitized warnings log only the provider type and the error message; option values (which can include credentials) are never logged.

  This addresses the architecture spec's Failure Semantics requirement: _"Provider init/evaluation errors must not crash request handling."_

## 0.1.1

### Patch Changes

- b524c84: Expand OSS documentation coverage and harden release/security automation with Changesets, npm provenance publishing, Dependabot, dependency review, and CodeQL workflows.

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [Unreleased]

### Added

- OSS baseline docs: license, code of conduct, contributing, security, changelog.

### Changed

- Package scope changed to `@ribrewguy/nuxt-openfeature`.
- Publish workflow switched to npm trusted publishing with provenance.
- Repository metadata and README updated for public OSS release.
- Full-history secret scan command now scans full git history without depth limits.
