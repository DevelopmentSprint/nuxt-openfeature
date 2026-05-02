---
'@ribrewguy/nuxt-openfeature': minor
---

**Breaking (security):** `GET /api/feature-flags/:key` no longer accepts evaluation context via the `?context=` query parameter.

Context is now read exclusively from the validated `X-OF-CTX` request headers (same path the bulk `/api/feature-flags` endpoint already uses). The header path enforces:
- Explicit `x-of-ctx-enc: json+gzip+base64url` encoding
- `x-of-ctx-sha256` integrity hash
- Size and chunk-count limits
- 400 client errors on invalid payloads

The query-string path bypassed all of these and risked sensitive targeting data landing in access logs, browser history, and HTTP referrer headers. The `?context=` parameter was never validated and is not used by the module's client plugin (which already sets the headers).

**Migration:** if you were calling `/api/feature-flags/:key?context=...` directly, switch to setting the `X-OF-CTX` headers — the client plugin does this automatically when configured. The `?default=` query parameter is unchanged.

Addresses architecture spec section: *"Context payload size/chunk limits are enforced server-side. Context integrity is verified prior to use."*
