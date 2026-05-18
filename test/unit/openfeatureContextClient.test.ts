import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const useStateImpl = vi.fn<(key: string, init: () => unknown) => { value: unknown }>()
const defineNuxtPlugin = vi.fn(<T>(fn: T) => fn)
const buildOpenFeatureContextHeaders = vi.fn()

vi.mock('#imports', () => ({
  defineNuxtPlugin: (fn: unknown) => defineNuxtPlugin(fn),
  useState: (key: string, init: () => unknown) => useStateImpl(key, init)
}))

vi.mock('../../src/runtime/utils/contextHeaders', () => ({
  buildOpenFeatureContextHeaders: (...args: unknown[]) => buildOpenFeatureContextHeaders(...args),
  OPENFEATURE_HEADER_LIMITS: {
    SINGLE_HEADER_LIMIT: 4096,
    CHUNK_SIZE: 2048,
    MAX_CHUNKS: 32,
    ENCODING: 'json+gzip+base64url'
  }
}))

const stubNavigator = (overrides?: { language?: string, platform?: string, userAgent?: string }) => {
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      language: overrides?.language ?? 'en-US',
      platform: overrides?.platform ?? 'MacIntel',
      userAgent: overrides?.userAgent ?? 'vitest'
    },
    configurable: true
  })
}

let originalFetch: typeof globalThis.$fetch

beforeEach(() => {
  defineNuxtPlugin.mockClear()
  useStateImpl.mockReset().mockReturnValue({ value: null })
  buildOpenFeatureContextHeaders.mockReset()
  stubNavigator()
  originalFetch = globalThis.$fetch
})

afterEach(() => {
  globalThis.$fetch = originalFetch
})

const runPlugin = async () => {
  const mod = await import('../../src/runtime/plugins/openfeature-context.client')
  return (mod.default as () => { provide: { featureFlagContext: () => unknown } })()
}

describe('openfeature-context.client plugin', () => {
  it('registers defineNuxtPlugin with a setup function', async () => {
    buildOpenFeatureContextHeaders.mockResolvedValue({
      headers: [['x-of-ctx', 'small']] as [string, string][],
      encodedLength: 5
    })

    await runPlugin()
    expect(defineNuxtPlugin).toHaveBeenCalled()
  })

  it('exposes the buildContext function under provide.featureFlagContext', async () => {
    buildOpenFeatureContextHeaders.mockResolvedValue({ headers: [], encodedLength: 0 })

    const result = await runPlugin()
    expect(typeof result.provide.featureFlagContext).toBe('function')
  })

  it('builds anonymous context (no targetingKey) when no user is signed in', async () => {
    useStateImpl.mockReturnValue({ value: null })
    buildOpenFeatureContextHeaders.mockResolvedValue({ headers: [], encodedLength: 0 })

    const { provide } = await runPlugin()
    const ctx = provide.featureFlagContext() as { targetingKey?: string, traits: Record<string, unknown> }
    expect(ctx.targetingKey).toBeUndefined()
    expect(ctx.traits.userId).toBeUndefined()
    expect(ctx.traits.locale).toBe('en-US')
    expect(ctx.traits.platform).toBe('MacIntel')
  })

  it('includes user traits when an auth user is signed in', async () => {
    const createdAt = new Date('2024-01-15T12:00:00Z')
    useStateImpl.mockReturnValue({
      value: { id: 'u-1', email: 'a@b.com', emailVerifiedAt: new Date(), createdAt }
    })
    buildOpenFeatureContextHeaders.mockResolvedValue({ headers: [], encodedLength: 0 })

    const { provide } = await runPlugin()
    const ctx = provide.featureFlagContext() as { targetingKey?: string, traits: Record<string, unknown> }
    expect(ctx.targetingKey).toBe('u-1')
    expect(ctx.traits.userId).toBe('u-1')
    expect(ctx.traits.email).toBe('a@b.com')
    expect(ctx.traits.emailVerified).toBe(true)
    expect(ctx.traits.userCreatedAt).toBe(createdAt.toISOString())
  })

  it('sets emailVerified=false when emailVerifiedAt is null', async () => {
    useStateImpl.mockReturnValue({
      value: { id: 'u-2', email: 'b@c.com', emailVerifiedAt: null, createdAt: new Date() }
    })
    buildOpenFeatureContextHeaders.mockResolvedValue({ headers: [], encodedLength: 0 })

    const { provide } = await runPlugin()
    const ctx = provide.featureFlagContext() as { traits: { emailVerified: boolean } }
    expect(ctx.traits.emailVerified).toBe(false)
  })

  it('passes through non-Date createdAt values as-is', async () => {
    const isoString = '2024-02-01T00:00:00Z'
    useStateImpl.mockReturnValue({
      value: { id: 'u-3', email: 'c@d.com', emailVerifiedAt: null, createdAt: isoString as unknown as Date }
    })
    buildOpenFeatureContextHeaders.mockResolvedValue({ headers: [], encodedLength: 0 })

    const { provide } = await runPlugin()
    const ctx = provide.featureFlagContext() as { traits: { userCreatedAt: string } }
    expect(ctx.traits.userCreatedAt).toBe(isoString)
  })

  it('wraps globalThis.$fetch so subsequent calls attach the encoded context headers', async () => {
    const inner = vi.fn(async () => ({ ok: true }))
    globalThis.$fetch = inner as unknown as typeof globalThis.$fetch
    buildOpenFeatureContextHeaders.mockResolvedValue({
      headers: [['x-of-ctx-enc', 'json+gzip+base64url'], ['x-of-ctx', 'abc']] as [string, string][],
      encodedLength: 3
    })

    await runPlugin()
    expect(globalThis.$fetch).not.toBe(inner)

    await globalThis.$fetch('/api/something', { headers: { 'x-custom': 'keep' } } as Parameters<typeof globalThis.$fetch>[1])

    expect(inner).toHaveBeenCalledTimes(1)
    const call = inner.mock.calls[0] as unknown as [string, { headers: Headers }]
    const sentHeaders = call[1].headers
    expect(sentHeaders.get('x-of-ctx-enc')).toBe('json+gzip+base64url')
    expect(sentHeaders.get('x-of-ctx')).toBe('abc')
    expect(sentHeaders.get('x-custom')).toBe('keep')
  })

  it('skips attaching headers but warns when payload exceeds MAX_CHUNKS', async () => {
    const inner = vi.fn(async () => ({ ok: true }))
    globalThis.$fetch = inner as unknown as typeof globalThis.$fetch
    buildOpenFeatureContextHeaders.mockResolvedValue({
      headers: [['x-of-ctx-enc', 'json+gzip+base64url']] as [string, string][],
      encodedLength: 1000000,
      chunkCount: 100
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await runPlugin()
    await globalThis.$fetch('/api/huge')
    const sent = (inner.mock.calls[0] as unknown as [string, { headers: Headers }])[1].headers
    expect(sent.get('x-of-ctx-enc')).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('warns and still calls the underlying fetch when encoding throws', async () => {
    const inner = vi.fn(async () => ({ ok: true }))
    globalThis.$fetch = inner as unknown as typeof globalThis.$fetch
    buildOpenFeatureContextHeaders.mockRejectedValue(new Error('encode failed'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await runPlugin()
    await globalThis.$fetch('/api/anything')

    expect(inner).toHaveBeenCalled()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
