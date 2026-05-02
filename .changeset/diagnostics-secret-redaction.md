---
'@ribrewguy/nuxt-openfeature': patch
---

**Security:** redact provider secrets from `GET /api/feature-flags/diagnostics` response.

Previously the diagnostics endpoint returned `runtimeConfig.openFeature.providers` verbatim, including each provider's `options` and `providerOptions`. Those objects can contain credentials (Flagsmith `environmentKey`, PostHog `apiKey`). The response now exposes only `type`, `envPrefix`, `flags` (for in-memory/env providers), and a `configured: boolean` indicator per provider. Vendor-specific config and credentials are no longer reachable through this endpoint.

If you depended on reading provider `options` from diagnostics, source them from your application's runtime config directly instead.
