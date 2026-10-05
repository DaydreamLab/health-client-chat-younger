<template>
  <button
    type="button"
    class="app-icon-toggle"
    :aria-label="isDark ? $t('colorMode.dark') : $t('colorMode.day')"
    :aria-pressed="isDark"
    data-testid="color-mode-toggle"
    @click="setMode(isDark ? 'light' : 'dark')"
  >
    <UIcon
      :name="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
      class="size-4"
    />
  </button>
</template>

<script setup lang="ts">
type Appearance = 'light' | 'dark'

interface ColorModeHelper {
  preference: string
  value: string
  addColorScheme?: (value: string) => void
  removeColorScheme?: (value: string) => void
}

const STORAGE_KEY = 'younger-color-mode'
const colorMode = useColorMode()
const pending = ref<Appearance | null>(null)

const actual = computed<Appearance>(() => {
  return colorMode.preference === 'dark' || colorMode.value === 'dark' ? 'dark' : 'light'
})

const isDark = computed(() => (pending.value ?? actual.value) === 'dark')

watch(actual, (mode) => {
  if (pending.value === mode) {
    pending.value = null
  }
})

function applyClass(mode: Appearance) {
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(mode)

  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Keep the in-session class even if storage is blocked.
  }

  const helper = (window as Window & { __NUXT_COLOR_MODE__?: ColorModeHelper }).__NUXT_COLOR_MODE__
  if (!helper) {
    return
  }

  helper.removeColorScheme?.(helper.value)
  helper.addColorScheme?.(mode)
  helper.preference = mode
  helper.value = mode
}

function setMode(mode: Appearance) {
  pending.value = mode
  colorMode.preference = mode

  if (import.meta.client) {
    applyClass(mode)
  }
}

onMounted(() => {
  if (colorMode.preference !== 'light' && colorMode.preference !== 'dark') {
    setMode('light')
  }
})
</script>
