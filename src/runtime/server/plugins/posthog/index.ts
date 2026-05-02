import { ErrorCode, type EvaluationContext, type JsonValue, type Logger, type Provider, type ResolutionDetails, StandardResolutionReasons } from '@openfeature/server-sdk'
import { PostHog, type PostHogOptions } from 'posthog-node'

const PROVIDER_NAME = 'PostHog OpenFeature Provider'

type PosthogProviderOptions = {
  posthog?: {
    apiKey?: string
    host?: string
  } & Omit<PostHogOptions, 'host'>
  sendFeatureFlagEvents?: boolean
}

type PosthogEvaluateOptions = {
  groups?: Record<string, string>
  personProperties?: Record<string, string>
  groupProperties?: Record<string, Record<string, string>>
  sendFeatureFlagEvents?: boolean
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const stringifyAttributes = (attributes: Record<string, unknown>): Record<string, string> => {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(attributes)) {
    if (value === null || value === undefined) continue
    if (typeof value === 'object') continue
    result[key] = String(value)
  }
  return result
}

const buildEvaluateOptions = (context: EvaluationContext, defaultSendEvents: boolean): PosthogEvaluateOptions => {
  const { targetingKey: _targetingKey, groups, groupProperties, ...rest } = context

  const personProperties = stringifyAttributes(rest)
  const evaluateOptions: PosthogEvaluateOptions = { sendFeatureFlagEvents: defaultSendEvents }

  if (Object.keys(personProperties).length > 0) {
    evaluateOptions.personProperties = personProperties
  }
  if (isPlainObject(groups)) {
    evaluateOptions.groups = stringifyAttributes(groups)
  }
  if (isPlainObject(groupProperties)) {
    const normalized: Record<string, Record<string, string>> = {}
    for (const [groupKey, props] of Object.entries(groupProperties)) {
      if (isPlainObject(props)) {
        normalized[groupKey] = stringifyAttributes(props)
      }
    }
    if (Object.keys(normalized).length > 0) {
      evaluateOptions.groupProperties = normalized
    }
  }
  return evaluateOptions
}

const missingTargetingKey = <T>(defaultValue: T): ResolutionDetails<T> => ({
  value: defaultValue,
  reason: StandardResolutionReasons.ERROR,
  errorCode: ErrorCode.TARGETING_KEY_MISSING,
  errorMessage: 'PostHog provider requires evaluation context.targetingKey (mapped to distinctId).'
})

const errorResult = <T>(defaultValue: T, error: unknown): ResolutionDetails<T> => ({
  value: defaultValue,
  reason: StandardResolutionReasons.ERROR,
  errorCode: ErrorCode.GENERAL,
  errorMessage: error instanceof Error ? error.message : String(error)
})

const typeMismatch = <T>(defaultValue: T, expected: string, actual: string): ResolutionDetails<T> => ({
  value: defaultValue,
  reason: StandardResolutionReasons.ERROR,
  errorCode: ErrorCode.TYPE_MISMATCH,
  errorMessage: `Expected ${expected} flag value but got ${actual}.`
})

export class PosthogOpenFeatureProvider implements Provider {
  readonly metadata = { name: PROVIDER_NAME } as const
  readonly runsOn = 'server'

  constructor(
    private readonly client: PostHog,
    private readonly defaultSendEvents = false
  ) {}

  async onClose(): Promise<void> {
    await this.client.shutdown()
  }

  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext,
    _logger: Logger
  ): Promise<ResolutionDetails<boolean>> {
    if (!context.targetingKey) return missingTargetingKey(defaultValue)
    try {
      const value = await this.client.getFeatureFlag(flagKey, context.targetingKey, buildEvaluateOptions(context, this.defaultSendEvents))
      if (value === undefined) {
        return { value: defaultValue, reason: StandardResolutionReasons.DEFAULT }
      }
      if (typeof value === 'boolean') {
        return { value, reason: StandardResolutionReasons.TARGETING_MATCH }
      }
      return typeMismatch(defaultValue, 'boolean', `string variant "${value}"`)
    }
    catch (error) {
      return errorResult(defaultValue, error)
    }
  }

  async resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext,
    _logger: Logger
  ): Promise<ResolutionDetails<string>> {
    if (!context.targetingKey) return missingTargetingKey(defaultValue)
    try {
      const value = await this.client.getFeatureFlag(flagKey, context.targetingKey, buildEvaluateOptions(context, this.defaultSendEvents))
      if (value === undefined) {
        return { value: defaultValue, reason: StandardResolutionReasons.DEFAULT }
      }
      if (typeof value === 'string') {
        return { value, reason: StandardResolutionReasons.TARGETING_MATCH, variant: value }
      }
      return typeMismatch(defaultValue, 'string variant', typeof value)
    }
    catch (error) {
      return errorResult(defaultValue, error)
    }
  }

  async resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext,
    _logger: Logger
  ): Promise<ResolutionDetails<number>> {
    if (!context.targetingKey) return missingTargetingKey(defaultValue)
    try {
      const payload = await this.client.getFeatureFlagPayload(flagKey, context.targetingKey, undefined, buildEvaluateOptions(context, this.defaultSendEvents))
      if (payload === undefined) {
        return { value: defaultValue, reason: StandardResolutionReasons.DEFAULT }
      }
      if (typeof payload === 'number') {
        return { value: payload, reason: StandardResolutionReasons.TARGETING_MATCH }
      }
      return typeMismatch(defaultValue, 'number payload', typeof payload)
    }
    catch (error) {
      return errorResult(defaultValue, error)
    }
  }

  async resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
    _logger: Logger
  ): Promise<ResolutionDetails<T>> {
    if (!context.targetingKey) return missingTargetingKey(defaultValue)
    try {
      const payload = await this.client.getFeatureFlagPayload(flagKey, context.targetingKey, undefined, buildEvaluateOptions(context, this.defaultSendEvents))
      if (payload === undefined) {
        return { value: defaultValue, reason: StandardResolutionReasons.DEFAULT }
      }
      return { value: payload as T, reason: StandardResolutionReasons.TARGETING_MATCH }
    }
    catch (error) {
      return errorResult(defaultValue, error)
    }
  }
}

export const buildPosthogProvider = (options?: PosthogProviderOptions): Provider => {
  const apiKey = options?.posthog?.apiKey ?? process.env.POSTHOG_API_KEY ?? process.env.POSTHOG_KEY ?? ''
  if (!apiKey) {
    throw new Error('PostHog provider requires POSTHOG_API_KEY or posthog.apiKey')
  }

  const host = options?.posthog?.host ?? process.env.POSTHOG_HOST

  const { apiKey: _apiKey, host: _host, ...rest } = options?.posthog ?? {}
  const client = new PostHog(apiKey, { ...rest, ...(host ? { host } : {}) })

  return new PosthogOpenFeatureProvider(client, options?.sendFeatureFlagEvents ?? false)
}
