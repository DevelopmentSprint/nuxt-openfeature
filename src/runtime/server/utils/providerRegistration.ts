import { FirstMatchStrategy, InMemoryProvider, MultiProvider, OpenFeature, type Provider } from '@openfeature/server-sdk'

import { getAdapter, type ProviderConfig } from './providerAdapters'

export type ProviderRegistrationConfig = ProviderConfig

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
  const adapter = getAdapter(config.type)
  if (!adapter) {
    return new InMemoryProvider(config.flags ?? {})
  }
  return adapter.build(config)
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
