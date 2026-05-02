---
'@ribrewguy/nuxt-openfeature': minor
---

**Types:** widen `OpenFeatureFlagValue` to include `JsonValue`.

The public type was `boolean | string | number`, but the runtime evaluator handles object/JSON flag defaults (via `getObjectValue`) and the docs document object evaluation. The type now matches: `boolean | string | number | JsonValue` (re-exported from `@openfeature/server-sdk`). Existing callers using only primitive flag values are unaffected. Consumers can now type-safely configure JSON flags through `openFeature.publicFlags` and in-memory `variants` records.

**Tests:** add focused unit coverage for `readOpenFeatureContextHeaders`.

The header-validation utility (security-sensitive: it backs every `X-OF-CTX` request) had no direct unit tests. The new `test/unit/contextHeaders.test.ts` covers eleven cases: valid single-header decode, valid chunked decode, missing chunk, wrong encoding, missing sha256 header, hash mismatch, oversized payload, invalid chunk-count value, chunk count exceeding `MAX_CHUNKS`, malformed JSON inside the decoded body, and the no-context-headers no-op path. Each negative case asserts a 400 client error per the architecture's "fail-closed on invalid context" requirement.
