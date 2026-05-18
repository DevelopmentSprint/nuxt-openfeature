import { beforeEach, describe, expect, it, vi } from 'vitest'

const VercelProviderCtor = vi.fn(client => ({ __vercel: true, client }))
const defaultFlagsClient = { __default: true }

vi.mock('@vercel/flags-core', () => ({
  flagsClient: defaultFlagsClient
}))
vi.mock('@vercel/flags-core/openfeature', () => ({
  VercelProvider: VercelProviderCtor
}))

type FlagsClientLike = Parameters<typeof VercelProviderCtor>[0]

describe('Vercel OpenFeature provider — three configuration paths', () => {
  beforeEach(() => {
    VercelProviderCtor.mockClear()
  })

  // Path 1: no options → fallback to env-driven default flagsClient
  it('Path 1 — env-driven: uses default flagsClient when no options are provided', async () => {
    const { buildVercelProvider } = await import('../../../src/runtime/server/plugins/vercel')

    const provider = (await buildVercelProvider()) as unknown as { __vercel: boolean, client: unknown }

    expect(VercelProviderCtor).toHaveBeenCalledWith(defaultFlagsClient)
    expect(provider.__vercel).toBe(true)
    expect(provider.client).toBe(defaultFlagsClient)
  })

  it('Path 1 — env-driven: empty objects fall through to default flagsClient', async () => {
    const { buildVercelProvider } = await import('../../../src/runtime/server/plugins/vercel')

    await buildVercelProvider({ options: {}, providerOptions: {} })

    expect(VercelProviderCtor).toHaveBeenCalledWith(defaultFlagsClient)
  })

  // Path 2: explicit connection string in options
  it('Path 2 — connection string: passes options.connectionString directly to VercelProvider', async () => {
    const { buildVercelProvider } = await import('../../../src/runtime/server/plugins/vercel')

    const connectionString = 'flags:?sdkKey=vf_server_abc123'
    await buildVercelProvider({ options: { connectionString } })

    expect(VercelProviderCtor).toHaveBeenCalledWith(connectionString)
  })

  it('Path 2 — connection string: raw SDK key also accepted', async () => {
    const { buildVercelProvider } = await import('../../../src/runtime/server/plugins/vercel')

    const sdkKey = 'vf_server_raw_key_form'
    await buildVercelProvider({ options: { connectionString: sdkKey } })

    expect(VercelProviderCtor).toHaveBeenCalledWith(sdkKey)
  })

  // Path 3: pre-built flagsClient via providerOptions
  it('Path 3 — pre-built client: passes providerOptions.flagsClient directly to VercelProvider', async () => {
    const { buildVercelProvider } = await import('../../../src/runtime/server/plugins/vercel')

    const customClient = { __custom: true } as unknown as FlagsClientLike
    const provider = (await buildVercelProvider({ providerOptions: { flagsClient: customClient } })) as unknown as { client: unknown }

    expect(VercelProviderCtor).toHaveBeenCalledWith(customClient)
    expect(provider.client).toBe(customClient)
  })

  // Precedence
  it('Precedence — explicit flagsClient wins over connectionString', async () => {
    const { buildVercelProvider } = await import('../../../src/runtime/server/plugins/vercel')

    const customClient = { __custom: true } as unknown as FlagsClientLike
    await buildVercelProvider({
      options: { connectionString: 'flags:?sdkKey=vf_server_should_be_ignored' },
      providerOptions: { flagsClient: customClient }
    })

    expect(VercelProviderCtor).toHaveBeenCalledWith(customClient)
    expect(VercelProviderCtor).not.toHaveBeenCalledWith(expect.stringContaining('vf_server_should_be_ignored'))
  })

  it('Precedence — connectionString wins over env-driven default when no flagsClient', async () => {
    const { buildVercelProvider } = await import('../../../src/runtime/server/plugins/vercel')

    const connectionString = 'flags:?sdkKey=vf_server_explicit'
    await buildVercelProvider({ options: { connectionString } })

    expect(VercelProviderCtor).toHaveBeenCalledWith(connectionString)
    expect(VercelProviderCtor).not.toHaveBeenCalledWith(defaultFlagsClient)
  })
})
