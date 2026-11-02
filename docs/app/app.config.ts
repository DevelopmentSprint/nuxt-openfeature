export default defineAppConfig({
  seo: {
    title: 'nuxt-openfeature',
    description: 'Server-side OpenFeature feature flags for Nuxt 4: Flagsmith, PostHog, Vercel Flags, env and in-memory providers with request-isolated targeting.',
  },
  header: {
    title: 'nuxt-openfeature',
    logo: {
      // Docus uses this path as is, without app.baseURL, so it names the
      // GitHub Pages path. In local dev the favicon does not load.
      favicon: '/nuxt-openfeature/favicon.svg',
    },
  },
  github: {
    url: 'https://github.com/DevelopmentSprint/nuxt-openfeature',
    // This repository has no integration branch; changes land on main.
    branch: 'main',
    rootDir: 'docs',
  },
  socials: {
    github: 'https://github.com/DevelopmentSprint/nuxt-openfeature',
    npm: 'https://www.npmjs.com/package/@developmentsprint/nuxt-openfeature',
  },
  ui: {
    colors: {
      primary: 'sky',
      neutral: 'slate',
    },
  },
})
