# Nuxt OpenFeature

[![npm version](https://img.shields.io/npm/v/@developmentsprint/nuxt-openfeature?color=00DC82&label=npm)](https://www.npmjs.com/package/@developmentsprint/nuxt-openfeature)
[![CI](https://github.com/DevelopmentSprint/nuxt-openfeature/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/DevelopmentSprint/nuxt-openfeature/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/DevelopmentSprint/nuxt-openfeature/graph/badge.svg)](https://codecov.io/gh/DevelopmentSprint/nuxt-openfeature)
[![Nuxt 4](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt&logoColor=white)](https://nuxt.com)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**Feature flags for Nuxt 4, evaluated on the server through [OpenFeature](https://openfeature.dev).**

Configure Flagsmith, PostHog, Vercel Flags, environment variables or static flags in `nuxt.config.ts`. Read them anywhere with one composable, one component or one server helper. Provider credentials stay on the server, each request is evaluated with its own context, and a failing provider falls back to the defaults you choose.

**[Read the documentation](https://developmentsprint.github.io/nuxt-openfeature/)**

## Quick start

Install the module and its peer dependencies:

```bash
pnpm add @developmentsprint/nuxt-openfeature @openfeature/server-sdk @tanstack/vue-query
```

Register it with a flag. The in-memory provider needs no account:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@developmentsprint/nuxt-openfeature'],
  openFeature: {
    providers: [
      {
        type: 'in-memory',
        flags: {
          'new-checkout': { variants: { on: true, off: false }, defaultVariant: 'on' }
        }
      }
    ],
    // Flags the browser may read, with the value to use if every provider fails.
    publicFlags: { 'new-checkout': false }
  }
})
```

Register a TanStack Query client once ([installation guide](https://developmentsprint.github.io/nuxt-openfeature/getting-started/installation#register-tanstack-query)), then use the flag:

```vue
<script setup lang="ts">
const { enabled } = useFeatureFlag('new-checkout')
</script>

<template>
  <NewCheckout v-if="enabled" />
  <LegacyCheckout v-else />
</template>
```

Next: [providers](https://developmentsprint.github.io/nuxt-openfeature/guide/providers), [server evaluation](https://developmentsprint.github.io/nuxt-openfeature/guide/server-evaluation), [targeting](https://developmentsprint.github.io/nuxt-openfeature/guide/context-and-targeting), [configuration reference](https://developmentsprint.github.io/nuxt-openfeature/reference/configuration) and [security](https://developmentsprint.github.io/nuxt-openfeature/guide/security).

## Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](./CONTRIBUTING.md) covers setup and quality gates, and everyone taking part follows the [Code of Conduct](./CODE_OF_CONDUCT.md). Add a changeset (`pnpm changeset`) for changes users will notice. Maintainers: see [REPOSITORY_SETUP.md](./REPOSITORY_SETUP.md).

To report a vulnerability, use [private vulnerability reporting](https://github.com/DevelopmentSprint/nuxt-openfeature/security/advisories/new), not a public issue. See [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
