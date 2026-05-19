---
title: Installation
---

# Installation

Install the module in your Nuxt 4 project:

```bash
pnpm add @ribrewguy/nuxt-openfeature
```

Enable the module in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@ribrewguy/nuxt-openfeature']
})
```

> The module evaluates flags on the server and exposes client-safe APIs for consumption.
