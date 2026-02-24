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
| `context` | JSON string | none | Optional explicit evaluation context |

### Response

```json
{
  "enabled": true
}
```

### Notes

- If `:key` is missing, response is `{ "enabled": false }`.
- Invalid `context` query JSON is ignored and evaluation continues.

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
