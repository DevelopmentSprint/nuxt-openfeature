import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getFeatureFlag = vi.fn()
const getFeatureFlagPayload = vi.fn()
const shutdown = vi.fn()
const PostHogCtor = vi.fn(() => ({ getFeatureFlag, getFeatureFlagPayload, shutdown }))

vi.mock('posthog-node', () => ({
  PostHog: PostHogCtor
}))

const NOOP_LOGGER = { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} }

describe('PostHog OpenFeature provider', () => {
  beforeEach(() => {
    PostHogCtor.mockClear()
    getFeatureFlag.mockReset()
    getFeatureFlagPayload.mockReset()
    shutdown.mockReset()
  })

  afterEach(() => {
    delete process.env.POSTHOG_API_KEY
    delete process.env.POSTHOG_KEY
    delete process.env.POSTHOG_HOST
  })

  it('throws when no API key is configured', async () => {
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    expect(() => buildPosthogProvider()).toThrow(/POSTHOG_API_KEY/)
  })

  it('reads API key from POSTHOG_API_KEY when no option is passed', async () => {
    process.env.POSTHOG_API_KEY = 'phc_env_key'
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    buildPosthogProvider()
    expect(PostHogCtor).toHaveBeenCalledWith('phc_env_key', {})
  })

  it('passes posthog options including host through to the client', async () => {
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    buildPosthogProvider({ posthog: { apiKey: 'phc_inline', host: 'https://us.i.posthog.com' } })
    expect(PostHogCtor).toHaveBeenCalledWith('phc_inline', { host: 'https://us.i.posthog.com' })
  })

  it('returns ERROR + TARGETING_KEY_MISSING when context lacks targetingKey', async () => {
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const result = await provider.resolveBooleanEvaluation('flag', false, {}, NOOP_LOGGER)

    expect(result.value).toBe(false)
    expect(result.reason).toBe('ERROR')
    expect(result.errorCode).toBe('TARGETING_KEY_MISSING')
    expect(getFeatureFlag).not.toHaveBeenCalled()
  })

  it('resolves boolean flags via getFeatureFlag with TARGETING_MATCH on hit', async () => {
    getFeatureFlag.mockResolvedValueOnce(true)
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const result = await provider.resolveBooleanEvaluation('flag', false, { targetingKey: 'user-1' }, NOOP_LOGGER)

    expect(result).toEqual({ value: true, reason: 'TARGETING_MATCH' })
    expect(getFeatureFlag).toHaveBeenCalledWith('flag', 'user-1', { sendFeatureFlagEvents: false })
  })

  it('returns DEFAULT when boolean flag is undefined', async () => {
    getFeatureFlag.mockResolvedValueOnce(undefined)
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const result = await provider.resolveBooleanEvaluation('flag', false, { targetingKey: 'user-1' }, NOOP_LOGGER)

    expect(result).toEqual({ value: false, reason: 'DEFAULT' })
  })

  it('returns TYPE_MISMATCH when boolean evaluation returns a string variant', async () => {
    getFeatureFlag.mockResolvedValueOnce('treatment')
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const result = await provider.resolveBooleanEvaluation('flag', false, { targetingKey: 'user-1' }, NOOP_LOGGER)

    expect(result.value).toBe(false)
    expect(result.reason).toBe('ERROR')
    expect(result.errorCode).toBe('TYPE_MISMATCH')
  })

  it('resolves string flag variants and exposes variant in details', async () => {
    getFeatureFlag.mockResolvedValueOnce('treatment-b')
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const result = await provider.resolveStringEvaluation('flag', 'control', { targetingKey: 'user-1' }, NOOP_LOGGER)

    expect(result).toEqual({ value: 'treatment-b', reason: 'TARGETING_MATCH', variant: 'treatment-b' })
  })

  it('resolves number flags via getFeatureFlagPayload', async () => {
    getFeatureFlagPayload.mockResolvedValueOnce(42)
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const result = await provider.resolveNumberEvaluation('flag', 0, { targetingKey: 'user-1' }, NOOP_LOGGER)

    expect(result).toEqual({ value: 42, reason: 'TARGETING_MATCH' })
  })

  it('resolves object flags via getFeatureFlagPayload', async () => {
    getFeatureFlagPayload.mockResolvedValueOnce({ enabled: true, variant: 'v2' })
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const result = await provider.resolveObjectEvaluation('flag', { enabled: false, variant: 'v1' }, { targetingKey: 'user-1' }, NOOP_LOGGER)

    expect(result.value).toEqual({ enabled: true, variant: 'v2' })
    expect(result.reason).toBe('TARGETING_MATCH')
  })

  it('forwards person + group context to PostHog', async () => {
    getFeatureFlag.mockResolvedValueOnce(true)
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    await provider.resolveBooleanEvaluation('flag', false, {
      targetingKey: 'user-1',
      plan: 'pro',
      groups: { org: 'acme' },
      groupProperties: { org: { tier: 'enterprise' } }
    }, NOOP_LOGGER)

    expect(getFeatureFlag).toHaveBeenCalledWith('flag', 'user-1', {
      sendFeatureFlagEvents: false,
      personProperties: { plan: 'pro' },
      groups: { org: 'acme' },
      groupProperties: { org: { tier: 'enterprise' } }
    })
  })

  it('returns ERROR + GENERAL when the SDK throws', async () => {
    getFeatureFlag.mockRejectedValueOnce(new Error('network down'))
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const result = await provider.resolveBooleanEvaluation('flag', false, { targetingKey: 'user-1' }, NOOP_LOGGER)

    expect(result.value).toBe(false)
    expect(result.reason).toBe('ERROR')
    expect(result.errorCode).toBe('GENERAL')
    expect(result.errorMessage).toBe('network down')
  })
})
