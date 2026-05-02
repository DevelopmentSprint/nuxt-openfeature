---
'@ribrewguy/nuxt-openfeature': patch
---

**Security:** validate the shape of decoded `X-OF-CTX` payloads.

`readOpenFeatureContextHeaders` previously cast the parsed JSON to `OpenFeatureClientContextPayload` without runtime validation. A syntactically valid JSON value of the wrong shape — a string, array, number, `null`, an object with a numeric `targetingKey`, or non-object `traits` — would pass the decoder and reach `evaluateFeatureFlag` as evaluation context.

The decoder now asserts the payload is a plain object, and that `targetingKey` (when present) is a string and `traits` (when present) is a plain object. Invalid shapes throw `400 Invalid feature flag context payload` through the existing fail-closed path.

Eight new test cases cover string/array/number/null payloads, non-string `targetingKey`, and string/array `traits`. Plus two positive cases asserting that targetingKey-only and traits-only payloads decode correctly.
