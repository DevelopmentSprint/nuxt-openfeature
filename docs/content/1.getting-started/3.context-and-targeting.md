---
title: Context and Targeting
---

# Context and Targeting

The module sends client context to server evaluation endpoints using signed, compressed headers.

## How Context Is Built

The client plugin (`openfeature-context.client.ts`) builds context with:

- `targetingKey`: current authenticated user id (when available)
- `traits.locale`: `navigator.language`
- `traits.timezone`: browser timezone
- `traits.platform`: browser platform string
- `traits.userAgent`: browser user agent
- user traits when authenticated (`userId`, `email`, `emailVerified`, `userCreatedAt`)

## Header Format

| Header | Purpose |
| --- | --- |
| `x-of-ctx-enc` | Encoding marker (`json+gzip+base64url`) |
| `x-of-ctx-sha256` | SHA-256 hash of canonical JSON payload |
| `x-of-ctx` | Single-header payload when size allows |
| `x-of-ctx-chunks` | Number of chunks when payload is split |
| `x-of-ctx-0 ... x-of-ctx-N` | Chunk payload segments |

## Size and Safety Limits

| Limit | Value | Source |
| --- | --- | --- |
| Single header threshold | `4096` chars | client encoder |
| Chunk size | `2048` chars | client + server |
| Maximum chunks | `32` | client + server |
| Maximum encoded size accepted | `65536` chars | server decoder |

If payload is too large, the client skips sending context headers and evaluation proceeds without context.

## Integrity Rules

The server rejects the request (`400`) when:

- encoding marker is missing or invalid
- required hash is missing
- chunk metadata is invalid
- any chunk is missing
- hash does not match decoded JSON
- payload cannot be decoded or parsed

## Context Merge Semantics

When both client and server context are present:

- `targetingKey`: server value takes precedence
- traits: server traits overwrite matching client trait keys
- non-overlapping traits are merged

## Server-Side Context Override Example

```ts
import { getFeatureFlagContext } from '#imports'

export default defineEventHandler((event) => {
  const context = getFeatureFlagContext(event, {
    targetingKey: 'internal-service-account',
    traits: {
      region: 'us-east-1',
      plan: 'enterprise'
    }
  })

  return { context }
})
```
