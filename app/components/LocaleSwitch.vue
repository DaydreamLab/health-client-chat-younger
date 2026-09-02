<template>
  <div class="flex items-center gap-1">
    <button
      v-for="item in localeItems"
      :key="item.code"
      type="button"
      class="rounded-md px-2 py-1 text-xs"
      :class="locale === item.code ? 'bg-primary/10 text-primary' : 'text-muted'"
      @click="setLocale(item.code)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
const { locale, setLocale } = useI18n()

const localeItems = [
  { code: 'zh-TW' as const, label: '繁中' },
  { code: 'en' as const, label: 'EN' }
]
</script>
