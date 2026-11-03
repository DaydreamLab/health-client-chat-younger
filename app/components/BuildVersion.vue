<template>
  <p
    class="font-mono text-[10px] leading-tight"
    data-testid="build-version"
    :aria-label="ariaLabel"
  >
    <template v-if="appVersion">
      {{ appVersion }}
    </template>
    <template v-else>
      Agent: dev ({{ feLabel }}) | Core Engine: beta ({{ coreLabel }})
    </template>
  </p>
</template>

<script setup lang="ts">
function shortSha(raw: string): string {
  const match = raw.match(/[0-9a-f]{7,40}/i)
  return (match?.[0] ?? raw).slice(0, 7)
}

const config = useRuntimeConfig()
const appVersion = String(config.public.appVersion || '')
const feRaw = String(config.public.feSha || '')
const feLabel = feRaw ? shortSha(feRaw) : 'dev'
const coreLabel = ref('—')

const ariaLabel = computed(() => {
  if (appVersion) {
    return appVersion
  }
  return `Agent: dev (${feLabel}) | Core Engine: beta (${coreLabel.value})`
})

onMounted(async () => {
  if (appVersion) {
    return
  }
  try {
    const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')
    const origin = apiBase.replace(/\/api\/v1$/, '')
    if (!origin) {
      return
    }
    const res = await $fetch<{ data?: { revision?: string | null } }>(`${origin}/health`)
    const revision = res?.data?.revision
    if (typeof revision === 'string' && revision.length > 0) {
      coreLabel.value = shortSha(revision)
    }
  } catch {
    // keep em-dash when core is unreachable
  }
})
</script>
