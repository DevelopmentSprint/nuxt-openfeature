---
title: Vercel Provider
---

# Vercel Provider

The module wraps Vercel's first-party OpenFeature adapter from `@vercel/flags-core/openfeature`. It is server-side only — the client receives evaluated flag values via the module's flag API.

## How Vercel Flags Authenticates

Vercel Feature Flags use a single **connection string** that encodes everything needed to talk to your project's flag store: the SDK key, the project, and the environment. There is no separate team ID, project slug, or auth token.

A connection string looks like:

```
flags:?sdkKey=vf_server_xxxxxxxxxxxxxxxxxxxxxxxx
```

Or the bare SDK key form (older deployments):

```
vf_server_xxxxxxxxxxxxxxxxxxxxxxxx
```

Both formats are accepted by `@vercel/flags-core`. The dashboard always gives you the URI form starting with `flags:`.

## Three Ways To Configure It

You can mix-and-match across environments — the resolution order is **explicit `flagsClient` > explicit `connectionString` > env-driven default**.

### Path 1 — Environment Variable (Recommended)

Install the Vercel Feature Flags integration on your Vercel project (Dashboard → Integrations → Vercel Feature Flags). Vercel auto-provisions a `FLAGS` environment variable holding the connection string for that project + environment.

```bash
# .env (locally; run `vercel env pull` to sync from your Vercel project)
FLAGS=flags:?sdkKey=vf_server_xxxxxxxxxxxxxxxxxxxxxxxx
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@ribrewguy/nuxt-openfeature'],
  openFeature: {
    providers: [
      { type: 'vercel' }
    ]
  }
})
```

`@vercel/flags-core` lazily reads `process.env.FLAGS` the first time the client is used. No code path in your config touches the credential. This is the cleanest setup for Vercel-hosted apps.

### Path 2 — Explicit Connection String

Useful when:

- The credential lives in a differently-named env var (e.g. `MY_APP_FLAGS_KEY`).
- You're on a non-Vercel host but want to use Vercel Flags.
- You need different keys per Nuxt module configuration in a multi-tenant repo.

```ts
openFeature: {
  providers: [
    {
      type: 'vercel',
      options: {
        connectionString: process.env.MY_APP_FLAGS_KEY
      }
    }
  ]
}
```

The string is passed directly to `new VercelProvider(connectionString)`. Both URI form (`flags:?sdkKey=...`) and raw SDK key form (`vf_server_...`) work.

### Path 3 — Pre-Built `FlagsClient` (Advanced)

For when you need full control over the underlying client — custom polling/streaming options, shared client across services, or testing with a stubbed client.

```ts
import { createClient } from '@vercel/flags-core'

const sharedClient = createClient(process.env.FLAGS, {
  polling: { interval: 60_000 }
})

openFeature: {
  providers: [
    {
      type: 'vercel',
      providerOptions: {
        flagsClient: sharedClient
      }
    }
  ]
}
```

If both `providerOptions.flagsClient` and `options.connectionString` are set, the pre-built client wins.

## When To Use Which Path

| Scenario | Path |
|---|---|
| Vercel-hosted, single project, integration installed | **Path 1** (env var) |
| Non-Vercel host, custom env var, or multi-project | **Path 2** (`options.connectionString`) |
| Need custom client behavior (polling, retries, testing) | **Path 3** (`providerOptions.flagsClient`) |

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
- A misconfigured connection string surfaces at evaluation time as a default-fallback with `reason: ERROR`, not a server crash.

## When To Use This vs Other Providers

The Vercel provider is a good fit when your application is hosted on Vercel and you want to manage flags through the Vercel Flags dashboard alongside your deployments. For non-Vercel deployments, prefer Flagsmith or PostHog. The module's `MultiProvider` configuration with `FirstMatchStrategy` lets you combine providers — for example, Vercel as primary and Flagsmith as fallback.
