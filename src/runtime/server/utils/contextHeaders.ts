import type { H3Event } from 'h3'
import { createError, getHeader } from 'h3'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'

export type OpenFeatureClientContextPayload = {
  targetingKey?: string
  traits?: Record<string, unknown>
}

// Must match client-side encoding settings.
const MAX_CHUNKS = 32
const CHUNK_SIZE = 2048
const ENCODING = 'json+gzip+base64url'

const decodeBase64Url = (value: string): Buffer => {
  // Convert base64url (RFC 4648) into standard base64 for Node's decoder.
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized + '='.repeat(padLength)
  return Buffer.from(padded, 'base64')
}

const sha256Hex = (value: string): string =>
  createHash('sha256').update(value).digest('hex')

/**
 * Read OpenFeature context from request headers.
 *
 * Accepted formats:
 * - Single header: x-of-ctx (base64url(gzip(json)))
 * - Chunked headers: x-of-ctx-chunks + x-of-ctx-0..N-1
 *
 * Integrity:
 * - x-of-ctx-sha256 must match the SHA-256 of the raw JSON string
 * - x-of-ctx-enc must be json+gzip+base64url
 */
export const readOpenFeatureContextHeaders = (
  event: H3Event
): OpenFeatureClientContextPayload | undefined => {
  const encoding = getHeader(event, 'x-of-ctx-enc')
  const shaHeader = getHeader(event, 'x-of-ctx-sha256')
  const chunkCountHeader = getHeader(event, 'x-of-ctx-chunks')
  const singleHeader = getHeader(event, 'x-of-ctx')

  if (!chunkCountHeader && !singleHeader) {
    return undefined
  }

  if (encoding !== ENCODING || !shaHeader) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid feature flag context encoding' })
  }

  let encoded = ''
  if (chunkCountHeader) {
    const chunkCount = Number.parseInt(chunkCountHeader, 10)
    if (!Number.isInteger(chunkCount) || chunkCount <= 0 || chunkCount > MAX_CHUNKS) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid feature flag context chunks' })
    }

    const parts: string[] = []
    for (let index = 0; index < chunkCount; index += 1) {
      const part = getHeader(event, `x-of-ctx-${index}`)
      if (!part) {
        throw createError({ statusCode: 400, statusMessage: 'Missing feature flag context chunk' })
      }
      parts.push(part)
    }
    encoded = parts.join('')
  } else if (singleHeader) {
    encoded = singleHeader
  }

  // Defense-in-depth: avoid extreme header sizes even if the client is buggy.
  if (encoded.length > CHUNK_SIZE * MAX_CHUNKS) {
    throw createError({ statusCode: 400, statusMessage: 'Feature flag context too large' })
  }

  try {
    const compressed = decodeBase64Url(encoded)
    const rawJson = gunzipSync(compressed).toString('utf-8')
    const expected = shaHeader.toLowerCase()
    const actual = sha256Hex(rawJson).toLowerCase()
    if (expected !== actual) {
      throw createError({ statusCode: 400, statusMessage: 'Feature flag context hash mismatch' })
    }

    const parsed: unknown = JSON.parse(rawJson)
    return validateContextPayload(parsed)
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createError({ statusCode: 400, statusMessage: 'Invalid feature flag context payload' })
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const validateContextPayload = (value: unknown): OpenFeatureClientContextPayload => {
  if (!isPlainObject(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid feature flag context payload' })
  }
  if ('targetingKey' in value && value.targetingKey !== undefined && typeof value.targetingKey !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid feature flag context payload' })
  }
  if ('traits' in value && value.traits !== undefined && !isPlainObject(value.traits)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid feature flag context payload' })
  }
  return value as OpenFeatureClientContextPayload
}

export const OPENFEATURE_CONTEXT_HEADER_LIMITS = {
  MAX_CHUNKS,
  CHUNK_SIZE,
  ENCODING
}
