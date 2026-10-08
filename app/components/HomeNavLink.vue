<template>
  <NuxtLink
    :to="localePath('/')"
    active-class=""
    exact-active-class=""
    class="rounded-md text-highlighted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    :class="compact
      ? 'flex size-16 items-center justify-center'
      : 'app-icon-toggle shrink-0'"
    :aria-label="$t('nav.home')"
    data-testid="nav-home"
  >
    <UIcon
      name="i-lucide-home"
      :class="compact ? 'size-6' : 'size-4'"
    />
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
