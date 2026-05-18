import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const missingPeer = (name: string) => () => {
  throw Object.assign(new Error(`Cannot find package '${name}'`), { code: 'ERR_MODULE_NOT_FOUND' })
}

describe('plugin wrapper files defer SDK imports to runtime', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.doUnmock('posthog-node')
    vi.doUnmock('@vercel/flags-core')
    vi.doUnmock('@vercel/flags-core/openfeature')
    vi.doUnmock('flagsmith-nodejs')
    vi.doUnmock('@openfeature/flagsmith-provider')
  })

  it('posthog wrapper loads when posthog-node is missing; build() throws install hint', async () => {
    vi.doMock('posthog-node', missingPeer('posthog-node'))

    const mod = await import('../../../src/runtime/server/plugins/posthog')
    expect(typeof mod.buildPosthogProvider).toBe('function')

    await expect(mod.buildPosthogProvider({ posthog: { apiKey: 'phc_x' } }))
      .rejects.toThrow(/posthog-node.*not installed/i)
  })

  it('vercel wrapper loads when @vercel/flags-core is missing; build() throws install hint', async () => {
    vi.doMock('@vercel/flags-core', missingPeer('@vercel/flags-core'))
    vi.doMock('@vercel/flags-core/openfeature', missingPeer('@vercel/flags-core/openfeature'))

    const mod = await import('../../../src/runtime/server/plugins/vercel')
    expect(typeof mod.buildVercelProvider).toBe('function')

    await expect(mod.buildVercelProvider())
      .rejects.toThrow(/@vercel\/flags-core.*not installed/i)
  })

  it('vercel wrapper surfaces a precise error when only the /openfeature subpath fails to resolve', async () => {
    vi.doMock('@vercel/flags-core', () => ({ flagsClient: { __real: true } }))
    vi.doMock('@vercel/flags-core/openfeature', missingPeer('@vercel/flags-core/openfeature'))

    const mod = await import('../../../src/runtime/server/plugins/vercel')

    await expect(mod.buildVercelProvider())
      .rejects.toThrow(/@vercel\/flags-core\/openfeature.*not resolvable/i)
  })

  it('flagsmith wrapper loads when flagsmith-nodejs is missing; build() throws install hint', async () => {
    vi.doMock('flagsmith-nodejs', missingPeer('flagsmith-nodejs'))
    vi.doMock('@openfeature/flagsmith-provider', missingPeer('@openfeature/flagsmith-provider'))

    const mod = await import('../../../src/runtime/server/plugins/flagsmith')
    expect(typeof mod.buildFlagsmithProvider).toBe('function')

    await expect(mod.buildFlagsmithProvider({ flagsmith: { environmentKey: 'fl' } }))
      .rejects.toThrow(/flagsmith-nodejs.*not installed/i)
  })

  it('flagsmith install hint surfaces the @openfeature/flagsmith-provider peer when only that is missing', async () => {
    vi.doMock('@openfeature/flagsmith-provider', missingPeer('@openfeature/flagsmith-provider'))

    const mod = await import('../../../src/runtime/server/plugins/flagsmith')

    await expect(mod.buildFlagsmithProvider({ flagsmith: { environmentKey: 'fl' } }))
      .rejects.toThrow(/@openfeature\/flagsmith-provider.*not installed/i)
  })

  it('install-hint errors do not leak option values', async () => {
    vi.doMock('posthog-node', missingPeer('posthog-node'))

    const mod = await import('../../../src/runtime/server/plugins/posthog')
    const secret = 'phc_super_secret_should_not_leak'

    const err = await mod.buildPosthogProvider({ posthog: { apiKey: secret } }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(Error)
    expect(String(err)).toMatch(/posthog-node.*not installed/i)
    expect(String(err)).not.toContain(secret)
  })
})
