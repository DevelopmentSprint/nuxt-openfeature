---
title: PostHog Provider
---

# PostHog Provider

The module ships a custom OpenFeature provider built directly on top of `posthog-node@5`. It is server-side only — the client receives evaluated flag values via the module's flag API, never PostHog credentials.

## Configuration

```ts
openFeature: {
  providers: [
    {
      type: 'posthog',
      options: {
        apiKey: process.env.POSTHOG_API_KEY,
        host: process.env.POSTHOG_HOST
      },
      providerOptions: {
        sendFeatureFlagEvents: false
      }
    }
  ]
}
```

## Required Inputs

At least one of these must provide an API key:

- `openFeature.providers[].options.apiKey`
- `POSTHOG_API_KEY`
- `POSTHOG_KEY`

Optional host (defaults to PostHog Cloud):

- `openFeature.providers[].options.host`
- `POSTHOG_HOST`

## Evaluation Context

OpenFeature evaluation context maps to PostHog as follows:

| OpenFeature `EvaluationContext` field | PostHog mapping |
|---|---|
| `targetingKey` | `distinctId` (required) |
| `groups` | `groups` map |
| `groupProperties` | `groupProperties` map |
| Any other primitive attribute | `personProperties` |

If `targetingKey` is missing, the provider returns the default value with `reason: ERROR` and `errorCode: TARGETING_KEY_MISSING`.

## Flag Type Resolution

| OpenFeature method | PostHog source |
|---|---|
| `getBooleanValue` | `getFeatureFlag` (must return `boolean`) |
| `getStringValue` | `getFeatureFlag` (variant string) |
| `getNumberValue` | `getFeatureFlagPayload` (must return `number`) |
| `getObjectValue` | `getFeatureFlagPayload` (JSON payload) |

For boolean/string flags, PostHog returns the variant directly. For number/object flags, the value lives inside the variant's JSON payload — set this in the PostHog dashboard under the variant's "Payload" field.

## Safety Behavior

- Provider initialization errors do not crash request handling.
- SDK failures fall back to the configured default value with `reason: ERROR`.
- Type mismatches (e.g. asking `getBooleanValue` for a multivariate flag) return the default with `errorCode: TYPE_MISMATCH`.

## Why a Custom Provider?

The community `@tapico/node-openfeature-posthog` package has not been updated since June 2024 and pins `posthog-node@^4`, one major version behind. PostHog itself does not document or recommend a specific OpenFeature provider. Building thin and direct against `posthog-node@5` gives current SDK behaviour, control over event reporting, and consistency with this module's other providers.
