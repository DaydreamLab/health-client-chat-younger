<template>
  <div
    class="app-segment-switch"
    role="group"
    :aria-label="$t('colorMode.label')"
  >
    <button
      type="button"
      class="app-locale-btn"
      :class="{ 'app-locale-btn-active': !isDark }"
      :aria-pressed="!isDark"
      data-testid="color-mode-day"
      @click="setMode('light')"
    >
      {{ $t('colorMode.day') }}
    </button>
    <button
      type="button"
      class="app-locale-btn"
      :class="{ 'app-locale-btn-active': isDark }"
      :aria-pressed="isDark"
      data-testid="color-mode-dark"
      @click="setMode('dark')"
    >
      {{ $t('colorMode.dark') }}
    </button>
  </div>
</template>

<script setup lang="ts">
type Appearance = 'light' | 'dark'

interface ColorModeHelper {
  preference: string
  value: string
  addColorScheme?: (value: string) => void
  removeColorScheme?: (value: string) => void
}

const STORAGE_KEY = 'nuxt-color-mode'
const colorMode = useColorMode()
const selected = ref<Appearance | null>(null)

const isDark = computed(() => {
  if (selected.value) {
    return selected.value === 'dark'
  }

  return colorMode.value === 'dark'
})

onMounted(() => {
  selected.value = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
})

function setMode(mode: Appearance) {
  selected.value = mode
  colorMode.preference = mode

  if (!import.meta.client) {
    return
  }

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
</script>
