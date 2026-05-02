import { FirstMatchStrategy, InMemoryProvider, MultiProvider, OpenFeature, type Provider } from '@openfeature/server-sdk'

import { buildFlagsmithProvider } from '../plugins/flagsmith'
import { buildPosthogProvider } from '../plugins/posthog'
import { buildVercelProvider } from '../plugins/vercel'
import { buildEnvFlags, type FlagDefinition } from './envFlags'

const DEFAULT_ENV_PREFIX = 'OPENFEATURE_FLAG_'

export type ProviderRegistrationConfig = {
  type: 'in-memory' | 'env' | 'flagsmith' | 'posthog' | 'vercel'
  envPrefix?: string
  flags?: Record<string, FlagDefinition>
  options?: Record<string, unknown>
  providerOptions?: Record<string, unknown>
}

export type ProviderLogger = {
  warn: (message: string, context?: Record<string, unknown>) => void
}

const consoleLogger: ProviderLogger = {
  warn: (message, context) => {
    if (context) {
      console.warn(message, context)
    }
    else {
      console.warn(message)
    }
  }
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

export const buildProvider = (config: ProviderRegistrationConfig): Provider => {
  const envPrefix = config.envPrefix ?? DEFAULT_ENV_PREFIX
  const envFlags = buildEnvFlags(envPrefix)
  const configuredFlags = config.flags ?? {}
  switch (config.type) {
    case 'in-memory':
      return new InMemoryProvider(configuredFlags)
    case 'env':
      return new InMemoryProvider(envFlags)
    case 'flagsmith':
      return buildFlagsmithProvider({ flagsmith: config.options, provider: config.providerOptions })
    case 'posthog':
      return buildPosthogProvider({
        posthog: config.options as Parameters<typeof buildPosthogProvider>[0] extends infer T ? T extends { posthog?: infer P } ? P : never : never,
        sendFeatureFlagEvents: (config.providerOptions as { sendFeatureFlagEvents?: boolean } | undefined)?.sendFeatureFlagEvents
      })
    case 'vercel':
      return buildVercelProvider(config.providerOptions as Parameters<typeof buildVercelProvider>[0])
    default:
      return new InMemoryProvider(configuredFlags)
  }
}

const tryBuildProvider = (
  config: ProviderRegistrationConfig,
  logger: ProviderLogger
): Provider | null => {
  try {
    return buildProvider(config)
  }
  catch (error) {
    logger.warn('OpenFeature provider construction failed; provider will be skipped.', {
      providerType: config.type,
      error: errorMessage(error)
    })
    return null
  }
}

export const registerProviders = async (
  configs: ProviderRegistrationConfig[],
  logger: ProviderLogger = consoleLogger
): Promise<void> => {
  if (configs.length === 0) {
    return
  }

  const built: Provider[] = []
  for (const config of configs) {
    const provider = tryBuildProvider(config, logger)
    if (provider) {
      built.push(provider)
    }
  }

  if (built.length === 0) {
    logger.warn('OpenFeature: all configured providers failed to construct; no provider registered. Flag evaluations will return defaults.')
    return
  }

  try {
    if (built.length === 1) {
      const [single] = built
      if (single) {
        await OpenFeature.setProviderAndWait(single)
      }
      return
    }

    const providerEntries = built.map(provider => ({ provider }))
    const multiProviderInput = providerEntries as unknown as ConstructorParameters<typeof MultiProvider>[0]
    await OpenFeature.setProviderAndWait(new MultiProvider(multiProviderInput, new FirstMatchStrategy()))
  }
  catch (error) {
    logger.warn('OpenFeature provider registration failed; flag evaluations will return defaults.', {
      error: errorMessage(error)
    })
  }
}
