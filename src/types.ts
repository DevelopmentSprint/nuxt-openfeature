import type { JsonValue } from '@openfeature/server-sdk'

export type OpenFeatureFlagValue = boolean | string | number | JsonValue

export type OpenFeatureFlagDefinition = {
  variants: Record<string, OpenFeatureFlagValue>
  defaultVariant: string
  disabled?: boolean
}

export type OpenFeatureProviderType = 'in-memory' | 'env' | 'flagsmith' | 'posthog' | 'vercel'

export type OpenFeatureProviderConfig = {
  type: OpenFeatureProviderType
  envPrefix?: string
  flags?: Record<string, OpenFeatureFlagDefinition>
  options?: Record<string, unknown>
  providerOptions?: Record<string, unknown>
}

export type OpenFeatureModuleOptions = {
  providers?: OpenFeatureProviderConfig[]
  flagRouteBase?: string
  publicFlags?: Record<string, OpenFeatureFlagValue>
}
