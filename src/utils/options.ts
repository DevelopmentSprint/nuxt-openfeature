import type { OpenFeatureModuleOptions, OpenFeatureProviderConfig } from '../types'

const DEFAULT_FLAG_ROUTE_BASE = '/api/feature-flags'

const trimSlash = (value: string): string => value.replace(/\/$/, '')

export const normalizeFlagRouteBase = (value?: string): string => {
  if (!value || !value.trim()) {
    return DEFAULT_FLAG_ROUTE_BASE
  }

  const trimmed = trimSlash(value.trim())
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export type NormalizedOpenFeatureOptions = {
  runtime: Required<Pick<OpenFeatureModuleOptions, 'providers' | 'publicFlags'>> & {
    flagRouteBase: string
  }
  public: {
    flagRouteBase: string
  }
}

export const normalizeOpenFeatureOptions = (
  moduleOptions: OpenFeatureModuleOptions,
  existingRuntimeOptions?: OpenFeatureModuleOptions,
  existingPublicOptions?: { flagRouteBase?: string }
): NormalizedOpenFeatureOptions => {
  const flagRouteBase = normalizeFlagRouteBase(moduleOptions.flagRouteBase || existingPublicOptions?.flagRouteBase)
  const existingProviders = existingRuntimeOptions?.providers ?? []
  const incomingProviders = moduleOptions.providers ?? []
  const providers: OpenFeatureProviderConfig[] = [...existingProviders, ...incomingProviders]

  return {
    runtime: {
      providers,
      publicFlags: moduleOptions.publicFlags ?? existingRuntimeOptions?.publicFlags ?? {},
      flagRouteBase
    },
    public: {
      flagRouteBase
    }
  }
}

/**
 * Merge `openFeature` config from a layered Nuxt config chain into a single
 * `OpenFeatureModuleOptions`. Input is an ordered array of layer configs from
 * `nuxt.options._layers` (root layer first, app last).
 *
 * Semantics:
 * - `providers`: concatenated in app-first order. The app's providers appear
 *   FIRST in the merged array so they win under `FirstMatchStrategy`. Parent
 *   layers act as fallbacks.
 * - `publicFlags`: deep-merged, child layers win on key collision (app overrides parent).
 * - `flagRouteBase`: last-defined wins (app overrides parent).
 */
export const mergeOpenFeatureLayerOptions = (
  layered: ReadonlyArray<OpenFeatureModuleOptions | undefined>
): OpenFeatureModuleOptions => {
  // Walk root → app. Track scalars and publicFlags via child-wins. Stash
  // providers per-layer so we can reverse to app-first at the end.
  const providersByLayer: OpenFeatureProviderConfig[][] = []
  let mergedPublicFlags: OpenFeatureModuleOptions['publicFlags'] = {}
  let mergedFlagRouteBase: string | undefined

  for (const layer of layered) {
    if (!layer) continue
    if (Array.isArray(layer.providers) && layer.providers.length > 0) {
      providersByLayer.push(layer.providers)
    }
    if (layer.publicFlags) {
      mergedPublicFlags = { ...mergedPublicFlags, ...layer.publicFlags }
    }
    if (layer.flagRouteBase) {
      mergedFlagRouteBase = layer.flagRouteBase
    }
  }

  // Reverse so the app's providers (last layer entered) come first.
  const providers = providersByLayer.reverse().flat()

  return {
    providers,
    publicFlags: mergedPublicFlags,
    flagRouteBase: mergedFlagRouteBase
  }
}

export { DEFAULT_FLAG_ROUTE_BASE }
