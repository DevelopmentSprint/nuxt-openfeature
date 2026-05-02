---
'@ribrewguy/nuxt-openfeature': patch
---

**Internal refactor:** introduce a provider adapter registry to eliminate hardcoded provider branches.

Both the Nitro plugin (provider construction) and the diagnostics endpoint (flag enumeration) previously had their own `switch (provider.type)` dispatches with provider-specific imports. The diagnostics endpoint imported `fetchFlagsmithEnvironmentFlags` directly and silently returned an empty flag list for PostHog and Vercel providers (which were added without diagnostics support).

A single `adapters` registry in `src/runtime/server/utils/providerAdapters.ts` now defines `{ build, getDiagnostics }` for every supported provider type. The Nitro plugin and diagnostics endpoint both look up adapters by `type` instead of branching on it. Adding a new provider becomes: register a new entry in the adapters map.

PostHog and Vercel report `flags: []` in diagnostics by design (their flag catalogues are not enumerable without an evaluation context). Flagsmith continues to fetch its environment flags. In-memory and env-based providers report their configured definitions as before.

No public API changes; no behaviour changes for consumers. Existing tests pass; 8 new unit tests cover the registry contract.
