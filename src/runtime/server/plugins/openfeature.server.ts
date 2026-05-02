import { FirstMatchStrategy, InMemoryProvider, MultiProvider, OpenFeature, type Provider } from '@openfeature/server-sdk'
import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime'

import { buildFlagsmithProvider } from './flagsmith'
import { buildPosthogProvider } from './posthog'
import { buildVercelProvider } from './vercel'
import { buildEnvFlags, type FlagDefinition } from '../utils/envFlags'

const DEFAULT_ENV_PREFIX = 'OPENFEATURE_FLAG_'

type OpenFeatureProviderConfig = {
  type: 'in-memory' | 'env' | 'flagsmith' | 'posthog' | 'vercel'
  envPrefix?: string
  flags?: Record<string, FlagDefinition>
  options?: Record<string, unknown>
  providerOptions?: Record<string, unknown>
}

type OpenFeatureRuntimeConfig = {
  providers?: OpenFeatureProviderConfig[]
}

const buildProvider = (provider: OpenFeatureProviderConfig): Provider => {
  const envPrefix = provider.envPrefix ?? DEFAULT_ENV_PREFIX
  const envFlags = buildEnvFlags(envPrefix)
  const configuredFlags = provider.flags ?? {}
  switch (provider.type) {
    case 'in-memory':
      // TODO: replace with remote provider once OpenFeature backend is available.
      return new InMemoryProvider(configuredFlags)
    case 'env':
      // TODO: replace with remote provider once OpenFeature backend is available.
      return new InMemoryProvider(envFlags)
    case 'flagsmith':
      return buildFlagsmithProvider({ flagsmith: provider.options, provider: provider.providerOptions })
    case 'posthog':
      return buildPosthogProvider({
        posthog: provider.options as Parameters<typeof buildPosthogProvider>[0] extends infer T ? T extends { posthog?: infer P } ? P : never : never,
        sendFeatureFlagEvents: (provider.providerOptions as { sendFeatureFlagEvents?: boolean } | undefined)?.sendFeatureFlagEvents
      })
    case 'vercel':
      return buildVercelProvider(provider.providerOptions as Parameters<typeof buildVercelProvider>[0])
    default:
      // TODO: support additional provider classes via explicit mapping.
      return new InMemoryProvider(configuredFlags)
  }
}

export default defineNitroPlugin(async () => {
  const runtimeConfig = useRuntimeConfig()
  const moduleConfig = runtimeConfig.openFeature as OpenFeatureRuntimeConfig | undefined
  const providers = moduleConfig?.providers ?? []

  if (providers.length === 0) {
    return
  }

  const configuredProviders = providers.map(buildProvider)

  if (configuredProviders.length === 1) {
    const [provider] = configuredProviders
    if (provider) {
      await OpenFeature.setProviderAndWait(provider)
    }
    return
  }

  const providerEntries = configuredProviders.map(provider => ({ provider }))
  const multiProviderInput = providerEntries as unknown as ConstructorParameters<typeof MultiProvider>[0]
  await OpenFeature.setProviderAndWait(new MultiProvider(multiProviderInput, new FirstMatchStrategy()))
})
