import { describe, expect, it } from 'vitest'
import { gzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'

import { readOpenFeatureContextHeaders } from '../../src/runtime/server/utils/contextHeaders'

const ENCODING = 'json+gzip+base64url'

const sha256Hex = (value: string) =>
  createHash('sha256').update(value).digest('hex')

const encodePayload = (json: string): string =>
  gzipSync(Buffer.from(json, 'utf-8')).toString('base64url')

const eventWithHeaders = (headers: Record<string, string>): H3Event => {
  const lowercased: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) {
    lowercased[k.toLowerCase()] = v
  }
  return { node: { req: { headers: lowercased } } } as unknown as H3Event
}

describe('readOpenFeatureContextHeaders', () => {
  it('returns undefined when no context headers are present', () => {
    const event = eventWithHeaders({})
    expect(readOpenFeatureContextHeaders(event)).toBeUndefined()
  })

  it('decodes a valid single-header context payload', () => {
    const payload = { targetingKey: 'user-1', traits: { plan: 'pro' } }
    const json = JSON.stringify(payload)
    const event = eventWithHeaders({
      'x-of-ctx': encodePayload(json),
      'x-of-ctx-enc': ENCODING,
      'x-of-ctx-sha256': sha256Hex(json)
    })
    expect(readOpenFeatureContextHeaders(event)).toEqual(payload)
  })

  it('decodes a chunked context payload', () => {
    const payload = { targetingKey: 'chunked-user', traits: { region: 'eu', tier: 'enterprise' } }
    const json = JSON.stringify(payload)
    const encoded = encodePayload(json)
    const splitAt = Math.ceil(encoded.length / 2)
    const event = eventWithHeaders({
      'x-of-ctx-chunks': '2',
      'x-of-ctx-0': encoded.slice(0, splitAt),
      'x-of-ctx-1': encoded.slice(splitAt),
      'x-of-ctx-enc': ENCODING,
      'x-of-ctx-sha256': sha256Hex(json)
    })
    expect(readOpenFeatureContextHeaders(event)).toEqual(payload)
  })

  it('throws 400 when a chunk is missing', () => {
    const event = eventWithHeaders({
      'x-of-ctx-chunks': '2',
      'x-of-ctx-0': 'part0',
      // 'x-of-ctx-1' deliberately missing
      'x-of-ctx-enc': ENCODING,
      'x-of-ctx-sha256': 'irrelevant'
    })
    expect(() => readOpenFeatureContextHeaders(event)).toThrow(/Missing feature flag context chunk/i)
  })

  it('throws 400 when encoding header is wrong', () => {
    const event = eventWithHeaders({
      'x-of-ctx': encodePayload('{}'),
      'x-of-ctx-enc': 'plaintext',
      'x-of-ctx-sha256': sha256Hex('{}')
    })
    expect(() => readOpenFeatureContextHeaders(event)).toThrow(/Invalid feature flag context encoding/i)
  })

  it('throws 400 when sha256 header is missing', () => {
    const event = eventWithHeaders({
      'x-of-ctx': encodePayload('{}'),
      'x-of-ctx-enc': ENCODING
    })
    expect(() => readOpenFeatureContextHeaders(event)).toThrow(/Invalid feature flag context encoding/i)
  })

  it('throws 400 when sha256 hash does not match the decoded payload', () => {
    const json = JSON.stringify({ targetingKey: 'user' })
    const event = eventWithHeaders({
      'x-of-ctx': encodePayload(json),
      'x-of-ctx-enc': ENCODING,
      'x-of-ctx-sha256': 'a'.repeat(64)
    })
    expect(() => readOpenFeatureContextHeaders(event)).toThrow(/hash mismatch/i)
  })

  it('throws 400 when the payload exceeds the size limit', () => {
    // CHUNK_SIZE * MAX_CHUNKS = 2048 * 32 = 65536; 65537 chars trips the guard.
    const event = eventWithHeaders({
      'x-of-ctx': 'a'.repeat(65537),
      'x-of-ctx-enc': ENCODING,
      'x-of-ctx-sha256': 'unused'
    })
    expect(() => readOpenFeatureContextHeaders(event)).toThrow(/too large/i)
  })

  it('throws 400 when chunk count is not a positive integer', () => {
    const event = eventWithHeaders({
      'x-of-ctx-chunks': 'not-a-number',
      'x-of-ctx-enc': ENCODING,
      'x-of-ctx-sha256': 'unused'
    })
    expect(() => readOpenFeatureContextHeaders(event)).toThrow(/Invalid feature flag context chunks/i)
  })

  it('throws 400 when chunk count exceeds MAX_CHUNKS', () => {
    const event = eventWithHeaders({
      'x-of-ctx-chunks': '999',
      'x-of-ctx-enc': ENCODING,
      'x-of-ctx-sha256': 'unused'
    })
    expect(() => readOpenFeatureContextHeaders(event)).toThrow(/Invalid feature flag context chunks/i)
  })

  it('throws 400 when decoded body is not valid JSON', () => {
    const malformed = 'this is not json'
    const event = eventWithHeaders({
      'x-of-ctx': encodePayload(malformed),
      'x-of-ctx-enc': ENCODING,
      'x-of-ctx-sha256': sha256Hex(malformed)
    })
    expect(() => readOpenFeatureContextHeaders(event)).toThrow(/Invalid feature flag context payload/i)
  })

  it.each([
    ['a JSON string', JSON.stringify('just a string')],
    ['a JSON array', JSON.stringify([1, 2, 3])],
    ['a JSON number', JSON.stringify(42)],
    ['JSON null', JSON.stringify(null)],
    ['a numeric targetingKey', JSON.stringify({ targetingKey: 12345 })],
    ['a non-string targetingKey', JSON.stringify({ targetingKey: { foo: 'bar' } })],
    ['a string traits field', JSON.stringify({ targetingKey: 'u', traits: 'oops' })],
    ['an array traits field', JSON.stringify({ targetingKey: 'u', traits: ['a', 'b'] })]
  ])('throws 400 when payload shape is invalid (%s)', (_label, json) => {
    const event = eventWithHeaders({
      'x-of-ctx': encodePayload(json),
      'x-of-ctx-enc': ENCODING,
      'x-of-ctx-sha256': sha256Hex(json)
    })
    expect(() => readOpenFeatureContextHeaders(event)).toThrow(/Invalid feature flag context payload/i)
  })

  it('accepts a valid payload with only targetingKey', () => {
    const json = JSON.stringify({ targetingKey: 'user-1' })
    const event = eventWithHeaders({
      'x-of-ctx': encodePayload(json),
      'x-of-ctx-enc': ENCODING,
      'x-of-ctx-sha256': sha256Hex(json)
    })
    expect(readOpenFeatureContextHeaders(event)).toEqual({ targetingKey: 'user-1' })
  })

  it('accepts a valid payload with only traits', () => {
    const json = JSON.stringify({ traits: { plan: 'pro' } })
    const event = eventWithHeaders({
      'x-of-ctx': encodePayload(json),
      'x-of-ctx-enc': ENCODING,
      'x-of-ctx-sha256': sha256Hex(json)
    })
    expect(readOpenFeatureContextHeaders(event)).toEqual({ traits: { plan: 'pro' } })
  })
})
