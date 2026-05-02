import type { Provider } from '@openfeature/server-sdk'
import { flagsClient as defaultFlagsClient } from '@vercel/flags-core'
import { VercelProvider } from '@vercel/flags-core/openfeature'

type FlagsClient = typeof defaultFlagsClient

type VercelProviderOptions = {
  flagsClient?: FlagsClient
}

export const buildVercelProvider = (options?: VercelProviderOptions): Provider => {
  const client = options?.flagsClient ?? defaultFlagsClient
  return new VercelProvider(client) as Provider
}
