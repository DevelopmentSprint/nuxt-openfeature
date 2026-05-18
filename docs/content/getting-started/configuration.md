---
title: Configuration
---

# Configuration

Configure the module under the `openFeature` key in `nuxt.config.ts`.

```ts
export default defineNuxtConfig({
  modules: ['@ribrewguy/nuxt-openfeature'],
  openFeature: {
    providers: [
      {
        type: 'flagsmith',
        options: {
          apiUrl: process.env.FLAGSMITH_URL,
          environmentKey: process.env.FLAGSMITH_ENVIRONMENT_KEY
        }
      }
    ],
    flagRouteBase: '/api/feature-flags',
    publicFlags: {
      'my-feature': false
    }
  }
})
```

## Full Configuration Reference

### `openFeature`

| Variable | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `openFeature.providers` | `OpenFeatureProviderConfig[]` | no | `[]` | Ordered provider list. If multiple providers are configured, first-match strategy is used. |
| `openFeature.flagRouteBase` | `string` | no | `'/api/feature-flags'` | API base route for flag endpoints. Trailing slash is removed and leading slash is enforced. |
| `openFeature.publicFlags` | `Record<string, boolean \\| string \\| number>` | no | `{}` | Flags exposed through `GET {flagRouteBase}` and evaluated server-side with these as safe defaults. |

### `openFeature.providers[]`

| Variable | Type | Required | Default | Applies to | Notes |
| --- | --- | --- | --- | --- | --- |
| `type` | `'in-memory' \\| 'env' \\| 'flagsmith' \\| 'posthog' \\| 'vercel'` | yes | - | all providers | Provider adapter type. See per-provider pages: [Flagsmith](/providers/flagsmith), [PostHog](/providers/posthog), [Vercel](/providers/vercel). |
| `envPrefix` | `string` | no | `'OPENFEATURE_FLAG_'` | `env` | Prefix used when reading flag values from environment variables. |
| `flags` | `Record<string, OpenFeatureFlagDefinition>` | no | `{}` | `in-memory` | Static in-memory flag definitions. |
| `options` | `Record<string, unknown>` | no | `{}` | `flagsmith`, `posthog`, `vercel` | Vendor SDK credentials. Flagsmith: `environmentKey`, `apiUrl`. PostHog: `apiKey`, `host`. Vercel: `connectionString`. |
| `providerOptions` | `Record<string, unknown>` | no | `{}` | `flagsmith`, `posthog`, `vercel` | Provider-specific behavior options. Flagsmith: `useFlagsmithDefaults`. PostHog: `sendFeatureFlagEvents`. Vercel: `flagsClient` (pre-built `FlagsClient` instance — advanced). |

### `openFeature.providers[].flags.<flagKey>`

| Variable | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `variants` | `Record<string, boolean \\| string \\| number>` | yes | - | Variant map for the flag. |
| `defaultVariant` | `string` | yes | - | Must match a key in `variants`. |
| `disabled` | `boolean` | no | `false` | If `true`, diagnostics report the flag as disabled. |

### `openFeature.providers[].options` (Flagsmith)

| Variable | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `environmentKey` | `string` | no* | from `FLAGSMITH_ENVIRONMENT_KEY`, then `FLAGSMITH_KEY` | Required unless environment variables provide it. |
| `apiUrl` | `string` | no | from `FLAGSMITH_URL` or `https://edge.api.flagsmith.com/api/v1/` | Flagsmith API base URL. |
| `*` additional keys | `unknown` | no | - | Forwarded to `flagsmith-nodejs` constructor options. |

### `openFeature.providers[].providerOptions` (Flagsmith OpenFeature Provider)

| Variable | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `useFlagsmithDefaults` | `boolean` | no | provider default | Passed through to `FlagsmithOpenFeatureProvider`. |
| `*` additional keys | `unknown` | no | - | Forwarded to OpenFeature Flagsmith provider options. |

### `openFeature.providers[].options` (PostHog)

| Variable | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `apiKey` | `string` | no* | from `POSTHOG_API_KEY`, then `POSTHOG_KEY` | Required unless env vars provide it. |
| `host` | `string` | no | from `POSTHOG_HOST`, then PostHog Cloud default | PostHog API host. |
| `*` additional keys | `unknown` | no | - | Forwarded to `posthog-node` constructor options. |

### `openFeature.providers[].providerOptions` (PostHog)

| Variable | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `sendFeatureFlagEvents` | `boolean` | no | `false` | Whether PostHog should record `$feature_flag_called` events on every evaluation. |

### `openFeature.providers[].options` (Vercel)

| Variable | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `connectionString` | `string` | no | from `FLAGS` env var (read by SDK on first use) | Vercel Flags connection string. Accepts URI form (`flags:?sdkKey=vf_server_...`) or raw SDK key (`vf_server_...`). See [Vercel provider](/providers/vercel) for the three configuration paths. |

### `openFeature.providers[].providerOptions` (Vercel)

| Variable | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `flagsClient` | `FlagsClient` | no | env-driven default | Pre-built `FlagsClient` from `@vercel/flags-core`. Wins over `options.connectionString` when both are set. Advanced use only. |

## Environment Variables

### Flagsmith provider

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `FLAGSMITH_ENVIRONMENT_KEY` | yes (unless set in `openFeature.providers[].options.environmentKey`) | - | Primary environment key source. |
| `FLAGSMITH_KEY` | fallback | - | Used only if `FLAGSMITH_ENVIRONMENT_KEY` and `options.environmentKey` are absent. |
| `FLAGSMITH_URL` | no | `https://edge.api.flagsmith.com/api/v1/` | Used unless `options.apiUrl` is provided. |

### PostHog provider

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `POSTHOG_API_KEY` | yes (unless set in `openFeature.providers[].options.apiKey`) | - | Primary API key source. |
| `POSTHOG_KEY` | fallback | - | Used only if `POSTHOG_API_KEY` and `options.apiKey` are absent. |
| `POSTHOG_HOST` | no | PostHog Cloud default | Used unless `options.host` is provided. |

### Vercel provider

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `FLAGS` | yes (unless set in `openFeature.providers[].options.connectionString` or `providerOptions.flagsClient`) | - | Auto-provisioned by Vercel's Feature Flags integration. Read lazily by `@vercel/flags-core` on first client access. |

### Env provider

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `OPENFEATURE_FLAG_*` | no | - | Read when using `type: 'env'` with default prefix. |

Example with custom prefix:

```bash
MY_APP_FLAG_BETA_CHECKOUT=true
MY_APP_FLAG_UI_VARIANT=v2
```

```ts
openFeature: {
  providers: [{ type: 'env', envPrefix: 'MY_APP_FLAG_' }]
}
```

`MY_APP_FLAG_BETA_CHECKOUT` becomes flag key `beta-checkout`.

## Complete Example

```ts
export default defineNuxtConfig({
  modules: ['@ribrewguy/nuxt-openfeature'],
  openFeature: {
    providers: [
      {
        type: 'in-memory',
        flags: {
          'my-feature': {
            variants: { on: true, off: false },
            defaultVariant: 'off'
          }
        }
      },
      {
        type: 'env',
        envPrefix: 'OPENFEATURE_FLAG_'
      },
      {
        type: 'flagsmith',
        options: {
          environmentKey: process.env.FLAGSMITH_ENVIRONMENT_KEY,
          apiUrl: process.env.FLAGSMITH_URL
        },
        providerOptions: {}
      }
    ],
    flagRouteBase: '/api/feature-flags',
    publicFlags: {
      'my-feature': false,
      'ui-variant': 'control'
    }
  }
})
```

## Runtime Boundaries

- Server-only config stays in `runtimeConfig.openFeature`.
- Public client-safe config lives in `runtimeConfig.public.openFeature`.
- Provider credentials must never be exposed in public runtime config.

## Configuration Merge Semantics

When multiple config sources are present:

- `openFeature.providers` from module options are appended after existing runtime providers.
- `openFeature.publicFlags` from module options override existing runtime `publicFlags`.
- `openFeature.flagRouteBase` is normalized and mirrored into `runtimeConfig.public.openFeature.flagRouteBase`.
