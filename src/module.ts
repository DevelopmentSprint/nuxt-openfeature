import {
  addComponentsDir,
  addImportsDir,
  addPlugin,
  addServerHandler,
  addServerImportsDir,
  addServerPlugin,
  createResolver,
  defineNuxtModule
} from '@nuxt/kit'
import { mergeOpenFeatureLayerOptions, normalizeOpenFeatureOptions } from './utils/options'
import type { OpenFeatureModuleOptions, OpenFeatureProviderConfig } from './types'

export type {
  OpenFeatureFlagDefinition,
  OpenFeatureFlagValue,
  OpenFeatureModuleOptions,
  OpenFeatureProviderConfig,
  OpenFeatureProviderType
} from './types'

export default defineNuxtModule<OpenFeatureModuleOptions>({
  meta: {
    name: '@ribrewguy/nuxt-openfeature',
    configKey: 'openFeature',
    compatibility: {
      nuxt: '>=4.0.0'
    }
  },
  defaults: {
    providers: [],
    flagRouteBase: '/api/feature-flags',
    publicFlags: {}
  },
  setup(moduleOptions, nuxt) {
    const resolver = createResolver(import.meta.url)
    const existingRuntime = (nuxt.options.runtimeConfig.openFeature || {}) as OpenFeatureModuleOptions
    const existingPublic = (nuxt.options.runtimeConfig.public?.openFeature || {}) as { flagRouteBase?: string }

    // Layer chain: nuxt.options._layers is ordered root-first, app-last. We collect
    // every layer's openFeature config (the app's moduleOptions corresponds to the
    // last entry but defu may have already mutated it, so we trust _layers as the
    // authoritative source) and merge with app-first provider precedence.
    const layered = (nuxt.options._layers ?? []).map((layer) => {
      const cfg = (layer.config as { openFeature?: OpenFeatureModuleOptions } | undefined)?.openFeature
      return cfg
    })
    const layerMerged = mergeOpenFeatureLayerOptions(layered.length > 0 ? layered : [moduleOptions])

    const normalized = normalizeOpenFeatureOptions(layerMerged, existingRuntime, existingPublic)
    const flagRouteBase = normalized.public.flagRouteBase

    addImportsDir(resolver.resolve('./runtime/composables'))
    addServerImportsDir(resolver.resolve('./runtime/server/utils'))
    addComponentsDir({
      path: resolver.resolve('./runtime/components'),
      pathPrefix: false
    })

    addPlugin({
      src: resolver.resolve('./runtime/plugins/openfeature-context.client'),
      mode: 'client'
    })

    addServerHandler({
      route: flagRouteBase,
      handler: resolver.resolve('./runtime/server/api/feature-flags/index.get')
    })
    addServerHandler({
      route: `${flagRouteBase}/:key`,
      handler: resolver.resolve('./runtime/server/api/feature-flags/[key].get')
    })
    addServerHandler({
      route: `${flagRouteBase}/diagnostics`,
      handler: resolver.resolve('./runtime/server/api/feature-flags/diagnostics.get')
    })

    addServerPlugin(resolver.resolve('./runtime/server/plugins/openfeature.server'))

    nuxt.options.runtimeConfig.openFeature = {
      ...(existingRuntime as Record<string, unknown>),
      ...(normalized.runtime as unknown as Record<string, unknown>),
      providers: normalized.runtime.providers as OpenFeatureProviderConfig[]
    }

    nuxt.options.runtimeConfig.public = {
      ...(nuxt.options.runtimeConfig.public ?? {}),
      openFeature: {
        ...existingPublic,
        ...normalized.public
      }
    }
  }
})
