import { describe, expect, it } from 'vitest'
import { DEFAULT_FLAG_ROUTE_BASE, normalizeFlagRouteBase, normalizeOpenFeatureOptions } from '../../src/utils/options'

describe('normalizeFlagRouteBase — edge cases', () => {
  it('treats whitespace-only input as empty', () => {
    expect(normalizeFlagRouteBase('   ')).toBe(DEFAULT_FLAG_ROUTE_BASE)
  })

  it('prepends a slash when the input has none', () => {
    expect(normalizeFlagRouteBase('flags')).toBe('/flags')
  })

  it('trims surrounding whitespace before normalizing', () => {
    expect(normalizeFlagRouteBase('  /api/x/  ')).toBe('/api/x')
  })

  it('exposes DEFAULT_FLAG_ROUTE_BASE as a named export', () => {
    expect(DEFAULT_FLAG_ROUTE_BASE).toBe('/api/feature-flags')
  })
})

describe('normalizeOpenFeatureOptions — fallback paths', () => {
  it('uses existingRuntimeOptions.publicFlags when moduleOptions.publicFlags is undefined', () => {
    const result = normalizeOpenFeatureOptions(
      {},
      { publicFlags: { fallback: true } }
    )
    expect(result.runtime.publicFlags).toEqual({ fallback: true })
  })

  it('falls back to empty publicFlags when neither side defines them', () => {
    const result = normalizeOpenFeatureOptions({})
    expect(result.runtime.publicFlags).toEqual({})
  })

  it('falls back to empty providers when neither side defines them', () => {
    const result = normalizeOpenFeatureOptions({})
    expect(result.runtime.providers).toEqual([])
  })

  it('uses existingPublicOptions.flagRouteBase when moduleOptions.flagRouteBase is empty', () => {
    const result = normalizeOpenFeatureOptions({}, undefined, { flagRouteBase: '/api/existing' })
    expect(result.public.flagRouteBase).toBe('/api/existing')
  })

  it('emits the default flagRouteBase when nothing is supplied', () => {
    const result = normalizeOpenFeatureOptions({})
    expect(result.public.flagRouteBase).toBe(DEFAULT_FLAG_ROUTE_BASE)
    expect(result.runtime.flagRouteBase).toBe(DEFAULT_FLAG_ROUTE_BASE)
  })
})
