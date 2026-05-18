import type { FlagsmithProviderConfig } from '@openfeature/flagsmith-provider'
import type { Provider } from '@openfeature/server-sdk'
import type { FlagsmithConfig, FlagsmithValue } from 'flagsmith-nodejs'

const DEFAULT_FLAGSMITH_URL = 'https://edge.api.flagsmith.com/api/v1/'

type FlagsmithProviderOptions = {
  flagsmith?: FlagsmithConfig
  provider?: FlagsmithProviderConfig
}

const loadFlagsmithSdk = async () => {
  // Variable indirection defeats bundler static analysis so consumer Vite/Rollup
  // builds don't emit "could not be resolved" warnings for the optional peers.
  const sdkSpecifier = 'flagsmith-nodejs'
  const ofSpecifier = '@openfeature/flagsmith-provider'

  const sdk = (await import(sdkSpecifier).catch(() => {
    throw new Error("Flagsmith provider configured but 'flagsmith-nodejs' is not installed. Run: pnpm add flagsmith-nodejs")
  })) as typeof import('flagsmith-nodejs')

  const ofMod = (await import(ofSpecifier).catch(() => {
    throw new Error("Flagsmith provider configured but '@openfeature/flagsmith-provider' is not installed. Run: pnpm add @openfeature/flagsmith-provider")
  })) as typeof import('@openfeature/flagsmith-provider')

  return { Flagsmith: sdk.Flagsmith, FlagsmithOpenFeatureProvider: ofMod.FlagsmithOpenFeatureProvider }
}

export const buildFlagsmithProvider = async (options?: FlagsmithProviderOptions): Promise<Provider> => {
  const environmentKey
    = options?.flagsmith?.environmentKey
      ?? process.env.FLAGSMITH_ENVIRONMENT_KEY
      ?? process.env.FLAGSMITH_KEY
      ?? ''

  if (!environmentKey) {
    throw new Error('Flagsmith provider requires FLAGSMITH_ENVIRONMENT_KEY or flagsmith.environmentKey')
  }

  const { Flagsmith, FlagsmithOpenFeatureProvider } = await loadFlagsmithSdk()
  const apiUrl = options?.flagsmith?.apiUrl ?? process.env.FLAGSMITH_URL ?? DEFAULT_FLAGSMITH_URL

  const flagsmith = new Flagsmith({
    ...options?.flagsmith,
    environmentKey,
    apiUrl
  })

  return new FlagsmithOpenFeatureProvider(flagsmith, options?.provider)
}

export const fetchFlagsmithEnvironmentFlags = async (options?: FlagsmithProviderOptions) => {
  const environmentKey
    = options?.flagsmith?.environmentKey
      ?? process.env.FLAGSMITH_ENVIRONMENT_KEY
      ?? process.env.FLAGSMITH_KEY
      ?? ''

  if (!environmentKey) {
    throw new Error('Flagsmith provider requires FLAGSMITH_ENVIRONMENT_KEY or flagsmith.environmentKey')
  }

  const { Flagsmith } = await loadFlagsmithSdk()
  const apiUrl = options?.flagsmith?.apiUrl ?? process.env.FLAGSMITH_URL ?? DEFAULT_FLAGSMITH_URL

  const flagsmith = new Flagsmith({
    ...options?.flagsmith,
    environmentKey,
    apiUrl
  })

  const flags = await flagsmith.getEnvironmentFlags()
  const entries = Object.entries(flags.flags)

  return entries.map(([key, flag]) => ({
    key,
    enabled: flag.enabled,
    value: flag.value as FlagsmithValue | null
  }))
}
