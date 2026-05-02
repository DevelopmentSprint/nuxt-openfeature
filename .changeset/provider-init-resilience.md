---
'@ribrewguy/nuxt-openfeature': patch
---

**Reliability:** provider initialization failures no longer crash request handling.

The Nitro plugin now wraps each provider's construction in `try/catch` and skips providers that throw (e.g. Flagsmith without `FLAGSMITH_ENVIRONMENT_KEY`, PostHog without `POSTHOG_API_KEY`). Survivors are still registered through `MultiProvider` + `FirstMatchStrategy`. If every configured provider fails, no provider is registered and OpenFeature's NoopProvider returns the requested defaults — flag evaluation continues to work without throwing.

The dispatch was also extracted to `src/runtime/server/utils/providerRegistration.ts` so the resilience behaviour is unit-testable. Sanitized warnings log only the provider type and the error message; option values (which can include credentials) are never logged.

This addresses the architecture spec's Failure Semantics requirement: *"Provider init/evaluation errors must not crash request handling."*
