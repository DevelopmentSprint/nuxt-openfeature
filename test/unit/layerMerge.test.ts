import { describe, expect, it } from 'vitest'
import { mergeOpenFeatureLayerOptions } from '../../src/utils/options'

describe('mergeOpenFeatureLayerOptions', () => {
  it('returns empty providers / publicFlags when no layers configured', () => {
    const result = mergeOpenFeatureLayerOptions([undefined, undefined])
    expect(result).toEqual({
      providers: [],
      publicFlags: {},
      flagRouteBase: undefined
    })
  })

  it('passes through a single layer unchanged', () => {
    const result = mergeOpenFeatureLayerOptions([
      {
        providers: [{ type: 'in-memory', flags: {} }],
        publicFlags: { 'flag-a': true },
        flagRouteBase: '/api/x'
      }
    ])
    expect(result.providers).toEqual([{ type: 'in-memory', flags: {} }])
    expect(result.publicFlags).toEqual({ 'flag-a': true })
    expect(result.flagRouteBase).toBe('/api/x')
  })

  it('concatenates providers app-first (so app overrides parent under FirstMatchStrategy)', () => {
    // Layers are root-first, app-last: [root, mid, app]
    const result = mergeOpenFeatureLayerOptions([
      { providers: [{ type: 'flagsmith' }] },           // root
      { providers: [{ type: 'in-memory', flags: {} }] }, // mid
      { providers: [{ type: 'vercel' }] }                // app
    ])
    // App provider must appear FIRST so FirstMatchStrategy picks it
    expect(result.providers).toEqual([
      { type: 'vercel' },
      { type: 'in-memory', flags: {} },
      { type: 'flagsmith' }
    ])
  })

  it('preserves provider order within each layer', () => {
    const result = mergeOpenFeatureLayerOptions([
      { providers: [{ type: 'flagsmith' }, { type: 'env' }] }, // root
      { providers: [{ type: 'vercel' }, { type: 'in-memory', flags: {} }] } // app
    ])
    // App layer first (vercel, in-memory), then root layer (flagsmith, env)
    expect(result.providers).toEqual([
      { type: 'vercel' },
      { type: 'in-memory', flags: {} },
      { type: 'flagsmith' },
      { type: 'env' }
    ])
  })

  it('deep-merges publicFlags with child layers winning on key collision', () => {
    const result = mergeOpenFeatureLayerOptions([
      { publicFlags: { 'shared': false, 'parent-only': 'a' } },
      { publicFlags: { 'shared': true, 'app-only': 42 } }
    ])
    expect(result.publicFlags).toEqual({
      'shared': true,        // app value wins
      'parent-only': 'a',    // inherited
      'app-only': 42         // app's own
    })
  })

  it('uses last-defined flagRouteBase across the chain', () => {
    expect(
      mergeOpenFeatureLayerOptions([
        { flagRouteBase: '/api/parent' },
        {},                              // skip
        { flagRouteBase: '/api/app' }
      ]).flagRouteBase
    ).toBe('/api/app')
  })

  it('inherits flagRouteBase from a parent when app does not set one', () => {
    expect(
      mergeOpenFeatureLayerOptions([
        { flagRouteBase: '/api/parent' },
        { providers: [{ type: 'in-memory', flags: {} }] }
      ]).flagRouteBase
    ).toBe('/api/parent')
  })

  it('ignores undefined layers in the chain', () => {
    const result = mergeOpenFeatureLayerOptions([
      undefined,
      { providers: [{ type: 'in-memory', flags: {} }] },
      undefined
    ])
    expect(result.providers).toEqual([{ type: 'in-memory', flags: {} }])
  })

  it('ignores layers with empty providers arrays', () => {
    const result = mergeOpenFeatureLayerOptions([
      { providers: [] },
      { providers: [{ type: 'in-memory', flags: {} }] }
    ])
    expect(result.providers).toEqual([{ type: 'in-memory', flags: {} }])
  })

  it('a parent layer alone — app defines no openFeature — works (the reported bug)', () => {
    // This is the exact bug the user reported: layer has config, app has nothing,
    // module didn't pick up the parent layer's openFeature config.
    const result = mergeOpenFeatureLayerOptions([
      {
        providers: [{ type: 'vercel', options: { connectionString: 'vf_server_x' } }],
        publicFlags: { 'notifications-enabled': false }
      },
      undefined  // app has no openFeature key
    ])
    expect(result.providers).toHaveLength(1)
    expect(result.providers?.[0]?.type).toBe('vercel')
    expect(result.publicFlags).toEqual({ 'notifications-enabled': false })
  })
})
