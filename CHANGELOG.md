# Changelog

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
