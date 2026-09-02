<script setup lang="ts">
const { locale, t } = useI18n()
const config = useRuntimeConfig()

useHead({
  title: t('meta.title'),
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: `${config.app.baseURL}favicon.ico` }
  ],
  htmlAttrs: {
    lang: locale
  }
})

useSeoMeta({
  title: t('meta.title'),
  description: t('meta.description')
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
