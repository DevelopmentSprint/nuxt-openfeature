import { defineEventHandler, getQuery, getRouterParam } from 'h3'

import { evaluateFeatureFlag, getFeatureFlagContext } from '../../utils/featureFlags'

const normalizeBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (normalized === 'true' || normalized === '1') {
      return true
    }

    if (normalized === 'false' || normalized === '0') {
      return false
    }
  }

  if (typeof value === 'boolean') {
    return value
  }

  return undefined
}

export default defineEventHandler(async (event) => {
  const flagKey = getRouterParam(event, 'key')

  if (!flagKey) {
    return {
      enabled: false
    }
  }

  const query = getQuery(event)
  const defaultValue = normalizeBoolean(query.default) ?? false

  const context = getFeatureFlagContext(event)
  const enabled = await evaluateFeatureFlag(flagKey, defaultValue, context)

  return {
    enabled
  }
})
