import { describe, expect, it, vi } from 'vitest'

vi.mock('../../src/runtime/server/plugins/flagsmith', () => ({
  buildFlagsmithProvider: vi.fn(() => ({ __flagsmith: true })),
  fetchFlagsmithEnvironmentFlags: vi.fn(async () => [
    { key: 'demo', enabled: true, value: 'on' }
  ])
}))
vi.mock('../../src/runtime/server/plugins/posthog', () => ({
  buildPosthogProvider: vi.fn(() => ({ __posthog: true }))
}))
vi.mock('../../src/runtime/server/plugins/vercel', () => ({
  buildVercelProvider: vi.fn(() => ({ __vercel: true }))
}))

describe('provider adapter registry', () => {
  it('exports an adapter for every supported provider type', async () => {
    const { adapters } = await import('../../src/runtime/server/utils/providerAdapters')
    const expected = ['in-memory', 'env', 'flagsmith', 'posthog', 'vercel']
    expect(Object.keys(adapters).sort()).toEqual(expected.sort())
  })

  it('every adapter implements both build and getDiagnostics', async () => {
    const { adapters } = await import('../../src/runtime/server/utils/providerAdapters')
    for (const [type, adapter] of Object.entries(adapters)) {
      expect(typeof adapter.build, `${type}.build`).toBe('function')
      expect(typeof adapter.getDiagnostics, `${type}.getDiagnostics`).toBe('function')
    }
  })

  it('getAdapter returns undefined for unknown types (no throw)', async () => {
    const { getAdapter } = await import('../../src/runtime/server/utils/providerAdapters')
    expect(getAdapter('unknown-provider')).toBeUndefined()
    expect(getAdapter('')).toBeUndefined()
  })

  it('in-memory adapter reports configured flags through diagnostics', async () => {
    const { adapters } = await import('../../src/runtime/server/utils/providerAdapters')
    const result = await adapters['in-memory'].getDiagnostics({
      type: 'in-memory',
      flags: {
        'flag-a': { variants: { on: true, off: false }, defaultVariant: 'on', disabled: false },
        'flag-b': { variants: { on: 'enabled', off: 'disabled' }, defaultVariant: 'off', disabled: true }
      }
    })
    expect(result.type).toBe('in-memory')
    expect(result.flags).toEqual([
      { key: 'flag-a', enabled: true, value: true },
      { key: 'flag-b', enabled: false, value: 'disabled' }
    ])
  })

  it('flagsmith adapter delegates to fetchFlagsmithEnvironmentFlags for diagnostics', async () => {
    const { adapters } = await import('../../src/runtime/server/utils/providerAdapters')
    const { fetchFlagsmithEnvironmentFlags } = await import('../../src/runtime/server/plugins/flagsmith')

    const result = await adapters.flagsmith.getDiagnostics({
      type: 'flagsmith',
      options: { environmentKey: 'fl-test' }
    })

    expect(fetchFlagsmithEnvironmentFlags).toHaveBeenCalledWith({ flagsmith: { environmentKey: 'fl-test' } })
    expect(result).toEqual({ type: 'flagsmith', flags: [{ key: 'demo', enabled: true, value: 'on' }] })
  })

  it('flagsmith adapter returns empty flags array when fetch throws', async () => {
    const { adapters } = await import('../../src/runtime/server/utils/providerAdapters')
    const { fetchFlagsmithEnvironmentFlags } = await import('../../src/runtime/server/plugins/flagsmith')
    vi.mocked(fetchFlagsmithEnvironmentFlags).mockRejectedValueOnce(new Error('network'))

    const result = await adapters.flagsmith.getDiagnostics({
      type: 'flagsmith',
      options: { environmentKey: 'broken' }
    })

    expect(result).toEqual({ type: 'flagsmith', flags: [] })
  })

  it('posthog and vercel adapters return empty diagnostics (no enumeration without context)', async () => {
    const { adapters } = await import('../../src/runtime/server/utils/providerAdapters')

    const posthog = await adapters.posthog.getDiagnostics({ type: 'posthog' })
    const vercel = await adapters.vercel.getDiagnostics({ type: 'vercel' })

    expect(posthog).toEqual({ type: 'posthog', flags: [] })
    expect(vercel).toEqual({ type: 'vercel', flags: [] })
  })

  it('build delegates to the provider builder for posthog and vercel', async () => {
    const { adapters } = await import('../../src/runtime/server/utils/providerAdapters')
    const { buildPosthogProvider } = await import('../../src/runtime/server/plugins/posthog')
    const { buildVercelProvider } = await import('../../src/runtime/server/plugins/vercel')

    adapters.posthog.build({ type: 'posthog', options: { apiKey: 'phc' } })
    adapters.vercel.build({ type: 'vercel' })

    expect(buildPosthogProvider).toHaveBeenCalled()
    expect(buildVercelProvider).toHaveBeenCalled()
  })
})
