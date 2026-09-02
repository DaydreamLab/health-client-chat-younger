<template>
  <div
    class="app-locale-switch"
    role="group"
    aria-label="Language"
  >
    <button
      v-for="item in localeItems"
      :key="item.code"
      type="button"
      class="app-locale-btn"
      :class="{ 'app-locale-btn-active': isActive(item.code) }"
      :aria-pressed="isActive(item.code)"
      @click="switchTo(item.code)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
type LocaleCode = 'zh-TW' | 'en'

const { locale, setLocale } = useI18n({ useScope: 'global' })
const switchLocalePath = useSwitchLocalePath()
const route = useRoute()

const localeItems = [
  { code: 'zh-TW' as const, label: '繁中' },
  { code: 'en' as const, label: 'EN' }
]

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

watch(locale, (value) => {
  if (pendingLocale.value && value === pendingLocale.value) {
    pendingLocale.value = null
  }
})

function isActive(code: LocaleCode) {
  return currentLocale.value === code
}

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
</script>
