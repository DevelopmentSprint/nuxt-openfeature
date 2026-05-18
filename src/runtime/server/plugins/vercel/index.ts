import type { Provider } from '@openfeature/server-sdk'
import type { flagsClient as flagsClientFn } from '@vercel/flags-core'

type FlagsClient = typeof flagsClientFn

type VercelProviderOptions = {
  flagsClient?: FlagsClient
}

export const buildVercelProvider = async (options?: VercelProviderOptions): Promise<Provider> => {
  const core = await import('@vercel/flags-core').catch(() => {
    throw new Error("Vercel provider configured but '@vercel/flags-core' is not installed. Run: pnpm add @vercel/flags-core")
  })

  const ofMod = await import('@vercel/flags-core/openfeature').catch(() => {
    throw new Error("Vercel provider configured but '@vercel/flags-core/openfeature' subpath is not resolvable. Ensure '@vercel/flags-core' is installed and recent enough to expose the openfeature entry.")
  })

  const client = options?.flagsClient ?? core.flagsClient
  return new ofMod.VercelProvider(client) as Provider
}
