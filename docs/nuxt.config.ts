import modulePackage from '../package.json'

export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/content'],
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'light',
    fallback: 'light'
  },
  app: {
    head: {
      title: 'Nuxt OpenFeature Docs',
      meta: [
        {
          name: 'description',
          content: 'Documentation for @ribrewguy/nuxt-openfeature'
        }
      ]
    }
  },
  runtimeConfig: {
    public: {
      docsVersion: modulePackage.version
    }
  },
  content: {
    build: {
      markdown: {
        highlight: {
          langs: ['bash', 'ts', 'json', 'yml', 'vue']
        }
      }
    }
  },
  compatibilityDate: '2025-01-01'
})
