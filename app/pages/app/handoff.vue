<script setup lang="ts">
definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const localePath = useLocalePath()

// Client-only redirect so generate does not write a meta-refresh stub that
// points at /chat before chat/index.html exists in the static output.
onMounted(() => {
  void navigateTo(localePath('/chat'), { replace: true })
})
</script>

<template>
  <div
    class="flex min-h-48 items-center justify-center text-sm text-muted"
    data-testid="handoff-redirect"
  >
    {{ $t('memberShell.loading') }}
  </div>
</template>
