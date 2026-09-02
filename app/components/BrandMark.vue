<template>
  <NuxtLink
    :to="localePath('/')"
    active-class=""
    exact-active-class=""
    class="rounded-md px-1 text-xl font-semibold tracking-tight text-highlighted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
  >
    <span data-testid="brand">YOUNGER</span>
  </NuxtLink>
</template>

<script setup lang="ts">
const localePath = useLocalePath()
</script>
