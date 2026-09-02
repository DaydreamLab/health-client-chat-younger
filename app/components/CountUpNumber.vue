<template>
  <span>{{ displayed }}</span>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: number
  duration?: number
  decimals?: number
}>(), {
  duration: 900,
  decimals: 0
})

const displayed = ref(props.decimals > 0 ? (0).toFixed(props.decimals) : '0')

onMounted(() => {
  const start = performance.now()
  const from = 0
  const to = props.value

  const tick = (now: number) => {
    const progress = Math.min(1, (now - start) / props.duration)
    const eased = 1 - (1 - progress) ** 3
    const current = from + (to - from) * eased
    displayed.value = props.decimals > 0
      ? current.toFixed(props.decimals)
      : String(Math.round(current))

    if (progress < 1) {
      requestAnimationFrame(tick)
    }
  }

  requestAnimationFrame(tick)
})
</script>
