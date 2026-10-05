<template>
  <button
    type="button"
    class="app-icon-toggle"
    :aria-label="localeLabel"
    @click="toggleLocale"
  >
    <UIcon
      name="i-lucide-languages"
      class="size-4"
    />
  </button>
</template>

<script setup lang="ts">
type LocaleCode = 'zh-TW' | 'en'

const { locale, setLocale } = useI18n({ useScope: 'global' })
const switchLocalePath = useSwitchLocalePath()
const route = useRoute()

const pendingLocale = ref<LocaleCode | null>(null)

const currentLocale = computed<LocaleCode>(() => {
  if (pendingLocale.value) {
    return pendingLocale.value
  }

  if (locale.value === 'en' || route.path === '/en' || route.path.startsWith('/en/')) {
    return 'en'
  }

  return 'zh-TW'
})

const localeLabel = computed(() => {
  return currentLocale.value === 'en' ? 'Language: EN' : '語言：繁中'
})

watch(locale, (value) => {
  if (pendingLocale.value && value === pendingLocale.value) {
    pendingLocale.value = null
  }
})

async function switchTo(code: LocaleCode) {
  if (code === currentLocale.value) {
    return
  }

  pendingLocale.value = code
  await setLocale(code)

  const path = switchLocalePath(code)
  if (path && path !== route.fullPath && path !== route.path) {
    await navigateTo(path)
  }
}

function toggleLocale() {
  return switchTo(currentLocale.value === 'en' ? 'zh-TW' : 'en')
}
</script>
