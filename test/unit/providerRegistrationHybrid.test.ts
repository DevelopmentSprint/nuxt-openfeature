import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const setProviderAndWait = vi.fn(async () => {})
let MultiProviderCtor: unknown
const multiProviderInputs: unknown[] = []

vi.mock('@openfeature/server-sdk', async () => {
  const actual = await vi.importActual<typeof import('@openfeature/server-sdk')>('@openfeature/server-sdk')
  class TrackingMultiProvider extends actual.MultiProvider {
    constructor(providers: unknown, strategy: unknown) {
      super(providers as never, strategy as never)
      multiProviderInputs.push({ providers, strategy })
    }
  }
  MultiProviderCtor = TrackingMultiProvider
  return {
    ...actual,
    MultiProvider: TrackingMultiProvider,
    OpenFeature: { setProviderAndWait }
  }
})

const silentLogger = {
  warn: () => {}
}

beforeEach(() => {
  setProviderAndWait.mockClear()
  multiProviderInputs.length = 0
})

afterEach(() => {
  delete process.env.OPENFEATURE_FLAG_TESTHYBRID
})

describe('hybrid provider registration (multiple successful providers)', () => {
  it('wraps two successful providers in a MultiProvider with FirstMatchStrategy', async () => {
    process.env.OPENFEATURE_FLAG_TESTHYBRID = 'true'
    const { registerProviders } = await import('../../src/runtime/server/utils/providerRegistration')

    await registerProviders([
      {
        type: 'in-memory',
        flags: {
          'shared-flag': { variants: { on: true, off: false }, defaultVariant: 'on', disabled: false }
        }
      },
      { type: 'env', envPrefix: 'OPENFEATURE_FLAG_' }
    ], silentLogger)

    expect(setProviderAndWait).toHaveBeenCalledTimes(1)
    const call = setProviderAndWait.mock.calls[0] as unknown as [unknown]
    expect(call[0]).toBeInstanceOf(MultiProviderCtor as new (...args: unknown[]) => unknown)
    expect(multiProviderInputs).toHaveLength(1)
    const input = multiProviderInputs[0] as { providers: { provider: unknown }[], strategy: { constructor: { name: string } } }
    expect(input.providers).toHaveLength(2)
    expect(input.strategy.constructor.name).toBe('FirstMatchStrategy')
  })

  it('promotes a single successful provider directly (no MultiProvider wrapping)', async () => {
    const { registerProviders } = await import('../../src/runtime/server/utils/providerRegistration')

    await registerProviders([
      { type: 'in-memory', flags: {} }
    ], silentLogger)

    expect(setProviderAndWait).toHaveBeenCalledTimes(1)
    const call = setProviderAndWait.mock.calls[0] as unknown as [unknown]
    expect(call[0]).not.toBeInstanceOf(MultiProviderCtor as new (...args: unknown[]) => unknown)
    expect(multiProviderInputs).toHaveLength(0)
  })

  it('falls back to a built-in InMemoryProvider when no adapter matches the provider type', async () => {
    const { buildProvider } = await import('../../src/runtime/server/utils/providerRegistration')
    const provider = await buildProvider({ type: 'totally-unknown' as never, flags: {} })
    expect(provider.constructor.name).toBe('InMemoryProvider')
  })

  it('drops one failed provider and still wraps the remaining two in a MultiProvider', async () => {
    const { registerProviders } = await import('../../src/runtime/server/utils/providerRegistration')

    await registerProviders([
      { type: 'in-memory', flags: {} },
      { type: 'flagsmith' }, // no env key -> fails to build
      { type: 'env', envPrefix: 'NEVER_MATCH_' }
    ], silentLogger)

    expect(setProviderAndWait).toHaveBeenCalledTimes(1)
    const call = setProviderAndWait.mock.calls[0] as unknown as [unknown]
    expect(call[0]).toBeInstanceOf(MultiProviderCtor as new (...args: unknown[]) => unknown)
  })

  it('uses the default consoleLogger when no logger is provided', async () => {
    const { registerProviders } = await import('../../src/runtime/server/utils/providerRegistration')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await registerProviders([{ type: 'flagsmith' }])

    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('default consoleLogger handles warnings without a context object', async () => {
    const { registerProviders } = await import('../../src/runtime/server/utils/providerRegistration')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // All providers fail to build -> triggers the "all configured providers failed" warning
    // which is logged WITHOUT a context object.
    await registerProviders([{ type: 'flagsmith' }, { type: 'posthog', options: {} }])

    const calls = warn.mock.calls.map(args => args[0] as string)
    expect(calls.some(msg => /all configured providers failed/i.test(msg))).toBe(true)
    warn.mockRestore()
  })
})
