import { beforeEach, describe, expect, it, vi } from 'vitest'

const registerProviders = vi.fn(async (_configs: unknown) => {})
const useRuntimeConfig = vi.fn()
const defineNitroPlugin = vi.fn<(fn: unknown) => unknown>(fn => fn)

vi.mock('nitropack/runtime', () => ({
  defineNitroPlugin: (fn: unknown) => defineNitroPlugin(fn),
  useRuntimeConfig: () => useRuntimeConfig()
}))

vi.mock('../../src/runtime/server/utils/providerRegistration', () => ({
  registerProviders: (configs: unknown) => registerProviders(configs as never)
}))

beforeEach(() => {
  registerProviders.mockClear()
  useRuntimeConfig.mockReset()
  defineNitroPlugin.mockClear()
})

describe('openfeature.server Nitro plugin', () => {
  it('registers providers from runtimeConfig.openFeature.providers', async () => {
    const providers = [{ type: 'in-memory', flags: {} }]
    useRuntimeConfig.mockReturnValueOnce({ openFeature: { providers } })

    const plugin = (await import('../../src/runtime/server/plugins/openfeature.server')).default
    await (plugin as () => Promise<void>)()

    expect(defineNitroPlugin).toHaveBeenCalled()
    expect(registerProviders).toHaveBeenCalledWith(providers)
  })

  it('registers an empty list when runtimeConfig.openFeature is undefined', async () => {
    useRuntimeConfig.mockReturnValueOnce({})

    const plugin = (await import('../../src/runtime/server/plugins/openfeature.server')).default
    await (plugin as () => Promise<void>)()

    expect(registerProviders).toHaveBeenCalledWith([])
  })

  it('registers an empty list when providers field is missing', async () => {
    useRuntimeConfig.mockReturnValueOnce({ openFeature: {} })

    const plugin = (await import('../../src/runtime/server/plugins/openfeature.server')).default
    await (plugin as () => Promise<void>)()

    expect(registerProviders).toHaveBeenCalledWith([])
  })
})
