import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  OPENFEATURE_HEADER_LIMITS,
  buildOpenFeatureContextHeaders
} from '../../src/runtime/utils/contextHeaders'

const headersMap = (pairs: [string, string][]): Record<string, string> =>
  Object.fromEntries(pairs)

// Use high-entropy random hex so gzip cannot collapse the payload — required to
// reliably exceed the single-header and max-chunk limits in tests.
const incompressible = (bytes: number) => randomBytes(bytes).toString('hex')

describe('buildOpenFeatureContextHeaders', () => {
  it('exposes header limits as a stable object', () => {
    expect(OPENFEATURE_HEADER_LIMITS.SINGLE_HEADER_LIMIT).toBe(4096)
    expect(OPENFEATURE_HEADER_LIMITS.CHUNK_SIZE).toBe(2048)
    expect(OPENFEATURE_HEADER_LIMITS.MAX_CHUNKS).toBe(32)
    expect(OPENFEATURE_HEADER_LIMITS.ENCODING).toBe('json+gzip+base64url')
  })

  it('encodes a small payload in a single x-of-ctx header', async () => {
    const result = await buildOpenFeatureContextHeaders({ targetingKey: 'user-1', traits: { plan: 'pro' } })
    const map = headersMap(result.headers)

    expect(map['x-of-ctx-enc']).toBe('json+gzip+base64url')
    expect(map['x-of-ctx-sha256']).toMatch(/^[0-9a-f]{64}$/)
    expect(typeof map['x-of-ctx']).toBe('string')
    expect(map['x-of-ctx'].length).toBeGreaterThan(0)
    expect(map['x-of-ctx-chunks']).toBeUndefined()
    expect(result.chunkCount).toBeUndefined()
  })

  it('produces a deterministic sha256 regardless of key order in the input', async () => {
    const a = await buildOpenFeatureContextHeaders({ a: 1, b: { c: 2, d: 3 } })
    const b = await buildOpenFeatureContextHeaders({ b: { d: 3, c: 2 }, a: 1 })
    const aMap = headersMap(a.headers)
    const bMap = headersMap(b.headers)
    expect(aMap['x-of-ctx-sha256']).toBe(bMap['x-of-ctx-sha256'])
    expect(aMap['x-of-ctx']).toBe(bMap['x-of-ctx'])
  })

  it('canonicalizes nested arrays element order without reordering values', async () => {
    const r1 = await buildOpenFeatureContextHeaders({ list: [3, 1, 2] })
    const r2 = await buildOpenFeatureContextHeaders({ list: [3, 1, 2] })
    const r3 = await buildOpenFeatureContextHeaders({ list: [1, 2, 3] })
    expect(headersMap(r1.headers)['x-of-ctx-sha256']).toBe(headersMap(r2.headers)['x-of-ctx-sha256'])
    expect(headersMap(r1.headers)['x-of-ctx-sha256']).not.toBe(headersMap(r3.headers)['x-of-ctx-sha256'])
  })

  it('emits chunked headers when the encoded payload exceeds SINGLE_HEADER_LIMIT', async () => {
    const result = await buildOpenFeatureContextHeaders({ traits: { blob: incompressible(8_000) } })
    const map = headersMap(result.headers)

    expect(map['x-of-ctx']).toBeUndefined()
    expect(map['x-of-ctx-chunks']).toBeDefined()
    const chunkCount = Number(map['x-of-ctx-chunks'])
    expect(chunkCount).toBeGreaterThanOrEqual(1)
    for (let i = 0; i < chunkCount; i++) {
      expect(map[`x-of-ctx-${i}`]).toBeDefined()
    }
    expect(result.chunkCount).toBe(chunkCount)
  })

  it('returns only metadata headers when encoded payload exceeds MAX_CHUNKS', async () => {
    const result = await buildOpenFeatureContextHeaders({ traits: { blob: incompressible(80_000) } })
    const map = headersMap(result.headers)

    expect(map['x-of-ctx']).toBeUndefined()
    expect(map['x-of-ctx-chunks']).toBeUndefined()
    expect(result.chunkCount).toBeGreaterThan(OPENFEATURE_HEADER_LIMITS.MAX_CHUNKS)
    expect(map['x-of-ctx-enc']).toBe('json+gzip+base64url')
    expect(map['x-of-ctx-sha256']).toMatch(/^[0-9a-f]{64}$/)
  })

  it('uses base64url alphabet (no +, /, or =)', async () => {
    const result = await buildOpenFeatureContextHeaders({ traits: { v: 'lots+of/padding=='.repeat(100) } })
    const map = headersMap(result.headers)
    const encoded = map['x-of-ctx'] ?? map['x-of-ctx-0'] ?? ''
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect(encoded).not.toContain('=')
  })
})
