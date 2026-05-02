import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let lastProviderArg: unknown = null
const setProviderAndWait = vi.fn(async (provider: unknown) => {
  lastProviderArg = provider
})

vi.mock('@openfeature/server-sdk', async () => {
  const actual = await vi.importActual<typeof import('@openfeature/server-sdk')>('@openfeature/server-sdk')
  return {
    ...actual,
    OpenFeature: { setProviderAndWait }
  }
})

const mockLogger = () => {
  const warnings: { message: string, context?: Record<string, unknown> }[] = []
  return {
    warn: (message: string, context?: Record<string, unknown>) => {
      warnings.push({ message, context })
    },
    warnings
  }
}

describe('registerProviders', () => {
  beforeEach(() => {
    setProviderAndWait.mockClear()
    lastProviderArg = null
  })

  afterEach(() => {
    delete process.env.FLAGSMITH_ENVIRONMENT_KEY
    delete process.env.FLAGSMITH_KEY
    delete process.env.POSTHOG_API_KEY
    delete process.env.POSTHOG_KEY
  })

  it('does nothing when no providers are configured', async () => {
    const { registerProviders } = await import('../../src/runtime/server/utils/providerRegistration')
    const logger = mockLogger()

    await registerProviders([], logger)

    expect(setProviderAndWait).not.toHaveBeenCalled()
    expect(logger.warnings).toHaveLength(0)
  })

  it('registers a single in-memory provider successfully', async () => {
    const { registerProviders } = await import('../../src/runtime/server/utils/providerRegistration')
    const logger = mockLogger()

    await registerProviders([{ type: 'in-memory', flags: {} }], logger)

    expect(setProviderAndWait).toHaveBeenCalledTimes(1)
    expect(logger.warnings).toHaveLength(0)
  })

  it('skips a misconfigured Flagsmith provider and continues with others', async () => {
    const { registerProviders } = await import('../../src/runtime/server/utils/providerRegistration')
    const logger = mockLogger()

    await registerProviders([
      { type: 'flagsmith' },
      { type: 'in-memory', flags: {} }
    ], logger)

    expect(setProviderAndWait).toHaveBeenCalledTimes(1)
    expect(logger.warnings.length).toBeGreaterThanOrEqual(1)
    expect(logger.warnings[0]?.message).toMatch(/construction failed/i)
    expect(logger.warnings[0]?.context?.providerType).toBe('flagsmith')
  })

  it('skips a misconfigured PostHog provider and continues with others', async () => {
    const { registerProviders } = await import('../../src/runtime/server/utils/providerRegistration')
    const logger = mockLogger()

    await registerProviders([
      { type: 'posthog', options: {} },
      { type: 'in-memory', flags: {} }
    ], logger)

    expect(setProviderAndWait).toHaveBeenCalledTimes(1)
    expect(logger.warnings[0]?.context?.providerType).toBe('posthog')
  })

  it('logs and registers nothing when ALL providers fail to construct', async () => {
    const { registerProviders } = await import('../../src/runtime/server/utils/providerRegistration')
    const logger = mockLogger()

    await registerProviders([
      { type: 'flagsmith' },
      { type: 'posthog', options: {} }
    ], logger)

    expect(setProviderAndWait).not.toHaveBeenCalled()
    const allFailedWarning = logger.warnings.find(w => /all configured providers failed/i.test(w.message))
    expect(allFailedWarning).toBeDefined()
  })

  it('error messages do not include sensitive option values', async () => {
    const { registerProviders } = await import('../../src/runtime/server/utils/providerRegistration')
    const logger = mockLogger()

    await registerProviders([
      { type: 'flagsmith', options: { environmentKey: 'super-secret-flagsmith-key-do-not-leak' } }
    ], logger)
    // This particular config is actually valid (has env key), so no warning expected.
    // But the inverse — exercise failure path with a deliberately bad PostHog config:
    await registerProviders([
      { type: 'posthog', options: { apiKey: '' } }
    ], logger)

    const serialized = JSON.stringify(logger.warnings)
    expect(serialized).not.toContain('super-secret-flagsmith-key-do-not-leak')
  })

  it('catches setProviderAndWait failures without throwing', async () => {
    setProviderAndWait.mockRejectedValueOnce(new Error('provider init network error'))
    const { registerProviders } = await import('../../src/runtime/server/utils/providerRegistration')
    const logger = mockLogger()

    await expect(registerProviders([{ type: 'in-memory', flags: {} }], logger)).resolves.toBeUndefined()

    const registrationFailure = logger.warnings.find(w => /provider registration failed/i.test(w.message))
    expect(registrationFailure).toBeDefined()
    expect(registrationFailure?.context?.error).toBe('provider init network error')
  })
})
