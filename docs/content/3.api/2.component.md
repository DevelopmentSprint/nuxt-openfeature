---
title: FeatureFlag Component
---

# FeatureFlag Component

Use the `FeatureFlag` component for declarative rendering.

```vue
<FeatureFlag name="my-feature">
  <template #default>
    <p>Feature is enabled.</p>
  </template>
  <template #fallback>
    <p>Feature is disabled.</p>
  </template>
</FeatureFlag>
```

## Props

- `name` (`string`, required): Flag key
- `default` (`boolean | string | number | object | array`, optional): Fallback value if missing

## Slots

- default slot: rendered when flag resolves to enabled and query is not pending
- `fallback` slot: rendered when flag resolves to disabled and query is not pending

## Behavior Notes

- Component does not render either slot while request is pending.
- Enable/disable logic is powered by `useFeatureFlag` normalization rules.
