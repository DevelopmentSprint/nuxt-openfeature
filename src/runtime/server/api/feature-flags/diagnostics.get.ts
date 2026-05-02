import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'

import { getAdapter, type ProviderConfig } from '../../utils/providerAdapters'
import { sanitizeProvider } from '../../utils/diagnosticsRedaction'

export default defineEventHandler(async () => {
  const runtimeConfig = useRuntimeConfig()
  const rawProviders = (runtimeConfig.openFeature as { providers?: unknown } | undefined)?.providers
  const providers = Array.isArray(rawProviders) ? (rawProviders as ProviderConfig[]) : []
  const flagsByProvider = await Promise.all(
    providers.map(async (provider) => {
      const adapter = getAdapter(provider.type)
      if (!adapter) {
        return { type: provider.type, flags: [] }
      }
      return adapter.getDiagnostics(provider)
    })
  )

  return {
    config: {
      flagRouteBase: runtimeConfig.public?.openFeature?.flagRouteBase ?? '/api/feature-flags',
      providers: providers.map(sanitizeProvider)
    },
    flagsByProvider
  }
})
