import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    './src/module',
    './src/index',
    './src/types',
    {
      builder: 'mkdist',
      input: './src/runtime',
      outDir: './dist/runtime'
    }
  ],
  clean: true,
  declaration: true,
  externals: [
    '@nuxt/kit',
    '@openfeature/server-sdk',
    '@openfeature/flagsmith-provider',
    'flagsmith-nodejs',
    'posthog-node',
    '@vercel/flags-core',
    '@vercel/flags-core/openfeature',
    'nitropack/runtime',
    'h3',
    '#imports',
    'vue',
    '@tanstack/vue-query'
  ]
})
