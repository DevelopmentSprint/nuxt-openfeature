import { describe, expect, it } from 'vitest'
import { sanitizeProvider } from '../../src/runtime/server/utils/diagnosticsRedaction'

const SECRET_TOKENS = ['apiKey', 'environmentKey', 'personalApiKey', 'token', 'secret', 'password']

const containsSecretSubstring = (serialized: string) =>
  SECRET_TOKENS.some(name => serialized.includes(name))

describe('diagnostics sanitizeProvider', () => {
  it('strips options and providerOptions from a Flagsmith provider', () => {
    const sanitized = sanitizeProvider({
      type: 'flagsmith',
      options: { environmentKey: 'flagsmith-secret-environment-key', apiUrl: 'https://example.com' },
      providerOptions: { useFlagsmithDefaults: false }
    })

    expect(sanitized).not.toHaveProperty('options')
    expect(sanitized).not.toHaveProperty('providerOptions')
    expect(containsSecretSubstring(JSON.stringify(sanitized))).toBe(false)
    expect(sanitized.configured).toBe(true)
  })

  it('strips options from a PostHog provider with apiKey', () => {
    const sanitized = sanitizeProvider({
      type: 'posthog',
      options: { apiKey: 'phc_super_secret_key', host: 'https://us.i.posthog.com' },
      providerOptions: { sendFeatureFlagEvents: false }
    })

    expect(sanitized).not.toHaveProperty('options')
    expect(sanitized).not.toHaveProperty('providerOptions')
    expect(containsSecretSubstring(JSON.stringify(sanitized))).toBe(false)
    expect(sanitized.configured).toBe(true)
  })

  it('preserves type, envPrefix, and flags for an env provider', () => {
    const flags = {
      'enable-x': { variants: { on: true, off: false }, defaultVariant: 'off', disabled: false }
    }
    const sanitized = sanitizeProvider({
      type: 'env',
      envPrefix: 'CUSTOM_FLAG_',
      flags
    })

    expect(sanitized).toEqual({
      type: 'env',
      envPrefix: 'CUSTOM_FLAG_',
      flags,
      configured: false
    })
  })

  it('reports configured=false when no options or providerOptions are present', () => {
    const sanitized = sanitizeProvider({ type: 'in-memory' })
    expect(sanitized.configured).toBe(false)
  })

  it('reports configured=true when only providerOptions is present (no options)', () => {
    const sanitized = sanitizeProvider({
      type: 'vercel',
      providerOptions: { someConfig: 'value' }
    })
    expect(sanitized.configured).toBe(true)
    expect(sanitized).not.toHaveProperty('providerOptions')
  })

  it('omits envPrefix and flags from output when they are not set on input', () => {
    const sanitized = sanitizeProvider({
      type: 'posthog',
      options: { apiKey: 'phc_x' }
    })

    expect(sanitized).not.toHaveProperty('envPrefix')
    expect(sanitized).not.toHaveProperty('flags')
  })
})
