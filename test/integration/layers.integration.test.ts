import { describe, expect, it } from 'vitest'
import { buildNuxt, loadNuxt } from '@nuxt/kit'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))
const fixtureDir = resolve(currentDir, '../fixtures/layered')

describe('nuxt-openfeature layered config integration', () => {
  it('inherits openFeature config from a parent layer when the app declares none', async () => {
    const nuxt = await loadNuxt({
      cwd: fixtureDir,
      dev: false,
      ready: true
    })

    try {
      await buildNuxt(nuxt)

      const openFeatureRuntime = nuxt.options.runtimeConfig.openFeature as {
        providers?: Array<{ type: string }>
        publicFlags?: Record<string, unknown>
      }
      const publicRuntime = nuxt.options.runtimeConfig.public?.openFeature as {
        flagRouteBase?: string
      }

      // Parent layer's providers must come through — the bug was that this silently dropped to []
      expect(openFeatureRuntime.providers?.length).toBeGreaterThan(0)
      expect(openFeatureRuntime.providers?.[0]?.type).toBe('in-memory')

      // Parent layer's publicFlags must come through
      expect(openFeatureRuntime.publicFlags?.['notifications-enabled']).toBe(false)
      expect(openFeatureRuntime.publicFlags?.['layer-only-flag']).toBe('fallback')

      // Parent layer's flagRouteBase must come through
      expect(publicRuntime.flagRouteBase).toBe('/api/layered-flags')
    }
    finally {
      await nuxt.close()
    }
  }, 120000)
})
