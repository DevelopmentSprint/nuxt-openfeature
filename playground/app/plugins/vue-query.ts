import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

// The module's client composables need a QueryClient; apps register their own.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient: new QueryClient() })
})
