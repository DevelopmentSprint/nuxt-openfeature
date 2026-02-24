<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'
import type { NavigationMenuItem } from '#ui/types'

const appConfig = useAppConfig()
const route = useRoute()
const radius = computed(() => `:root { --ui-radius: ${appConfig.theme?.radius ?? 0.25}rem; }`)

useHead({
  htmlAttrs: { lang: 'en' },
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  style: [{ innerHTML: radius, id: 'nuxt-ui-radius', tagPriority: -2 }]
})

useSeoMeta({
  titleTemplate: title => (title ? `${title} · Nuxt OpenFeature Docs` : 'Nuxt OpenFeature Docs')
})

const { data: navigation } = await useAsyncData('docs-navigation', () => queryCollectionNavigation('docs'))
const nav = computed<ContentNavigationItem[]>(() => {
  const priority: Record<string, number> = {
    '/getting-started': 0,
    '/api': 1
  }
  return [...(navigation.value ?? [])].sort((a, b) => (priority[a.path] ?? 10) - (priority[b.path] ?? 10))
})

const { data: files } = useAsyncData('docs-search', () => queryCollectionSearchSections('docs'), { server: false })

const links = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Docs',
    to: '/getting-started/installation',
    icon: 'i-heroicons-book-open',
    active:
      route.path === '/' ||
      route.path.startsWith('/getting-started') ||
      route.path.startsWith('/api') ||
      route.path.startsWith('/providers') ||
      route.path.startsWith('/troubleshooting')
  }
])
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <DocsHeader :links="links" :navigation="nav" />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <ClientOnly>
      <LazyUContentSearch :files="files" :navigation="nav" :multiple="true" :kbds="['meta', 'K']" />
    </ClientOnly>
  </UApp>
</template>
