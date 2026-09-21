<template>
  <NuxtLink
    :to="localePath('/')"
    active-class=""
    exact-active-class=""
    class="rounded-md font-semibold tracking-tight text-highlighted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    :class="compact ? 'flex size-10 items-center justify-center text-base' : 'px-1 text-xl'"
    :aria-label="compact ? $t('brand') : undefined"
  >
    <span data-testid="brand">{{ compact ? $t('brandMark') : $t('brand') }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false
})

const localePath = useLocalePath()
</script>
