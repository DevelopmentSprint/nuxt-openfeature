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
| `type` | `'in-memory' \\| 'env' \\| 'flagsmith'` | yes | - | all providers | Provider adapter type. |
| `envPrefix` | `string` | no | `'OPENFEATURE_FLAG_'` | `env` | Prefix used when reading flag values from environment variables. |
| `flags` | `Record<string, OpenFeatureFlagDefinition>` | no | `{}` | `in-memory` | Static in-memory flag definitions. |
| `options` | `Record<string, unknown>` | no | `{}` | `flagsmith` | Passed to `flagsmith-nodejs` config (`environmentKey`, `apiUrl`, and any additional SDK options). |
| `providerOptions` | `Record<string, unknown>` | no | `{}` | `flagsmith` | Passed to `FlagsmithOpenFeatureProvider` options (for example `useFlagsmithDefaults`). |

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

## Environment Variables

### Flagsmith provider

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `FLAGSMITH_ENVIRONMENT_KEY` | yes (unless set in `openFeature.providers[].options.environmentKey`) | - | Primary environment key source. |
| `FLAGSMITH_KEY` | fallback | - | Used only if `FLAGSMITH_ENVIRONMENT_KEY` and `options.environmentKey` are absent. |
| `FLAGSMITH_URL` | no | `https://edge.api.flagsmith.com/api/v1/` | Used unless `options.apiUrl` is provided. |

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
