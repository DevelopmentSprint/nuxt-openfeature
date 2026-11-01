# Nuxt OpenFeature

[![npm version](https://img.shields.io/npm/v/@developmentsprint/nuxt-openfeature?color=00DC82&label=npm)](https://www.npmjs.com/package/@developmentsprint/nuxt-openfeature)
[![CI](https://github.com/DevelopmentSprint/nuxt-openfeature/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/DevelopmentSprint/nuxt-openfeature/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/DevelopmentSprint/nuxt-openfeature/graph/badge.svg)](https://codecov.io/gh/DevelopmentSprint/nuxt-openfeature)
[![Nuxt 4](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt&logoColor=white)](https://nuxt.com)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**Feature flags for Nuxt 4, evaluated on the server through [OpenFeature](https://openfeature.dev).**

Configure Flagsmith, PostHog, Vercel Flags, environment variables or static flags in `nuxt.config.ts`. Read them anywhere with one composable, one component or one server helper. Provider credentials stay on the server, each request is evaluated with its own context, and a failing provider falls back to the defaults you choose.

[Documentation](https://developmentsprint.github.io/nuxt-openfeature/) · [Configuration](https://developmentsprint.github.io/nuxt-openfeature/getting-started/configuration) · [Providers](https://developmentsprint.github.io/nuxt-openfeature/providers/flagsmith) · [Releases](https://github.com/DevelopmentSprint/nuxt-openfeature/releases)

```vue
<script setup lang="ts">
const { enabled } = useFeatureFlag('new-checkout')
</script>

<template>
  <NewCheckout v-if="enabled" />
  <LegacyCheckout v-else />
</template>
```

## Features

- **Server-side evaluation.** Flags resolve in Nitro. The browser receives evaluated values, never provider SDKs or credentials.
- **Five providers, one API.** Flagsmith, PostHog, Vercel Flags, environment variables and in-memory flags. Switching vendors is a config change.
- **Fallback chains.** List several providers. The first one that knows a flag answers, so you can layer a vendor over env-var overrides over static defaults.
- **Request-isolated targeting.** Context travels with each request and is passed straight to that request's evaluations. One user's traits never affect another user's flags on a busy server.
- **Fail-safe by design.** Provider errors and slow providers (750 ms per flag on the batch endpoint) return your configured default instead of failing the page.
- **Explicit public surface.** Only flags listed in `publicFlags` reach the browser. Server-only flags cannot leak through the client API.
- **Typed values.** Booleans, strings, numbers and JSON objects, with the default's type choosing the matching OpenFeature resolver.
- **Nuxt layers aware.** Split flag config across layers. The app's providers take precedence, and parent layers act as fallbacks.
- **Lazy vendor SDKs.** Provider packages are optional peers and load only when configured.

## Quick start

### 1. Install

```bash
pnpm add @developmentsprint/nuxt-openfeature @openfeature/server-sdk @tanstack/vue-query
```

Then add the SDK for each vendor you use (see [Providers](#providers)).

### 2. Register the module

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@developmentsprint/nuxt-openfeature'],
  openFeature: {
    providers: [
      {
        type: 'in-memory',
        flags: {
          'new-checkout': {
            variants: { on: true, off: false },
            defaultVariant: 'on'
          }
        }
      }
    ],
    // Flags the browser may read, with the value to use if every provider fails.
    publicFlags: {
      'new-checkout': false
    }
  }
})
```

The in-memory provider needs no account, so you can try the module before connecting a vendor.

### 3. Register TanStack Query

The client composables cache flags with [TanStack Query](https://tanstack.com/query/latest/docs/framework/vue/overview). Register a `QueryClient` once if your app doesn't already:

```ts
// plugins/vue-query.ts
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient: new QueryClient() })
})
```

Without it, `useFeatureFlag` throws `No 'queryClient' found in Vue context`.

### 4. Use a flag

```vue
<template>
  <FeatureFlag name="new-checkout">
    <NewCheckout />
    <template #fallback>
      <LegacyCheckout />
    </template>
  </FeatureFlag>
</template>
```

## Usage

### In components

`useFeatureFlag` and `useFeatureFlags` are auto-imported.

```ts
// One flag. `enabled` is a boolean; `value` is the raw evaluated value.
const { enabled, value, pending, error, refresh } = useFeatureFlag('hero-variant', {
  defaultValue: 'control'
})

// Every public flag at once.
const { data: flags } = useFeatureFlags()
```

Flags are fetched on the client from `GET /api/feature-flags` and cached per user, so they refetch when the user signs in or out. `enabled` uses a boolean value as-is, applies JavaScript truthiness to other values, and falls back to `defaultValue` when the flag is missing.

`<FeatureFlag>` renders its default slot when the flag is enabled and its `fallback` slot when it isn't. It renders neither while the request is pending, so there is no flash of the wrong variant.

### On the server

`evaluateFeatureFlag` and `getFeatureFlagContext` are auto-imported in Nitro handlers. Server-side evaluation can read any flag your providers know about, not only `publicFlags`.

```ts
// server/api/checkout.post.ts
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event) // your auth

  const context = getFeatureFlagContext(event, {
    targetingKey: session.user.id,
    traits: { plan: session.user.plan }
  })

  const useNewFlow = await evaluateFeatureFlag('new-checkout', false, context)
  return useNewFlow ? newCheckout(event) : legacyCheckout(event)
})
```

The default value's type selects the resolver: `false` → boolean, `'control'` → string, `10` → number, `{}` → object. On error, the default is returned.

## Providers

Providers are tried in order and the first match wins. Install only the SDKs you use.

| `type` | Install | Credentials |
| --- | --- | --- |
| `in-memory` | — | Flags defined in `flags` |
| `env` | — | `OPENFEATURE_FLAG_*` variables (prefix configurable with `envPrefix`) |
| `flagsmith` | `flagsmith-nodejs @openfeature/flagsmith-provider` | `FLAGSMITH_ENVIRONMENT_KEY`, optional `FLAGSMITH_URL` |
| `posthog` | `posthog-node` | `POSTHOG_API_KEY`, optional `POSTHOG_HOST` |
| `vercel` | `@vercel/flags-core` | `FLAGS` connection string |

Credentials can also be passed through each provider's `options`. A production setup might put a vendor first, with environment overrides and static defaults behind it:

```ts
openFeature: {
  providers: [
    { type: 'flagsmith' }, // reads FLAGSMITH_ENVIRONMENT_KEY
    { type: 'env' },       // OPENFEATURE_FLAG_NEW_CHECKOUT=true → 'new-checkout'
    { type: 'in-memory', flags: { /* ... */ } }
  ],
  publicFlags: { 'new-checkout': false }
}
```

Per-provider guides: [Flagsmith](https://developmentsprint.github.io/nuxt-openfeature/providers/flagsmith) · [PostHog](https://developmentsprint.github.io/nuxt-openfeature/providers/posthog) · [Vercel](https://developmentsprint.github.io/nuxt-openfeature/providers/vercel)

## Configuration

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `providers` | `OpenFeatureProviderConfig[]` | `[]` | Ordered provider list. With none, every flag resolves to its default. |
| `publicFlags` | `Record<string, boolean \| string \| number \| object>` | `{}` | Flags the browser may read. Each value is that flag's type and its fail-safe default. |
| `flagRouteBase` | `string` | `'/api/feature-flags'` | Base path for the module's HTTP endpoints. |

`publicFlags` is the option people most often miss: a flag configured in a provider but not listed here is never returned to the browser. See the [full configuration reference](https://developmentsprint.github.io/nuxt-openfeature/getting-started/configuration), including Nuxt layer merge rules.

### Endpoints

| Route | Returns |
| --- | --- |
| `GET {flagRouteBase}` | `{ flags }` for every key in `publicFlags` |
| `GET {flagRouteBase}/:key` | `{ enabled }` for one flag, evaluated against a boolean default |
| `GET {flagRouteBase}/diagnostics` | Provider types and per-provider flag snapshots. Credentials are omitted. |

The diagnostics route has no built-in authentication, and it lists flags that are not in `publicFlags`. Protect it with your own server middleware before deploying. See the [endpoint reference](https://developmentsprint.github.io/nuxt-openfeature/api/endpoints).

## Targeting context

A client plugin attaches context to every flag request: the browser's locale, time zone, platform and user agent. If `useState('auth-user')` holds a signed-in user (`{ id, email, emailVerifiedAt, createdAt }`), it also sets `targetingKey` to the user's id and adds those fields as traits.

Context is sent as gzip-compressed, base64url-encoded `x-of-ctx` headers with a SHA-256 checksum, never in the URL. The server rejects malformed or oversized payloads with `400`. Any `targetingKey` and traits you pass to `getFeatureFlagContext` override the client's values.

See [Context and Targeting](https://developmentsprint.github.io/nuxt-openfeature/getting-started/context-and-targeting) for header format and limits.

## Security model

- **Credentials never reach the browser.** Provider config lives in private `runtimeConfig.openFeature`. Only `flagRouteBase` is public.
- **The client sees only what you allow.** The batch endpoint returns `publicFlags` and nothing else.
- **Browser context is untrusted input.** The checksum detects corruption; it does not authenticate anyone. Base access decisions on your server session, and pass trusted identity through `getFeatureFlagContext`.
- **Signed-in users' email addresses are sent as traits** to your server and on to your providers. Check that this fits your privacy policy and your vendors' data processing terms.
- **Lock down diagnostics** before exposing your app publicly. It reveals every flag your providers define.

To report a vulnerability, use [private vulnerability reporting](https://github.com/DevelopmentSprint/nuxt-openfeature/security/advisories/new), not a public issue. See [SECURITY.md](./SECURITY.md).

## Migrating from `@ribrewguy/nuxt-openfeature`

The package moved to the DevelopmentSprint scope at 0.2.5 and continues the same version history. Replace the dependency, then update the name in your `modules` list and in any imports, including `/types` and `/runtime/*` subpaths:

```bash
pnpm remove @ribrewguy/nuxt-openfeature
pnpm add @developmentsprint/nuxt-openfeature
```

The `openFeature` config key and every runtime API are unchanged.

## Requirements

- Nuxt 4
- `@openfeature/server-sdk` 1.20+
- `@tanstack/vue-query` 5 (for the client composables and component)

## Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](./CONTRIBUTING.md) covers setup and quality gates, and everyone taking part follows the [Code of Conduct](./CODE_OF_CONDUCT.md).

```bash
pnpm install
pnpm install --ignore-workspace --frozen-lockfile --dir docs  # docs are a separate project
pnpm dev        # playground
pnpm docs:dev   # documentation site
pnpm lint && pnpm typecheck && pnpm test
```

Add a changeset (`pnpm changeset`) for changes users will notice. Maintainers: the release process and npm trusted publishing are documented in [REPOSITORY_SETUP.md](./REPOSITORY_SETUP.md).

## License

[MIT](./LICENSE)
