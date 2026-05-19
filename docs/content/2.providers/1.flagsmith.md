---
title: Flagsmith Provider
---

# Flagsmith Provider

The module supports Flagsmith using `@openfeature/flagsmith-provider`.

```ts
openFeature: {
  providers: [
    {
      type: 'flagsmith',
      options: {
        apiUrl: process.env.FLAGSMITH_URL,
        environmentKey: process.env.FLAGSMITH_ENVIRONMENT_KEY
      },
      providerOptions: {
        useFlagsmithDefaults: false
      }
    }
  ]
}
```

## Safety Behavior

- Provider initialization errors do not crash request handling.
- Flag evaluation failures return configured defaults.

## Required Inputs

At least one of these must provide an environment key:

- `openFeature.providers[].options.environmentKey`
- `FLAGSMITH_ENVIRONMENT_KEY`
- `FLAGSMITH_KEY`

Optional API URL sources (in precedence order):

1. `openFeature.providers[].options.apiUrl`
2. `FLAGSMITH_URL`
3. `https://edge.api.flagsmith.com/api/v1/`

## Diagnostics

`GET {flagRouteBase}/diagnostics` includes a `flagsmith` provider entry that queries environment flags using the configured credentials.
