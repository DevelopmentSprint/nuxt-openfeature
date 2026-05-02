---
'@ribrewguy/nuxt-openfeature': minor
---

Add PostHog and Vercel feature flag providers.

- `type: 'posthog'` — custom OpenFeature provider built on `posthog-node@5`. Maps OpenFeature `targetingKey` → `distinctId`, context attributes → person properties, and supports groups + groupProperties. Number and object flag evaluation use PostHog's payload mechanism.
- `type: 'vercel'` — thin wrapper around the official `VercelProvider` from `@vercel/flags-core/openfeature`. Server-side only; uses the auto-provisioned `flagsClient` by default, with optional injection for tests or custom configurations.
- Provider SDKs (`posthog-node`, `@vercel/flags-core`, `flagsmith-nodejs`, `@openfeature/flagsmith-provider`) are now declared as **optional** peer dependencies via `peerDependenciesMeta`, so consumers only install the SDKs for the providers they actually use.
