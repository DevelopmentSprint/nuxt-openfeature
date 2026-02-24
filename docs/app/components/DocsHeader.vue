<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'
import type { DropdownMenuItem, NavigationMenuItem } from '#ui/types'

const props = defineProps<{
  links?: NavigationMenuItem[]
  navigation?: ContentNavigationItem[]
}>()

const config = useRuntimeConfig()

const versions = computed<DropdownMenuItem[]>(() => [
  {
    label: `v${config.public.docsVersion as string}`,
    to: '/',
    checked: true,
    type: 'checkbox'
  }
])
</script>

<template>
  <UHeader :menu="{ shouldScaleBackground: true }">
    <template #left>
      <NuxtLink
        to="/"
        class="flex items-end gap-2 font-bold text-lg text-(--ui-text-highlighted) min-w-0 focus-visible:outline-(--ui-primary) shrink-0"
      >
        <DocsLogo class="w-auto h-8 shrink-0" />
      </NuxtLink>

      <UDropdownMenu
        v-slot="{ open }"
        :modal="false"
        :items="versions"
        :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-0' }"
        size="xs"
        class="hidden sm:flex"
      >
        <UButton
          :label="`v${config.public.docsVersion}`"
          variant="subtle"
          trailing-icon="i-lucide-chevron-down"
          size="xs"
          class="-mb-[6px] font-semibold rounded-full truncate"
          :class="[open && 'bg-(--ui-primary)/15']"
          :ui="{
            trailingIcon: ['transition-transform duration-200', open ? 'rotate-180' : undefined]
              .filter(Boolean)
              .join(' ')
          }"
        />
      </UDropdownMenu>
    </template>

    <UNavigationMenu class="z-10" :items="props.links" variant="link" />

    <template #right>
      <UContentSearchButton :label="null" />
      <UColorModeButton class="hidden sm:flex" />
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-simple-icons-github"
        to="https://github.com/ribrewguy/nuxt-openfeature"
        target="_blank"
        aria-label="GitHub repository"
      />
    </template>

    <template #body>
      <UNavigationMenu orientation="vertical" :items="props.links" class="-mx-2.5" />
      <USeparator type="dashed" class="mt-4 mb-6" />
      <UContentNavigation :navigation="props.navigation ?? []" highlight />
    </template>
  </UHeader>
</template>
