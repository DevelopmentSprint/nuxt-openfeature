---
'@ribrewguy/nuxt-openfeature': patch
---

**Fix:** honor optional peer dependencies for provider SDKs.

The provider adapter registry previously imported every provider implementation statically, including `posthog-node`, `@vercel/flags-core`, `flagsmith-nodejs`, and `@openfeature/flagsmith-provider`. These are declared as **optional** peer dependencies via `peerDependenciesMeta`, but the static imports forced them to resolve at server startup — meaning a consumer using only `in-memory` or `env` providers would fail with `Cannot find module` if any optional SDK was absent.

The Flagsmith, PostHog, and Vercel adapters now lazy-load their plugin modules inside `build` and `getDiagnostics` via `await import(...)`. The `in-memory` and `env` adapters keep static imports (no SDK to defer). `ProviderAdapter.build` now returns `Promise<Provider>`; `registerProviders` awaits it.

A new `test/unit/providerLazyLoad.test.ts` regression suite proves this contract: it mocks the optional plugin modules to throw on import, then registers `in-memory` / `env` providers successfully, asserting the optional plugins were never loaded. A third case verifies that attempting to register an optional provider whose module fails to load still routes through the resilient warn-and-skip path established for misconfigured providers.

Also updates `docs/content/getting-started/configuration.md` to include `'posthog'` and `'vercel'` in the documented `type` union and points to the per-provider docs pages.
