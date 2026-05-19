---
title: Runtime Behavior
---

# Runtime Behavior

This module evaluates flags on the server and always fails safe to defaults.

## Provider Initialization

- `providers: []` means no provider is registered; API responses use configured defaults.
- One provider registers directly with OpenFeature.
- Multiple providers register through `MultiProvider` with `FirstMatchStrategy`.

## Evaluation Semantics

- Evaluations are type-aware (`boolean`, `number`, `string`, `object`).
- If evaluation throws, the module logs an error and returns the provided default.
- `GET {flagRouteBase}` uses a `750ms` timeout per configured public flag evaluation.
- `GET {flagRouteBase}/:key` currently evaluates against a boolean default only.

## Route Normalization

`openFeature.flagRouteBase` is normalized at module setup:

- blank values become `/api/feature-flags`
- leading slash is enforced
- trailing slash is removed

## Runtime Config Boundaries

- Server-only options live in `runtimeConfig.openFeature`.
- Client-safe values live in `runtimeConfig.public.openFeature`.
- Provider credentials never belong in public runtime config.

## Provider Merge Behavior

If runtime config already contains providers and module options also specify providers, the module appends both lists in order:

1. existing runtime providers
2. providers from module options

This preserves deterministic provider priority while supporting layered config.
