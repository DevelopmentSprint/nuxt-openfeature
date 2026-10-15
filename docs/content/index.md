---
title: Nuxt OpenFeature Docs
---

# Nuxt OpenFeature Module

`@developmentsprint/nuxt-openfeature` provides a Nuxt-first integration for OpenFeature with server-side evaluation, typed composables, and safe context propagation.

## Safe Context Propagation

A Nuxt server can handle requests from many users at once. The module reads targeting context from each request and passes it directly to that request’s flag evaluations, without storing user context on the shared OpenFeature client or global API. This avoids the shared-state bug where one user’s targeting attributes affect another user’s flags. During server-side rendering, supply context from the current server request; the browser context plugin runs only on the client. See [Context and Targeting](/getting-started/context-and-targeting) for validation, limits, and trusted server context.

## Start Here

- [Installation](/getting-started/installation)
- [Configuration](/getting-started/configuration)
- [Context and Targeting](/getting-started/context-and-targeting)
- [Runtime Behavior](/getting-started/runtime-behavior)
- [API Endpoints](/api/endpoints)
- [Composables API](/api/composables)
- [FeatureFlag Component](/api/component)
- [Flagsmith Provider](/providers/flagsmith)
- [Troubleshooting](/troubleshooting)

## Project Links

- Source: [github.com/DevelopmentSprint/nuxt-openfeature](https://github.com/DevelopmentSprint/nuxt-openfeature)
- Issues: [github.com/DevelopmentSprint/nuxt-openfeature/issues](https://github.com/DevelopmentSprint/nuxt-openfeature/issues)

- Package: [@developmentsprint/nuxt-openfeature](https://www.npmjs.com/package/@developmentsprint/nuxt-openfeature)
- Releases: [GitHub releases](https://github.com/DevelopmentSprint/nuxt-openfeature/releases)
- License: [MIT](https://github.com/DevelopmentSprint/nuxt-openfeature/blob/main/LICENSE)
