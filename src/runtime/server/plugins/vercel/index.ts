import type { Provider } from '@openfeature/server-sdk'
import type { flagsClient as flagsClientFn } from '@vercel/flags-core'

type FlagsClient = typeof flagsClientFn

type VercelProviderOptions = {
  options?: {
    connectionString?: string
  }
  providerOptions?: {
    flagsClient?: FlagsClient
  }
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

  // Resolution order:
  // 1. providerOptions.flagsClient — pre-built client, highest precedence
  // 2. options.connectionString — explicit Vercel Flags connection string
  // 3. fallback to core.flagsClient — Proxy that lazily reads process.env.FLAGS
  const explicitClient = options?.providerOptions?.flagsClient
  if (explicitClient) {
    return new ofMod.VercelProvider(explicitClient) as Provider
  }

  const connectionString = options?.options?.connectionString
  if (connectionString) {
    return new ofMod.VercelProvider(connectionString) as Provider
  }

  return new ofMod.VercelProvider(core.flagsClient) as Provider
}
