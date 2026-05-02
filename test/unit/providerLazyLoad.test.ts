import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/runtime/server/plugins/flagsmith', () => {
  throw new Error('flagsmith plugin should not be loaded when only in-memory is configured')
})
vi.mock('../../src/runtime/server/plugins/posthog', () => {
  throw new Error('posthog plugin should not be loaded when only in-memory is configured')
})
vi.mock('../../src/runtime/server/plugins/vercel', () => {
  throw new Error('vercel plugin should not be loaded when only in-memory is configured')
})

vi.mock('@openfeature/server-sdk', async () => {
  const actual = await vi.importActual<typeof import('@openfeature/server-sdk')>('@openfeature/server-sdk')
  return {
    ...actual,
    OpenFeature: { setProviderAndWait: vi.fn(async () => {}) }
  }
})

const silentLogger = {
  warn: () => {}
}

describe('provider adapter lazy-loading (regression for honoring optional peers)', () => {
  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('registering only in-memory does not trigger optional provider plugin imports', async () => {
    const { registerProviders } = await import('../../src/runtime/server/utils/providerRegistration')

    await expect(
      registerProviders(
        [{ type: 'in-memory', flags: { 'demo-flag': { variants: { on: true, off: false }, defaultVariant: 'on', disabled: false } } }],
        silentLogger
      )
    ).resolves.toBeUndefined()
  })

  it('registering only env does not trigger optional provider plugin imports', async () => {
    const { registerProviders } = await import('../../src/runtime/server/utils/providerRegistration')

    await expect(
      registerProviders([{ type: 'env', envPrefix: 'NEVER_MATCH_PREFIX_' }], silentLogger)
    ).resolves.toBeUndefined()
  })

  it('attempting to register flagsmith/posthog/vercel surfaces the import error via the resilient warn-and-skip path', async () => {
    const { registerProviders } = await import('../../src/runtime/server/utils/providerRegistration')

    const warnings: { message: string, context?: Record<string, unknown> }[] = []
    const logger = {
      warn: (message: string, context?: Record<string, unknown>) => {
        warnings.push({ message, context })
      }
    }

    await registerProviders([
      { type: 'flagsmith', options: { environmentKey: 'fl' } },
      { type: 'posthog', options: { apiKey: 'phc' } },
      { type: 'vercel' }
    ], logger)

    const skipped = warnings.filter(w => /construction failed/i.test(w.message))
    expect(skipped.map(w => w.context?.providerType).sort()).toEqual(['flagsmith', 'posthog', 'vercel'])
  })
})
