---
title: Composables API
---

# Composables API

The module auto-imports:

- `useFeatureFlags()`
- `useFeatureFlag(flagKey, options)`

## `useFeatureFlags(options?)`

Fetches evaluated `publicFlags` from `GET {flagRouteBase}` using TanStack Query.

### Return Value

- `data`: `Ref<Record<string, FeatureFlagValue> | undefined>`
- `isPending`: loading state
- `error`: query error
- `refetch`: refresh function

### Behavior Notes

- Query key includes current user id (`auth-user` state) so login/logout invalidates cached flags.
- Query runs on client only (`enabled: import.meta.client`).
- Context headers are injected by the client plugin automatically.

## `useFeatureFlag`

```ts
const { enabled, value, pending, error, refresh } = useFeatureFlag('my-feature', {
  defaultValue: false
})
```

- `enabled`: normalized boolean state.
- `value`: raw evaluated flag value.
- `pending`: query state.
- `error`: query error object.
- `refresh`: function to refetch flags.

### Options

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `defaultValue` | `FeatureFlagValue` | `false` | Used when the flag key is absent from fetched data. |

### `enabled` Normalization Rules

1. If fetched value is boolean, use it directly.
2. If fetched value exists and is non-boolean, use JavaScript truthiness.
3. If fetched value is missing, use `defaultValue` (or `false`).
