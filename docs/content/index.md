---
seo:
  title: OpenFeature feature flags for Nuxt
  description: Server-side OpenFeature feature flags for Nuxt 4, with Flagsmith, PostHog, Vercel Flags, env and in-memory providers and request-isolated targeting.
---

::u-page-hero
#title
Feature flags for Nuxt, evaluated on the server

#description
Configure Flagsmith, PostHog, Vercel Flags, environment variables or static flags in `nuxt.config.ts`, and read them with one composable, one component or one server helper.

#links
  :::u-button
  ---
  size: xl
  to: /getting-started/installation
  trailing-icon: i-lucide-arrow-right
  ---
  Get started
  :::

  :::u-button
  ---
  color: neutral
  icon: i-simple-icons-github
  size: xl
  to: https://github.com/DevelopmentSprint/nuxt-openfeature
  variant: outline
  ---
  View on GitHub
  :::
::

::u-page-section
#features
  :::u-page-feature
  ---
  icon: i-lucide-server
  to: /guide/server-evaluation
  ---
  #title
  Server-side evaluation

  #description
  Flags resolve in Nitro. The browser receives evaluated values, never provider SDKs or credentials.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-plug
  to: /guide/providers
  ---
  #title
  Five providers, one API

  #description
  Flagsmith, PostHog, Vercel Flags, environment variables and in-memory flags. The first provider that knows a flag answers.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-users
  to: /guide/context-and-targeting
  ---
  #title
  Request-isolated targeting

  #description
  Context travels with each request, so one user's traits never affect another user's flags on a busy server.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-shield-check
  to: /guide/runtime-behavior
  ---
  #title
  Fail-safe defaults

  #description
  Provider errors and slow providers return the default you configured instead of failing the page.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-eye
  to: /guide/using-flags
  ---
  #title
  Composables and a component

  #description
  `useFeatureFlag`, `useFeatureFlags` and `<FeatureFlag>`, with no flash of the wrong variant.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-layers
  to: /guide/nuxt-layers
  ---
  #title
  Nuxt layers aware

  #description
  Split flag configuration across layers. The app's providers take precedence and parent layers act as fallbacks.
  :::
::
