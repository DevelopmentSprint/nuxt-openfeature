import { InMemoryProvider, type Provider } from '@openfeature/server-sdk'

import { buildFlagsmithProvider, fetchFlagsmithEnvironmentFlags } from '../plugins/flagsmith'
import { buildPosthogProvider } from '../plugins/posthog'
import { buildVercelProvider } from '../plugins/vercel'
import { buildEnvFlags, type FlagDefinition } from './envFlags'

export type ProviderType = 'in-memory' | 'env' | 'flagsmith' | 'posthog' | 'vercel'

export type ProviderConfig = {
  type: ProviderType
  envPrefix?: string
  flags?: Record<string, FlagDefinition>
  options?: Record<string, unknown>
  providerOptions?: Record<string, unknown>
}

export type DiagnosticFlag = {
  key: string
  enabled: boolean
  value: unknown
}

export type DiagnosticEntry = {
  type: ProviderType
  flags: DiagnosticFlag[]
}

export type ProviderAdapter = {
  build: (config: ProviderConfig) => Provider
  getDiagnostics: (config: ProviderConfig) => Promise<DiagnosticEntry>
}

const DEFAULT_ENV_PREFIX = 'OPENFEATURE_FLAG_'

const flagDefinitionsToDiagnostics = (
  flags: Record<string, FlagDefinition> | undefined
): DiagnosticFlag[] =>
  Object.entries(flags ?? {}).map(([key, definition]) => ({
    key,
    enabled: definition.disabled ? false : true,
    value: definition.variants?.[definition.defaultVariant] ?? null
  }))

export const adapters: Record<ProviderType, ProviderAdapter> = {
  'in-memory': {
    build: config => new InMemoryProvider(config.flags ?? {}),
    getDiagnostics: async config => ({
      type: 'in-memory',
      flags: flagDefinitionsToDiagnostics(config.flags)
    })
  },

  env: {
    build: (config) => {
      const envPrefix = config.envPrefix ?? DEFAULT_ENV_PREFIX
      return new InMemoryProvider(buildEnvFlags(envPrefix))
    },
    getDiagnostics: async (config) => {
      const envPrefix = config.envPrefix ?? DEFAULT_ENV_PREFIX
      return {
        type: 'env',
        flags: flagDefinitionsToDiagnostics(buildEnvFlags(envPrefix))
      }
    }
  },

  flagsmith: {
    build: config => buildFlagsmithProvider({
      flagsmith: config.options,
      provider: config.providerOptions
    }),
    getDiagnostics: async (config) => {
      try {
        const flags = await fetchFlagsmithEnvironmentFlags({ flagsmith: config.options })
        return { type: 'flagsmith', flags }
      }
      catch {
        return { type: 'flagsmith', flags: [] }
      }
    }
  },

  posthog: {
    build: config => buildPosthogProvider({
      posthog: config.options as Parameters<typeof buildPosthogProvider>[0] extends infer T ? T extends { posthog?: infer P } ? P : never : never,
      sendFeatureFlagEvents: (config.providerOptions as { sendFeatureFlagEvents?: boolean } | undefined)?.sendFeatureFlagEvents
    }),
    getDiagnostics: async () => ({ type: 'posthog', flags: [] })
  },

  vercel: {
    build: config => buildVercelProvider(config.providerOptions as Parameters<typeof buildVercelProvider>[0]),
    getDiagnostics: async () => ({ type: 'vercel', flags: [] })
  }
}

export const getAdapter = (type: string): ProviderAdapter | undefined =>
  (adapters as Record<string, ProviderAdapter>)[type]
