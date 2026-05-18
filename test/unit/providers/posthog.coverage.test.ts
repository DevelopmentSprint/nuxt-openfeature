import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getFeatureFlag = vi.fn()
const getFeatureFlagPayload = vi.fn()
const shutdown = vi.fn(async () => {})
const PostHogCtor = vi.fn(() => ({ getFeatureFlag, getFeatureFlagPayload, shutdown }))

vi.mock('posthog-node', () => ({
  PostHog: PostHogCtor
}))

const NOOP_LOGGER = { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} }

beforeEach(() => {
  PostHogCtor.mockClear()
  getFeatureFlag.mockReset()
  getFeatureFlagPayload.mockReset()
  shutdown.mockReset().mockImplementation(async () => {})
})

afterEach(() => {
  delete process.env.POSTHOG_API_KEY
  delete process.env.POSTHOG_KEY
  delete process.env.POSTHOG_HOST
})

describe('PostHog provider — additional coverage', () => {
  it('falls back to POSTHOG_KEY env when POSTHOG_API_KEY is not set', async () => {
    process.env.POSTHOG_KEY = 'phc_fallback'
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    await buildPosthogProvider()
    expect(PostHogCtor).toHaveBeenCalledWith('phc_fallback', {})
  })

  it('reads host from POSTHOG_HOST env when no inline host is provided', async () => {
    process.env.POSTHOG_API_KEY = 'phc_x'
    process.env.POSTHOG_HOST = 'https://eu.posthog.test'
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    await buildPosthogProvider()
    expect(PostHogCtor).toHaveBeenCalledWith('phc_x', { host: 'https://eu.posthog.test' })
  })

  it('onClose delegates to the underlying client.shutdown', async () => {
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = await buildPosthogProvider({ posthog: { apiKey: 'phc' } })
    await provider.onClose?.()
    expect(shutdown).toHaveBeenCalled()
  })

  it('forwards sendFeatureFlagEvents=true when configured', async () => {
    getFeatureFlag.mockResolvedValueOnce(true)
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = await buildPosthogProvider({ posthog: { apiKey: 'phc' }, sendFeatureFlagEvents: true })
    await provider.resolveBooleanEvaluation('flag', false, { targetingKey: 'u1' }, NOOP_LOGGER)
    expect(getFeatureFlag).toHaveBeenCalledWith('flag', 'u1', { sendFeatureFlagEvents: true })
  })

  it('filters out non-object groupProperties entries', async () => {
    getFeatureFlag.mockResolvedValueOnce(true)
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = await buildPosthogProvider({ posthog: { apiKey: 'phc' } })
    await provider.resolveBooleanEvaluation('flag', false, {
      targetingKey: 'u1',
      groupProperties: { org: { tier: 'enterprise' }, broken: 'not-an-object' }
    } as unknown as import('@openfeature/server-sdk').EvaluationContext, NOOP_LOGGER)

    expect(getFeatureFlag).toHaveBeenCalledWith('flag', 'u1', expect.objectContaining({
      groupProperties: { org: { tier: 'enterprise' } }
    }))
  })

  it('drops object-valued person properties (only primitives are forwarded)', async () => {
    getFeatureFlag.mockResolvedValueOnce(true)
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = await buildPosthogProvider({ posthog: { apiKey: 'phc' } })
    await provider.resolveBooleanEvaluation('flag', false, {
      targetingKey: 'u1',
      plan: 'pro',
      nested: { ignored: true }
    } as unknown as import('@openfeature/server-sdk').EvaluationContext, NOOP_LOGGER)

    expect(getFeatureFlag).toHaveBeenCalledWith('flag', 'u1', expect.objectContaining({
      personProperties: { plan: 'pro' }
    }))
  })

  it('returns TARGETING_KEY_MISSING for string/number/object evaluators when context is empty', async () => {
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = await buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const s = await provider.resolveStringEvaluation('flag', 'default', {}, NOOP_LOGGER)
    const n = await provider.resolveNumberEvaluation('flag', 0, {}, NOOP_LOGGER)
    const o = await provider.resolveObjectEvaluation('flag', { a: 1 }, {}, NOOP_LOGGER)

    expect(s.errorCode).toBe('TARGETING_KEY_MISSING')
    expect(n.errorCode).toBe('TARGETING_KEY_MISSING')
    expect(o.errorCode).toBe('TARGETING_KEY_MISSING')
  })

  it('returns DEFAULT for string evaluator when SDK returns undefined', async () => {
    getFeatureFlag.mockResolvedValueOnce(undefined)
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = await buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const result = await provider.resolveStringEvaluation('flag', 'control', { targetingKey: 'u1' }, NOOP_LOGGER)
    expect(result).toEqual({ value: 'control', reason: 'DEFAULT' })
  })

  it('returns TYPE_MISMATCH for string evaluator when SDK returns a non-string', async () => {
    getFeatureFlag.mockResolvedValueOnce(true)
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = await buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const result = await provider.resolveStringEvaluation('flag', 'control', { targetingKey: 'u1' }, NOOP_LOGGER)
    expect(result.value).toBe('control')
    expect(result.errorCode).toBe('TYPE_MISMATCH')
  })

  it('returns GENERAL error for string evaluator when SDK throws', async () => {
    getFeatureFlag.mockRejectedValueOnce(new Error('net'))
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = await buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const result = await provider.resolveStringEvaluation('flag', 'control', { targetingKey: 'u1' }, NOOP_LOGGER)
    expect(result.errorCode).toBe('GENERAL')
    expect(result.errorMessage).toBe('net')
  })

  it('returns DEFAULT for number evaluator when payload is undefined', async () => {
    getFeatureFlagPayload.mockResolvedValueOnce(undefined)
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = await buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const result = await provider.resolveNumberEvaluation('flag', 99, { targetingKey: 'u1' }, NOOP_LOGGER)
    expect(result).toEqual({ value: 99, reason: 'DEFAULT' })
  })

  it('returns TYPE_MISMATCH for number evaluator when payload is non-numeric', async () => {
    getFeatureFlagPayload.mockResolvedValueOnce('not-a-number')
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = await buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const result = await provider.resolveNumberEvaluation('flag', 0, { targetingKey: 'u1' }, NOOP_LOGGER)
    expect(result.errorCode).toBe('TYPE_MISMATCH')
    expect(result.value).toBe(0)
  })

  it('returns GENERAL error for number evaluator when SDK throws', async () => {
    getFeatureFlagPayload.mockRejectedValueOnce(new Error('boom'))
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = await buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const result = await provider.resolveNumberEvaluation('flag', 0, { targetingKey: 'u1' }, NOOP_LOGGER)
    expect(result.errorCode).toBe('GENERAL')
    expect(result.errorMessage).toBe('boom')
  })

  it('returns DEFAULT for object evaluator when payload is undefined', async () => {
    getFeatureFlagPayload.mockResolvedValueOnce(undefined)
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = await buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const result = await provider.resolveObjectEvaluation('flag', { a: 1 }, { targetingKey: 'u1' }, NOOP_LOGGER)
    expect(result).toEqual({ value: { a: 1 }, reason: 'DEFAULT' })
  })

  it('returns GENERAL error for object evaluator when SDK throws', async () => {
    getFeatureFlagPayload.mockRejectedValueOnce(new Error('explode'))
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = await buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const result = await provider.resolveObjectEvaluation('flag', { a: 1 }, { targetingKey: 'u1' }, NOOP_LOGGER)
    expect(result.errorCode).toBe('GENERAL')
    expect(result.errorMessage).toBe('explode')
  })

  it('stringifies non-Error values thrown by the SDK', async () => {
    getFeatureFlag.mockRejectedValueOnce('plain string error')
    const { buildPosthogProvider } = await import('../../../src/runtime/server/plugins/posthog')
    const provider = await buildPosthogProvider({ posthog: { apiKey: 'phc' } })

    const result = await provider.resolveBooleanEvaluation('flag', false, { targetingKey: 'u1' }, NOOP_LOGGER)
    expect(result.errorMessage).toBe('plain string error')
  })
})
