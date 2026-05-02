---
title: API Endpoints
---

# API Endpoints

All module endpoints are mounted under `openFeature.flagRouteBase` (default `/api/feature-flags`).

## `GET /api/feature-flags`

Evaluates every key in `openFeature.publicFlags` and returns a map.

### Response

```json
{
  "flags": {
    "checkout-redesign": true,
    "pricing-tier": "pro",
    "max-items": 25
  }
}
```

### Notes

- Context headers are parsed and applied when available.
- Missing providers or provider failures return configured defaults.
- Per-flag evaluation timeout is `750ms`.

## `GET /api/feature-flags/:key`

Evaluates a single flag key and returns a boolean `enabled` field.

### Query Params

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `default` | `boolean` \| `'1'/'0'` \| `'true'/'false'` | `false` | Fallback value used for evaluation |

### Evaluation Context

Context is read from the validated `X-OF-CTX` request headers (same path as the bulk endpoint), not from query parameters. The client plugin sets these headers automatically when configured. Headers carry integrity hashes (`x-of-ctx-sha256`), explicit encoding (`x-of-ctx-enc: json+gzip+base64url`), and size limits enforced by the server. Invalid or oversized payloads return `400`.

Query-string context (`?context=...`) is **not** supported. Sensitive targeting data should never travel in URLs because of access logs, browser history, and HTTP referrers.

### Response

```json
{
  "enabled": true
}
```

### Notes

- If `:key` is missing, response is `{ "enabled": false }`.

## `GET /api/feature-flags/diagnostics`

Returns runtime provider config (non-secret structure) and provider-derived flag snapshots.

### Response Shape

```json
{
  "config": {
    "flagRouteBase": "/api/feature-flags",
    "providers": []
  },
  "flagsByProvider": [
    {
      "type": "env",
      "flags": [
        { "key": "checkout-redesign", "enabled": true, "value": true }
      ]
    }
  ]
}
```

### Notes

- Intended for debugging and operations visibility.
- Flagsmith diagnostics reads environment flags from the configured project/environment.
- Do not expose this endpoint publicly without access controls.
