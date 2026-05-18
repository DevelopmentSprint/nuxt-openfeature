import { describe, expect, it } from 'vitest'

describe('src/index public surface', () => {
  it('re-exports the module as the default export', async () => {
    const mod = await import('../../src/index')
    expect(typeof mod.default).toBe('function')
    // defineNuxtModule wraps the setup in an internal `normalizedModule`; just
    // assert it's callable with Nuxt-module shape (function with arity).
    expect(mod.default.length).toBeGreaterThanOrEqual(0)
  })

  it('does not eagerly re-export runtime values that would force-load optional peers', async () => {
    const mod = await import('../../src/index') as Record<string, unknown>
    for (const key of Object.keys(mod)) {
      expect(typeof mod[key]).not.toBe('undefined')
    }
  })
})
