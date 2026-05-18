import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

const evaluateFeatureFlag = vi.fn()
const getFeatureFlagContext = vi.fn()
const getRouterParam = vi.fn()
const getQuery = vi.fn()
const useRuntimeConfigImports = vi.fn()
const useRuntimeConfigNitro = vi.fn()
const getAdapter = vi.fn()
const sanitizeProvider = vi.fn()

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    getRouterParam: (...args: unknown[]) => getRouterParam(...args),
    getQuery: (...args: unknown[]) => getQuery(...args)
  }
})

vi.mock('../../../src/runtime/server/utils/featureFlags', () => ({
  evaluateFeatureFlag: (...args: unknown[]) => evaluateFeatureFlag(...args),
  getFeatureFlagContext: (...args: unknown[]) => getFeatureFlagContext(...args)
}))

vi.mock('#imports', () => ({
  useRuntimeConfig: () => useRuntimeConfigImports()
}))

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => useRuntimeConfigNitro()
}))

vi.mock('../../../src/runtime/server/utils/providerAdapters', async () => {
  const actual = await vi.importActual<typeof import('../../../src/runtime/server/utils/providerAdapters')>('../../../src/runtime/server/utils/providerAdapters')
  return {
    ...actual,
    getAdapter: (type: string) => getAdapter(type)
  }
})

vi.mock('../../../src/runtime/server/utils/diagnosticsRedaction', () => ({
  sanitizeProvider: (p: unknown) => sanitizeProvider(p)
}))

const stubEvent = { __stub: true } as unknown as H3Event

beforeEach(() => {
  evaluateFeatureFlag.mockReset()
  getFeatureFlagContext.mockReset().mockReturnValue(undefined)
  getRouterParam.mockReset()
  getQuery.mockReset().mockReturnValue({})
  useRuntimeConfigImports.mockReset()
  useRuntimeConfigNitro.mockReset()
  getAdapter.mockReset()
  sanitizeProvider.mockReset().mockImplementation(p => p)
})

describe('GET /api/feature-flags/:key handler', () => {
  it('returns enabled:false when the router param is missing', async () => {
    getRouterParam.mockReturnValueOnce(undefined)
    const handler = (await import('../../../src/runtime/server/api/feature-flags/[key].get')).default
    const result = await handler(stubEvent)
    expect(result).toEqual({ enabled: false })
    expect(evaluateFeatureFlag).not.toHaveBeenCalled()
  })

  it('evaluates the flag with default=false when no query default is provided', async () => {
    getRouterParam.mockReturnValueOnce('my-flag')
    evaluateFeatureFlag.mockResolvedValueOnce(true)
    const handler = (await import('../../../src/runtime/server/api/feature-flags/[key].get')).default
    const result = await handler(stubEvent)
    expect(result).toEqual({ enabled: true })
    expect(evaluateFeatureFlag).toHaveBeenCalledWith('my-flag', false, undefined)
  })

  it("treats query default='true' as boolean true", async () => {
    getRouterParam.mockReturnValueOnce('my-flag')
    getQuery.mockReturnValueOnce({ default: 'true' })
    evaluateFeatureFlag.mockResolvedValueOnce(true)
    const handler = (await import('../../../src/runtime/server/api/feature-flags/[key].get')).default
    await handler(stubEvent)
    expect(evaluateFeatureFlag).toHaveBeenCalledWith('my-flag', true, undefined)
  })

  it("treats query default='1' / '0' as boolean true/false", async () => {
    getRouterParam.mockReturnValue('my-flag')
    evaluateFeatureFlag.mockResolvedValue(false)
    const handler = (await import('../../../src/runtime/server/api/feature-flags/[key].get')).default

    getQuery.mockReturnValueOnce({ default: '1' })
    await handler(stubEvent)
    expect(evaluateFeatureFlag).toHaveBeenLastCalledWith('my-flag', true, undefined)

    getQuery.mockReturnValueOnce({ default: '0' })
    await handler(stubEvent)
    expect(evaluateFeatureFlag).toHaveBeenLastCalledWith('my-flag', false, undefined)
  })

  it('treats boolean query default values directly', async () => {
    getRouterParam.mockReturnValueOnce('my-flag')
    getQuery.mockReturnValueOnce({ default: false })
    evaluateFeatureFlag.mockResolvedValueOnce(true)
    const handler = (await import('../../../src/runtime/server/api/feature-flags/[key].get')).default
    await handler(stubEvent)
    expect(evaluateFeatureFlag).toHaveBeenCalledWith('my-flag', false, undefined)
  })

  it('falls back to false when query default is an unrecognized string', async () => {
    getRouterParam.mockReturnValueOnce('my-flag')
    getQuery.mockReturnValueOnce({ default: 'maybe' })
    evaluateFeatureFlag.mockResolvedValueOnce(false)
    const handler = (await import('../../../src/runtime/server/api/feature-flags/[key].get')).default
    await handler(stubEvent)
    expect(evaluateFeatureFlag).toHaveBeenCalledWith('my-flag', false, undefined)
  })

  it('forwards the resolved context object to evaluateFeatureFlag', async () => {
    getRouterParam.mockReturnValueOnce('flag-ctx')
    getFeatureFlagContext.mockReturnValueOnce({ targetingKey: 'u1', tenant: 'acme' })
    evaluateFeatureFlag.mockResolvedValueOnce(true)
    const handler = (await import('../../../src/runtime/server/api/feature-flags/[key].get')).default
    await handler(stubEvent)
    expect(evaluateFeatureFlag).toHaveBeenCalledWith('flag-ctx', false, { targetingKey: 'u1', tenant: 'acme' })
  })
})

describe('GET /api/feature-flags handler', () => {
  it('returns an empty flags map when no publicFlags are configured', async () => {
    useRuntimeConfigImports.mockReturnValueOnce({ openFeature: {} })
    const handler = (await import('../../../src/runtime/server/api/feature-flags/index.get')).default
    const result = await handler(stubEvent)
    expect(result).toEqual({ flags: {} })
    expect(evaluateFeatureFlag).not.toHaveBeenCalled()
  })

  it('evaluates every configured public flag with a 750ms timeout budget', async () => {
    useRuntimeConfigImports.mockReturnValueOnce({
      openFeature: { publicFlags: { 'flag-a': true, 'flag-b': 'control' } }
    })
    evaluateFeatureFlag
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce('treatment')
    const handler = (await import('../../../src/runtime/server/api/feature-flags/index.get')).default

    const result = await handler(stubEvent)
    expect(result).toEqual({ flags: { 'flag-a': true, 'flag-b': 'treatment' } })
    expect(evaluateFeatureFlag).toHaveBeenCalledWith('flag-a', true, undefined, { timeoutMs: 750 })
    expect(evaluateFeatureFlag).toHaveBeenCalledWith('flag-b', 'control', undefined, { timeoutMs: 750 })
  })

  it('falls back to {} when runtimeConfig.openFeature is undefined', async () => {
    useRuntimeConfigImports.mockReturnValueOnce({})
    const handler = (await import('../../../src/runtime/server/api/feature-flags/index.get')).default
    expect(await handler(stubEvent)).toEqual({ flags: {} })
  })
})

describe('GET /api/feature-flags/diagnostics handler', () => {
  it('returns config with normalized flagRouteBase and empty diagnostics when no providers', async () => {
    useRuntimeConfigNitro.mockReturnValueOnce({
      public: { openFeature: { flagRouteBase: '/api/flags' } }
    })
    const handler = (await import('../../../src/runtime/server/api/feature-flags/diagnostics.get')).default
    const result = await handler(stubEvent)
    expect(result).toEqual({
      config: { flagRouteBase: '/api/flags', providers: [] },
      flagsByProvider: []
    })
  })

  it('uses default flagRouteBase when public config is missing', async () => {
    useRuntimeConfigNitro.mockReturnValueOnce({})
    const handler = (await import('../../../src/runtime/server/api/feature-flags/diagnostics.get')).default
    const result = await handler(stubEvent)
    expect(result.config.flagRouteBase).toBe('/api/feature-flags')
  })

  it('delegates each configured provider to its adapter getDiagnostics', async () => {
    useRuntimeConfigNitro.mockReturnValueOnce({
      openFeature: {
        providers: [
          { type: 'in-memory', flags: {} },
          { type: 'unknown-provider' }
        ]
      }
    })
    const inMemoryAdapter = {
      build: vi.fn(),
      getDiagnostics: vi.fn(async () => ({ type: 'in-memory', flags: [{ key: 'a', enabled: true, value: 1 }] }))
    }
    getAdapter.mockImplementation((type: string) => (type === 'in-memory' ? inMemoryAdapter : undefined))

    const handler = (await import('../../../src/runtime/server/api/feature-flags/diagnostics.get')).default
    const result = await handler(stubEvent)

    expect(inMemoryAdapter.getDiagnostics).toHaveBeenCalled()
    expect(result.flagsByProvider).toEqual([
      { type: 'in-memory', flags: [{ key: 'a', enabled: true, value: 1 }] },
      { type: 'unknown-provider', flags: [] }
    ])
    expect(sanitizeProvider).toHaveBeenCalledTimes(2)
  })

  it('treats non-array providers field as empty', async () => {
    useRuntimeConfigNitro.mockReturnValueOnce({ openFeature: { providers: 'not-an-array' } })
    const handler = (await import('../../../src/runtime/server/api/feature-flags/diagnostics.get')).default
    const result = await handler(stubEvent)
    expect(result.flagsByProvider).toEqual([])
    expect(result.config.providers).toEqual([])
  })
})
