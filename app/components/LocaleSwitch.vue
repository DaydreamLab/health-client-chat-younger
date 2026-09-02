<template>
  <div class="flex items-center gap-1">
    <button
      v-for="item in localeItems"
      :key="item.code"
      type="button"
      class="inline-flex h-8 items-center rounded-md px-2 text-xs leading-none outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
