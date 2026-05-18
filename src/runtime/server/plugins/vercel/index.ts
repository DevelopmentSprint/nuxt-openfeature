import type { Provider } from '@openfeature/server-sdk'
import type { flagsClient as flagsClientFn } from '@vercel/flags-core'

type FlagsClient = typeof flagsClientFn

type VercelProviderOptions = {
  flagsClient?: FlagsClient
}

export const buildVercelProvider = async (options?: VercelProviderOptions): Promise<Provider> => {
  // Variable indirection defeats bundler static analysis so consumer Vite/Rollup
  // builds don't emit "could not be resolved" warnings for the optional peer.
  const coreSpecifier = '@vercel/flags-core'
  const ofSpecifier = '@vercel/flags-core/openfeature'

  const core = (await import(coreSpecifier).catch(() => {
    throw new Error("Vercel provider configured but '@vercel/flags-core' is not installed. Run: pnpm add @vercel/flags-core")
  })) as typeof import('@vercel/flags-core')

  const ofMod = (await import(ofSpecifier).catch(() => {
    throw new Error("Vercel provider configured but '@vercel/flags-core/openfeature' subpath is not resolvable. Ensure '@vercel/flags-core' is installed and recent enough to expose the openfeature entry.")
  })) as typeof import('@vercel/flags-core/openfeature')

  const client = options?.flagsClient ?? core.flagsClient
  return new ofMod.VercelProvider(client) as Provider
}
