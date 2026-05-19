import OpenFeatureModule from '../../../../src/module'

// Parent layer — defines providers + publicFlags.
// The app extends this and should inherit the openFeature config.
export default defineNuxtConfig({
  modules: [OpenFeatureModule],
  openFeature: {
    providers: [
      {
        type: 'in-memory',
        flags: {
          'notifications-enabled': {
            variants: { on: true, off: false },
            defaultVariant: 'on'
          },
          'layer-only-flag': {
            variants: { on: 'parent-value', off: 'disabled' },
            defaultVariant: 'on'
          }
        }
      }
    ],
    publicFlags: {
      'notifications-enabled': false,
      'layer-only-flag': 'fallback'
    },
    flagRouteBase: '/api/layered-flags'
  }
})
