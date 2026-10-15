// Limits chosen to stay under typical proxy/header line limits.
// If these ever change, update the server-side decoder to match.
const SINGLE_HEADER_LIMIT = 4096
const CHUNK_SIZE = 2048
const MAX_CHUNKS = 32
const ENCODING = 'json+gzip+base64url'

type HeaderPair = [string, string]

type EncodedContextHeaders = {
  headers: HeaderPair[]
  encodedLength: number
  chunkCount?: number
}

// Deep-sort keys to ensure deterministic JSON stringification.
const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(item => canonicalize(item))
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize(record[key])
        return acc
      }, {})
  }

  return value
}

const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

const sha256Hex = async (value: string): Promise<string> => {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

const gzipString = async (value: string): Promise<Uint8Array> => {
  if (!('CompressionStream' in globalThis)) {
    throw new Error('CompressionStream unavailable')
  }

  const stream = new CompressionStream('gzip')
  const writer = stream.writable.getWriter()
  writer.write(new TextEncoder().encode(value))
  writer.close()

  const response = new Response(stream.readable)
  const buffer = await response.arrayBuffer()
  return new Uint8Array(buffer)
}

const splitChunks = (value: string, size: number): string[] => {
  const chunks: string[] = []
  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size))
  }
  return chunks
}

/**
 * Build OpenFeature context headers using a chunked payload with a SHA-256 checksum.
 *
 * Steps:
 * 1) Canonicalize the JSON by sorting keys (deep).
 * 2) Hash the raw JSON string (SHA-256).
 * 3) gzip compress the raw JSON string.
 * 4) base64url encode the compressed bytes.
 * 5) Send either a single header (x-of-ctx) or chunked headers.
 */
export const buildOpenFeatureContextHeaders = async (
  context: unknown
): Promise<EncodedContextHeaders> => {
  const canonicalJson = JSON.stringify(canonicalize(context))
  const sha = await sha256Hex(canonicalJson)
  const compressed = await gzipString(canonicalJson)
  const encoded = base64UrlEncode(compressed)

  const headers: HeaderPair[] = [
    ['x-of-ctx-enc', ENCODING],
    ['x-of-ctx-sha256', sha]
  ]

  if (encoded.length <= SINGLE_HEADER_LIMIT) {
    headers.push(['x-of-ctx', encoded])
    return { headers, encodedLength: encoded.length }
  }

  const chunks = splitChunks(encoded, CHUNK_SIZE)
  if (chunks.length > MAX_CHUNKS) {
    // Too large: return only metadata headers. The caller may choose to skip.
    return { headers, encodedLength: encoded.length, chunkCount: chunks.length }
  }

  headers.push(['x-of-ctx-chunks', String(chunks.length)])
  chunks.forEach((chunk, index) => {
    headers.push([`x-of-ctx-${index}`, chunk])
  })

  return {
    headers,
    encodedLength: encoded.length,
    chunkCount: chunks.length
  }
}

export const OPENFEATURE_HEADER_LIMITS = {
  SINGLE_HEADER_LIMIT,
  CHUNK_SIZE,
  MAX_CHUNKS,
  ENCODING
}
