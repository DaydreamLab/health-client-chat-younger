<template>
  <article class="rounded-xl border border-default bg-elevated p-5">
    <h1 class="text-xl font-semibold text-highlighted">
      {{ $t('handoff.title') }}
    </h1>
    <p class="mt-2 text-sm text-muted">
      {{ $t('handoff.body') }}
    </p>
  </article>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'member',
  middleware: 'auth'
})
</script>
