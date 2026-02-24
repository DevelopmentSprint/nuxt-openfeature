---
title: Troubleshooting
---

# Troubleshooting

## Flags always return defaults

- Verify provider credentials are present in server environment variables.
- Confirm route base matches configured `flagRouteBase`.
- Check server logs for provider initialization warnings.
- Confirm `openFeature.publicFlags` contains the keys you expect to fetch from `GET {flagRouteBase}`.

## Context targeting not applied

- Ensure requests include `x-of-ctx-*` headers (or `x-of-ctx` for single-header payloads).
- Confirm context payload passes hash verification (`x-of-ctx-sha256`).
- Check payload size against limits:
  - single payload threshold `4096`
  - chunk size `2048`
  - max chunks `32`

## `400 Invalid feature flag context ...`

This indicates context header decoding failed on the server.

- Verify `x-of-ctx-enc` is `json+gzip+base64url`.
- Ensure all chunk headers are present when using chunked mode.
- Ensure gzip + base64url encoding was used on the client.
- Rebuild headers with `buildOpenFeatureContextHeaders` instead of custom encoding.

## Env provider key mismatch

The env provider normalizes keys by:

- removing prefix (default `OPENFEATURE_FLAG_`)
- lowercasing
- replacing `_` or `__` with `-`

Example: `OPENFEATURE_FLAG_CHECKOUT__REDESIGN=true` becomes `checkout-redesign`.

## Flagsmith provider initialization error

The provider requires an environment key:

- `options.environmentKey`, or
- `FLAGSMITH_ENVIRONMENT_KEY`, or
- `FLAGSMITH_KEY`

If none are present, provider initialization fails and evaluations fall back to defaults.

## Useful commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm docs:lint
pnpm docs:typecheck
pnpm docs:build
```
