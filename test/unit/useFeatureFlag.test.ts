import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

type QueryStub = {
  data: { value: Record<string, unknown> | undefined }
  isPending: { value: boolean }
  error: { value: Error | null }
  refetch: () => Promise<unknown>
}

const useStateImpl = vi.fn<(key: string, init: () => unknown) => { value: unknown }>()
const useRuntimeConfigImpl = vi.fn()
const useQueryImpl = vi.fn<(options: unknown) => QueryStub>()
const fetchImpl = vi.fn()

vi.mock('#imports', () => ({
  useState: (key: string, init: () => unknown) => useStateImpl(key, init),
  useRuntimeConfig: () => useRuntimeConfigImpl()
}))

vi.mock('@tanstack/vue-query', () => ({
  useQuery: (options: unknown) => useQueryImpl(options)
}))

beforeEach(() => {
  useStateImpl.mockReset().mockReturnValue({ value: null })
  useRuntimeConfigImpl.mockReset().mockReturnValue({ public: { openFeature: { flagRouteBase: '/api/feature-flags' } } })
  useQueryImpl.mockReset()
  fetchImpl.mockReset()
  globalThis.$fetch = fetchImpl as unknown as typeof globalThis.$fetch
})

describe('useFeatureFlags composable', () => {
  it('builds the queryKey from the auth-user id when present', async () => {
    useStateImpl.mockReturnValue({ value: { id: 'user-42' } })
    let captured: { queryKey: { value: readonly unknown[] } } | undefined
    useQueryImpl.mockImplementation((opts: unknown) => {
      captured = opts as { queryKey: { value: readonly unknown[] } }
      return { data: ref({}), isPending: ref(false), error: ref(null), refetch: vi.fn() } as unknown as QueryStub
    })

    const { useFeatureFlags } = await import('../../src/runtime/composables/useFeatureFlag')
    useFeatureFlags()

    expect(captured?.queryKey.value).toEqual(['feature-flags', 'user-42'])
  })

  it('falls back to anonymous in the queryKey when no user is signed in', async () => {
    let captured: { queryKey: { value: readonly unknown[] } } | undefined
    useQueryImpl.mockImplementation((opts: unknown) => {
      captured = opts as { queryKey: { value: readonly unknown[] } }
      return { data: ref({}), isPending: ref(false), error: ref(null), refetch: vi.fn() } as unknown as QueryStub
    })

    const { useFeatureFlags } = await import('../../src/runtime/composables/useFeatureFlag')
    useFeatureFlags()
    expect(captured?.queryKey.value).toEqual(['feature-flags', 'anonymous'])
  })

  it('queryFn fetches against the configured flagRouteBase and returns the flags map', async () => {
    let captured: { queryFn: () => Promise<unknown> } | undefined
    useQueryImpl.mockImplementation((opts: unknown) => {
      captured = opts as { queryFn: () => Promise<unknown> }
      return { data: ref({}), isPending: ref(false), error: ref(null), refetch: vi.fn() } as unknown as QueryStub
    })
    fetchImpl.mockResolvedValueOnce({ flags: { 'flag-a': true } })

    const { useFeatureFlags } = await import('../../src/runtime/composables/useFeatureFlag')
    useFeatureFlags()
    const result = await captured!.queryFn()
    expect(result).toEqual({ 'flag-a': true })
    expect(fetchImpl).toHaveBeenCalledWith('/api/feature-flags', { credentials: 'include' })
  })

  it('queryFn falls back to {} when the server returns no flags field', async () => {
    let captured: { queryFn: () => Promise<unknown> } | undefined
    useQueryImpl.mockImplementation((opts: unknown) => {
      captured = opts as { queryFn: () => Promise<unknown> }
      return { data: ref({}), isPending: ref(false), error: ref(null), refetch: vi.fn() } as unknown as QueryStub
    })
    fetchImpl.mockResolvedValueOnce({})

    const { useFeatureFlags } = await import('../../src/runtime/composables/useFeatureFlag')
    useFeatureFlags()
    const result = await captured!.queryFn()
    expect(result).toEqual({})
  })

  it('strips a trailing slash from flagRouteBase before fetching', async () => {
    useRuntimeConfigImpl.mockReturnValue({ public: { openFeature: { flagRouteBase: '/api/flags/' } } })
    let captured: { queryFn: () => Promise<unknown> } | undefined
    useQueryImpl.mockImplementation((opts: unknown) => {
      captured = opts as { queryFn: () => Promise<unknown> }
      return { data: ref({}), isPending: ref(false), error: ref(null), refetch: vi.fn() } as unknown as QueryStub
    })
    fetchImpl.mockResolvedValueOnce({ flags: {} })

    const { useFeatureFlags } = await import('../../src/runtime/composables/useFeatureFlag')
    useFeatureFlags()
    await captured!.queryFn()
    expect(fetchImpl).toHaveBeenCalledWith('/api/flags', expect.anything())
  })
})

describe('useFeatureFlag composable', () => {
  const stubQuery = (flags: Record<string, unknown>) => {
    useQueryImpl.mockReturnValue({
      data: ref(flags) as unknown as QueryStub['data'],
      isPending: ref(false) as unknown as QueryStub['isPending'],
      error: ref(null) as unknown as QueryStub['error'],
      refetch: vi.fn()
    } as unknown as QueryStub)
  }

  it('returns boolean flag value and enabled=true when flag is true', async () => {
    stubQuery({ 'feat-a': true })
    const { useFeatureFlag } = await import('../../src/runtime/composables/useFeatureFlag')
    const { value, enabled } = useFeatureFlag('feat-a')
    expect(value.value).toBe(true)
    expect(enabled.value).toBe(true)
  })

  it('returns boolean flag value and enabled=false when flag is false', async () => {
    stubQuery({ 'feat-a': false })
    const { useFeatureFlag } = await import('../../src/runtime/composables/useFeatureFlag')
    const { enabled } = useFeatureFlag('feat-a')
    expect(enabled.value).toBe(false)
  })

  it('coerces non-boolean flag values via truthiness', async () => {
    stubQuery({ 'feat-s': 'variant-b', 'feat-n': 0, 'feat-empty': '' })
    const { useFeatureFlag } = await import('../../src/runtime/composables/useFeatureFlag')
    expect(useFeatureFlag('feat-s').enabled.value).toBe(true)
    expect(useFeatureFlag('feat-n').enabled.value).toBe(false)
    expect(useFeatureFlag('feat-empty').enabled.value).toBe(false)
  })

  it('uses the supplied boolean defaultValue when the flag is absent', async () => {
    stubQuery({})
    const { useFeatureFlag } = await import('../../src/runtime/composables/useFeatureFlag')
    expect(useFeatureFlag('missing', { defaultValue: true }).enabled.value).toBe(true)
    expect(useFeatureFlag('missing', { defaultValue: false }).enabled.value).toBe(false)
  })

  it('coerces non-boolean defaultValue via truthiness when the flag is absent', async () => {
    stubQuery({})
    const { useFeatureFlag } = await import('../../src/runtime/composables/useFeatureFlag')
    expect(useFeatureFlag('missing', { defaultValue: 'on' }).enabled.value).toBe(true)
    expect(useFeatureFlag('missing', { defaultValue: 0 }).enabled.value).toBe(false)
  })

  it('exposes pending/error/refresh from the underlying query', async () => {
    stubQuery({})
    const { useFeatureFlag } = await import('../../src/runtime/composables/useFeatureFlag')
    const { pending, error, refresh } = useFeatureFlag('any')
    expect(pending.value).toBe(false)
    expect(error.value).toBeNull()
    expect(typeof refresh).toBe('function')
  })
})
