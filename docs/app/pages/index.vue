<script setup lang="ts">
definePageMeta({ layout: 'docs' })

const routePath = '/'
const { data } = await useAsyncData('docs-page:/', () =>
  Promise.all([
    queryCollection('docs').path(routePath).first(),
    queryCollectionItemSurroundings('docs', routePath, { fields: ['title', 'description'] })
  ])
)

const page = computed(() => data.value?.[0] ?? null)
const surround = computed(() => data.value?.[1] ?? [])

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

useSeoMeta({
  title: () => page.value?.title ?? 'Nuxt OpenFeature Docs',
  description: () => page.value?.description ?? 'Documentation for @ribrewguy/nuxt-openfeature'
})
</script>

<template>
  <UPage v-if="page">
    <UPageHeader :title="page.title" :description="page.description" />

    <UPageBody>
      <ContentRenderer :value="page" />

      <USeparator v-if="surround.filter(Boolean).length" />
      <UContentSurround v-if="surround.filter(Boolean).length" :surround="surround" />
    </UPageBody>

    <template v-if="page.body?.toc?.links?.length" #right>
      <UContentToc :links="page.body.toc.links" />
    </template>
  </UPage>
</template>
