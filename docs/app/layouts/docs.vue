<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'

// Numeric file prefixes (e.g. `1.installation.md`, `2.configuration.md`) drive
// nav order via Nuxt Content's convention — prefix is stripped from the URL
// and used as a sort key. No layout-side priority overrides needed.
const { data: navigation } = await useAsyncData('docs-navigation-layout', () => queryCollectionNavigation('docs'))
const nav = computed<ContentNavigationItem[]>(() => navigation.value ?? [])
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
