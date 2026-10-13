<template>
  <p
    class="font-mono text-[10px] leading-tight"
    data-testid="build-version"
    :aria-label="`Agent: Version - ${feLabel} | Core Engine: Version - ${coreLabel}`"
  >
    Agent: Version - {{ feLabel }} | Core Engine: Version - {{ coreLabel }}
  </p>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const feRaw = String(config.public.feSha || '')
const feLabel = feRaw ? feRaw.slice(0, 7) : 'dev'
const coreLabel = ref('—')

onMounted(async () => {
  try {
    const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')
    const origin = apiBase.replace(/\/api\/v1$/, '')
    if (!origin) {
      return
    }
    const res = await $fetch<{ data?: { revision?: string | null } }>(`${origin}/health`)
    const revision = res?.data?.revision
    if (typeof revision === 'string' && revision.length > 0) {
      coreLabel.value = revision.slice(0, 7)
    }
  } catch {
    // keep em-dash when core is unreachable
  }
})
</script>
