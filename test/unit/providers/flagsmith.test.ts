import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const FlagsmithCtor = vi.fn()
const getEnvironmentFlags = vi.fn()
const FlagsmithOpenFeatureProviderCtor = vi.fn((sdk: unknown, provider: unknown) => ({ __flagsmith: true, sdk, provider }))

vi.mock('flagsmith-nodejs', () => ({
  Flagsmith: FlagsmithCtor
}))

vi.mock('@openfeature/flagsmith-provider', () => ({
  FlagsmithOpenFeatureProvider: FlagsmithOpenFeatureProviderCtor
}))

beforeEach(() => {
  FlagsmithCtor.mockReset().mockImplementation(() => ({ getEnvironmentFlags }))
  getEnvironmentFlags.mockReset()
  FlagsmithOpenFeatureProviderCtor.mockClear()
})

afterEach(() => {
  delete process.env.FLAGSMITH_ENVIRONMENT_KEY
  delete process.env.FLAGSMITH_KEY
  delete process.env.FLAGSMITH_URL
})

describe('buildFlagsmithProvider', () => {
  it('throws when no environment key is available', async () => {
    const { buildFlagsmithProvider } = await import('../../../src/runtime/server/plugins/flagsmith')
    await expect(buildFlagsmithProvider()).rejects.toThrow(/FLAGSMITH_ENVIRONMENT_KEY/)
  })

  it('reads environmentKey from process.env.FLAGSMITH_ENVIRONMENT_KEY', async () => {
    process.env.FLAGSMITH_ENVIRONMENT_KEY = 'env-key-1'
    const { buildFlagsmithProvider } = await import('../../../src/runtime/server/plugins/flagsmith')
    await buildFlagsmithProvider()
    expect(FlagsmithCtor).toHaveBeenCalledWith(expect.objectContaining({ environmentKey: 'env-key-1', apiUrl: 'https://edge.api.flagsmith.com/api/v1/' }))
  })

  it('reads environmentKey from FLAGSMITH_KEY fallback', async () => {
    process.env.FLAGSMITH_KEY = 'fallback-key'
    const { buildFlagsmithProvider } = await import('../../../src/runtime/server/plugins/flagsmith')
    await buildFlagsmithProvider()
    expect(FlagsmithCtor).toHaveBeenCalledWith(expect.objectContaining({ environmentKey: 'fallback-key' }))
  })

  it('honors inline options over env vars', async () => {
    process.env.FLAGSMITH_ENVIRONMENT_KEY = 'env-key'
    const { buildFlagsmithProvider } = await import('../../../src/runtime/server/plugins/flagsmith')
    await buildFlagsmithProvider({ flagsmith: { environmentKey: 'inline-key', apiUrl: 'https://custom.flagsmith.test/' } })
    expect(FlagsmithCtor).toHaveBeenCalledWith(expect.objectContaining({ environmentKey: 'inline-key', apiUrl: 'https://custom.flagsmith.test/' }))
  })

  it('forwards provider config to FlagsmithOpenFeatureProvider', async () => {
    const providerConfig = { resolverMode: 'strict' } as unknown as Parameters<typeof import('../../../src/runtime/server/plugins/flagsmith').buildFlagsmithProvider>[0] extends infer T ? T extends { provider?: infer P } ? NonNullable<P> : never : never
    const { buildFlagsmithProvider } = await import('../../../src/runtime/server/plugins/flagsmith')
    await buildFlagsmithProvider({ flagsmith: { environmentKey: 'k' }, provider: providerConfig })
    expect(FlagsmithOpenFeatureProviderCtor).toHaveBeenCalledWith(expect.anything(), providerConfig)
  })

  it('uses FLAGSMITH_URL env when no inline apiUrl is provided', async () => {
    process.env.FLAGSMITH_ENVIRONMENT_KEY = 'k'
    process.env.FLAGSMITH_URL = 'https://eu.flagsmith.test/'
    const { buildFlagsmithProvider } = await import('../../../src/runtime/server/plugins/flagsmith')
    await buildFlagsmithProvider()
    expect(FlagsmithCtor).toHaveBeenCalledWith(expect.objectContaining({ apiUrl: 'https://eu.flagsmith.test/' }))
  })
})

describe('fetchFlagsmithEnvironmentFlags', () => {
  it('throws when no environment key is available', async () => {
    const { fetchFlagsmithEnvironmentFlags } = await import('../../../src/runtime/server/plugins/flagsmith')
    await expect(fetchFlagsmithEnvironmentFlags()).rejects.toThrow(/FLAGSMITH_ENVIRONMENT_KEY/)
  })

  it('returns the SDK environment flags mapped into diagnostics shape', async () => {
    getEnvironmentFlags.mockResolvedValueOnce({
      flags: {
        'flag-a': { enabled: true, value: 'on' },
        'flag-b': { enabled: false, value: null }
      }
    })

    const { fetchFlagsmithEnvironmentFlags } = await import('../../../src/runtime/server/plugins/flagsmith')
    const result = await fetchFlagsmithEnvironmentFlags({ flagsmith: { environmentKey: 'k' } })
    expect(result).toEqual([
      { key: 'flag-a', enabled: true, value: 'on' },
      { key: 'flag-b', enabled: false, value: null }
    ])
  })

  it('reads environmentKey from FLAGSMITH_KEY fallback', async () => {
    process.env.FLAGSMITH_KEY = 'fallback'
    getEnvironmentFlags.mockResolvedValueOnce({ flags: {} })
    const { fetchFlagsmithEnvironmentFlags } = await import('../../../src/runtime/server/plugins/flagsmith')
    const result = await fetchFlagsmithEnvironmentFlags()
    expect(result).toEqual([])
  })
})
