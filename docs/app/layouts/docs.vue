<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'

const { data: navigation } = await useAsyncData('docs-navigation-layout', () => queryCollectionNavigation('docs'))
const nav = computed<ContentNavigationItem[]>(() => {
  const priority: Record<string, number> = {
    '/getting-started': 0,
    '/api': 1
  }
  return [...(navigation.value ?? [])].sort((a, b) => (priority[a.path] ?? 10) - (priority[b.path] ?? 10))
})
</script>

<template>
  <UMain>
    <UContainer>
      <UPage>
        <template #left>
          <UPageAside>
            <UContentNavigation :navigation="nav" highlight />
          </UPageAside>
        </template>

        <slot />
      </UPage>
    </UContainer>
  </UMain>
</template>
