<template>
  <NuxtLink
    :to="localePath('/')"
    class="focus-visible:outline-3 outline-primary/25 rounded-md px-1 -ms-1 text-xl font-semibold tracking-tight text-highlighted"
  >
    <span data-testid="brand">YOUNGER</span>
  </NuxtLink>
</template>

<script setup lang="ts">
const localePath = useLocalePath()
</script>
