import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

const getClient = vi.fn()
const getBooleanValue = vi.fn()
const getNumberValue = vi.fn()
const getStringValue = vi.fn()
const getObjectValue = vi.fn()

const readOpenFeatureContextHeaders = vi.fn()

vi.mock('@openfeature/server-sdk', async () => {
  const actual = await vi.importActual<typeof import('@openfeature/server-sdk')>('@openfeature/server-sdk')
  return {
    ...actual,
    OpenFeature: {
      getClient: () => {
        getClient()
        return { getBooleanValue, getNumberValue, getStringValue, getObjectValue }
      }
    }
  }
})

vi.mock('../../src/runtime/server/utils/contextHeaders', () => ({
  readOpenFeatureContextHeaders: (...args: unknown[]) => readOpenFeatureContextHeaders(...args)
}))

const mockEvent = {} as H3Event

beforeEach(() => {
  getClient.mockClear()
  getBooleanValue.mockReset()
  getNumberValue.mockReset()
  getStringValue.mockReset()
  getObjectValue.mockReset()
  readOpenFeatureContextHeaders.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getFeatureFlagContext', () => {
  it('returns undefined when neither client nor server context is present', async () => {
    readOpenFeatureContextHeaders.mockReturnValueOnce(undefined)
    const { getFeatureFlagContext } = await import('../../src/runtime/server/utils/featureFlags')

    expect(getFeatureFlagContext(mockEvent)).toBeUndefined()
  })

  it('returns server-only context with targetingKey when no headers are present', async () => {
    readOpenFeatureContextHeaders.mockReturnValueOnce(undefined)
    const { getFeatureFlagContext } = await import('../../src/runtime/server/utils/featureFlags')

    const ctx = getFeatureFlagContext(mockEvent, { targetingKey: 'user-srv', traits: { plan: 'pro' } })
    expect(ctx).toEqual({ targetingKey: 'user-srv', plan: 'pro' })
  })

  it('returns server-only context traits without targetingKey', async () => {
    readOpenFeatureContextHeaders.mockReturnValueOnce(undefined)
    const { getFeatureFlagContext } = await import('../../src/runtime/server/utils/featureFlags')

    const ctx = getFeatureFlagContext(mockEvent, { traits: { region: 'us-east' } })
    expect(ctx).toEqual({ region: 'us-east' })
  })

  it('returns client-only context with targetingKey when no server context is provided', async () => {
    readOpenFeatureContextHeaders.mockReturnValueOnce({ targetingKey: 'user-cli', traits: { locale: 'en-US' } })
    const { getFeatureFlagContext } = await import('../../src/runtime/server/utils/featureFlags')

    expect(getFeatureFlagContext(mockEvent)).toEqual({ targetingKey: 'user-cli', locale: 'en-US' })
  })

  it('returns client-only context traits without targetingKey', async () => {
    readOpenFeatureContextHeaders.mockReturnValueOnce({ traits: { locale: 'fr-FR' } })
    const { getFeatureFlagContext } = await import('../../src/runtime/server/utils/featureFlags')

    expect(getFeatureFlagContext(mockEvent)).toEqual({ locale: 'fr-FR' })
  })

  it('merges client + server traits with server taking precedence on conflict', async () => {
    readOpenFeatureContextHeaders.mockReturnValueOnce({ targetingKey: 'user-cli', traits: { locale: 'en-US', plan: 'free' } })
    const { getFeatureFlagContext } = await import('../../src/runtime/server/utils/featureFlags')

    const ctx = getFeatureFlagContext(mockEvent, { targetingKey: 'user-srv', traits: { plan: 'pro' } })
    expect(ctx).toEqual({ targetingKey: 'user-srv', locale: 'en-US', plan: 'pro' })
  })

  it('uses client targetingKey when server context omits one', async () => {
    readOpenFeatureContextHeaders.mockReturnValueOnce({ targetingKey: 'user-cli', traits: {} })
    const { getFeatureFlagContext } = await import('../../src/runtime/server/utils/featureFlags')

    const ctx = getFeatureFlagContext(mockEvent, { traits: { tenant: 'acme' } })
    expect(ctx).toEqual({ targetingKey: 'user-cli', tenant: 'acme' })
  })

  it('merges traits without targetingKey when neither side provides one', async () => {
    readOpenFeatureContextHeaders.mockReturnValueOnce({ traits: { a: 1 } })
    const { getFeatureFlagContext } = await import('../../src/runtime/server/utils/featureFlags')

    const ctx = getFeatureFlagContext(mockEvent, { traits: { b: 2 } })
    expect(ctx).toEqual({ a: 1, b: 2 })
  })
})

describe('evaluateFeatureFlag dispatch', () => {
  it('routes boolean defaults to getBooleanValue', async () => {
    getBooleanValue.mockResolvedValueOnce(true)
    const { evaluateFeatureFlag } = await import('../../src/runtime/server/utils/featureFlags')

    const value = await evaluateFeatureFlag('flag-a', false, { targetingKey: 'u1' })
    expect(value).toBe(true)
    expect(getBooleanValue).toHaveBeenCalledWith('flag-a', false, { targetingKey: 'u1' })
  })

  it('routes number defaults to getNumberValue', async () => {
    getNumberValue.mockResolvedValueOnce(42)
    const { evaluateFeatureFlag } = await import('../../src/runtime/server/utils/featureFlags')

    expect(await evaluateFeatureFlag('flag-n', 0)).toBe(42)
    expect(getNumberValue).toHaveBeenCalled()
  })

  it('routes string defaults to getStringValue', async () => {
    getStringValue.mockResolvedValueOnce('v2')
    const { evaluateFeatureFlag } = await import('../../src/runtime/server/utils/featureFlags')

    expect(await evaluateFeatureFlag('flag-s', 'v1')).toBe('v2')
    expect(getStringValue).toHaveBeenCalled()
  })

  it('routes object defaults to getObjectValue', async () => {
    getObjectValue.mockResolvedValueOnce({ enabled: true })
    const { evaluateFeatureFlag } = await import('../../src/runtime/server/utils/featureFlags')

    expect(await evaluateFeatureFlag('flag-o', { enabled: false })).toEqual({ enabled: true })
  })

  it('returns the default value and warns for unsupported types', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { evaluateFeatureFlag } = await import('../../src/runtime/server/utils/featureFlags')

    const result = await evaluateFeatureFlag('flag-x', undefined as unknown as boolean)
    expect(result).toBeUndefined()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('returns the default value on provider error', async () => {
    getBooleanValue.mockRejectedValueOnce(new Error('boom'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { evaluateFeatureFlag } = await import('../../src/runtime/server/utils/featureFlags')

    const result = await evaluateFeatureFlag('flag-a', false)
    expect(result).toBe(false)
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('honors timeoutMs and falls back to default if evaluation does not resolve in time', async () => {
    vi.useFakeTimers()
    getBooleanValue.mockImplementationOnce(() => new Promise(() => {}))
    const { evaluateFeatureFlag } = await import('../../src/runtime/server/utils/featureFlags')

    const pending = evaluateFeatureFlag('flag-slow', false, undefined, { timeoutMs: 100 })
    await vi.advanceTimersByTimeAsync(150)
    expect(await pending).toBe(false)
  })

  it('skips the timeout race when timeoutMs is missing or zero', async () => {
    getBooleanValue.mockResolvedValueOnce(true)
    const { evaluateFeatureFlag } = await import('../../src/runtime/server/utils/featureFlags')

    expect(await evaluateFeatureFlag('flag-fast', false, undefined, { timeoutMs: 0 })).toBe(true)
  })
})
