---
title: Vercel Provider
---

# Vercel Provider

The module wraps Vercel's first-party OpenFeature adapter from `@vercel/flags-core/openfeature`. It is server-side only — the client receives evaluated flag values via the module's flag API.

## Configuration

```ts
openFeature: {
  providers: [
    {
      type: 'vercel'
    }
  ]
}
```

That's the whole config for typical use. The provider relies on Vercel's auto-provisioned `flagsClient` from `@vercel/flags-core`, which reads flag definitions from the Vercel Flags dashboard and uses platform-managed credentials when the project is linked to Vercel.

## Optional Custom Client

If you need to inject a pre-configured `FlagsClient` (for testing, or to point at a non-default flag origin), pass it via `providerOptions`:

```ts
import { createFlagsClient } from '@vercel/flags-core'

openFeature: {
  providers: [
    {
      type: 'vercel',
      providerOptions: {
        flagsClient: createFlagsClient({ /* custom config */ })
      }
    }
  ]
}
```

## Evaluation Context

The `EvaluationContext` is forwarded to Vercel as-is. Targeting rules in the Vercel Flags dashboard match against the entity properties you've defined there.

## Limitations Inherited From Vercel

Per [Vercel's OpenFeature docs](https://vercel.com/docs/flags/vercel-flags/sdks/openfeature):

- **Server-side only.** For client-side flag evaluation, use the Flags SDK directly outside this module.
- **Flags Explorer overrides** are not respected by `VercelProvider` out of the box.
- **No precompute pattern** — the Flags SDK's static-page precompute is unavailable through OpenFeature.

## Safety Behavior

- Provider initialization errors do not crash request handling.
- Flag evaluation failures return configured defaults via the OpenFeature SDK.

## When To Use This vs Other Providers

The Vercel provider is a good fit when your application is hosted on Vercel and you want to manage flags through the Vercel Flags dashboard alongside your deployments. For non-Vercel deployments, prefer Flagsmith or PostHog. The module's `MultiProvider` configuration with `FirstMatchStrategy` lets you combine providers — for example, Vercel as primary and Flagsmith as fallback.
