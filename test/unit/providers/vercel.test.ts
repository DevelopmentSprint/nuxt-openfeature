import { beforeEach, describe, expect, it, vi } from 'vitest'

const VercelProviderCtor = vi.fn(client => ({ __vercel: true, client }))
const defaultFlagsClient = { __default: true }

vi.mock('@vercel/flags-core', () => ({
  flagsClient: defaultFlagsClient
}))
vi.mock('@vercel/flags-core/openfeature', () => ({
  VercelProvider: VercelProviderCtor
}))

describe('Vercel OpenFeature provider', () => {
  beforeEach(() => {
    VercelProviderCtor.mockClear()
  })

  it('uses the default flagsClient when no override is provided', async () => {
    const { buildVercelProvider } = await import('../../../src/runtime/server/plugins/vercel')

    const provider = buildVercelProvider() as unknown as { __vercel: boolean, client: unknown }

    expect(VercelProviderCtor).toHaveBeenCalledWith(defaultFlagsClient)
    expect(provider.__vercel).toBe(true)
    expect(provider.client).toBe(defaultFlagsClient)
  })

  it('uses an injected flagsClient when provided', async () => {
    const { buildVercelProvider } = await import('../../../src/runtime/server/plugins/vercel')
    const customClient = { __custom: true } as unknown as Parameters<typeof buildVercelProvider>[0] extends { flagsClient?: infer C } ? C : never

    const provider = buildVercelProvider({ flagsClient: customClient }) as unknown as { __vercel: boolean, client: unknown }

    expect(VercelProviderCtor).toHaveBeenCalledWith(customClient)
    expect(provider.client).toBe(customClient)
  })
})
