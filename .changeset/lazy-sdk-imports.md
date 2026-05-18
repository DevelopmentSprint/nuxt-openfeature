---
'@ribrewguy/nuxt-openfeature': patch
---

**Fix:** eliminate consumer-build "could not be resolved" warnings for unresolved optional provider SDKs.

Plugin wrappers (`runtime/server/plugins/{posthog,vercel,flagsmith}/index.mjs`) previously used static top-level `import` statements for their optional peer SDKs (`posthog-node`, `@vercel/flags-core`, `@vercel/flags-core/openfeature`, `flagsmith-nodejs`, `@openfeature/flagsmith-provider`). Consumer bundlers walking the dynamic-import target emitted warnings — and a future bundler pre-load could surface as `ERR_MODULE_NOT_FOUND` at runtime even when the affected provider was never configured.

The closed bead `nuxt-openfeature-37o` lazy-loaded the plugin wrapper file but left the SDK imports inside the wrapper static. This change moves the lazy boundary one layer deeper so optional SDKs are only imported when the provider is actually built.

- SDK value imports converted to `await import(...)` inside `buildXxxProvider`.
- Type-only references migrated to `import type` (zero runtime).
- Each dynamic import wraps a `.catch(...)` that throws a precise install hint (e.g. `"PostHog provider configured but 'posthog-node' is not installed. Run: pnpm add posthog-node"`) instead of an opaque module-resolution stack trace.
- `build.config.ts` `externals` list backfilled with `posthog-node`, `@vercel/flags-core`, and `@vercel/flags-core/openfeature` for internal consistency.
- New regression test (`test/unit/providers/dynamicSdkImport.test.ts`) verifies the plugin wrapper files load when their optional peers are absent, and that `buildXxxProvider` then throws the install hint without leaking option values.

**Public surface:** `buildPosthogProvider`, `buildVercelProvider`, and `buildFlagsmithProvider` are now `async` and return `Promise<Provider>`. The adapter registry already `await`s these, so module consumers are unaffected. Direct callers (if any) must `await` the result.
