import type { FlagDefinition } from './envFlags'

export type DiagnosticFlagDefinition = FlagDefinition & { disabled?: boolean }

export type DiagnosticProviderConfig = {
  type: 'in-memory' | 'env' | 'flagsmith' | 'posthog' | 'vercel'
  envPrefix?: string
  flags?: Record<string, DiagnosticFlagDefinition>
  options?: Record<string, unknown>
  providerOptions?: Record<string, unknown>
}

export type SanitizedProvider = {
  type: DiagnosticProviderConfig['type']
  envPrefix?: string
  flags?: Record<string, DiagnosticFlagDefinition>
  configured: boolean
}

export const sanitizeProvider = (provider: DiagnosticProviderConfig): SanitizedProvider => ({
  type: provider.type,
  ...(provider.envPrefix !== undefined ? { envPrefix: provider.envPrefix } : {}),
  ...(provider.flags !== undefined ? { flags: provider.flags } : {}),
  configured: Boolean(provider.options) || Boolean(provider.providerOptions)
})
