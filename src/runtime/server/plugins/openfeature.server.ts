import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime'

import { registerProviders, type ProviderRegistrationConfig } from '../utils/providerRegistration'

type OpenFeatureRuntimeConfig = {
  providers?: ProviderRegistrationConfig[]
}

export default defineNitroPlugin(async () => {
  const runtimeConfig = useRuntimeConfig()
  const moduleConfig = runtimeConfig.openFeature as OpenFeatureRuntimeConfig | undefined
  const providers = moduleConfig?.providers ?? []

  await registerProviders(providers)
})
