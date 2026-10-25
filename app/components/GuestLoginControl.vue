<template>
  <NuxtLink
    :to="loginTo"
    :data-testid="testId"
    :class="rootClass"
    :aria-label="$t('nav.login')"
  >
    <UIcon
      :name="icon"
      :class="iconClass"
      aria-hidden="true"
    />
    <span>{{ $t('nav.login') }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'rail' | 'chip' | 'drawer'
  testId?: string
}>(), {
  variant: 'chip',
  testId: 'guest-login'
})

const { loginTo } = useMemberAuthLinks()

const icon = computed(() =>
  props.variant === 'chip' ? 'i-lucide-user-round' : 'i-lucide-log-in'
)

const iconClass = computed(() => {
  if (props.variant === 'rail') {
    return 'size-4'
  }
  if (props.variant === 'drawer') {
    return 'size-[18px]'
  }
  return 'size-3.5'
})

const rootClass = computed(() => {
  if (props.variant === 'rail') {
    return [
      'flex w-14 min-h-10 flex-col items-center justify-center gap-0.5 rounded-[10px]',
      'border-[1.5px] border-primary bg-elevated px-1 py-1.5',
      'text-[11px] font-bold leading-none text-primary',
      'outline-none transition-colors hover:bg-primary/5',
      'focus-visible:ring-2 focus-visible:ring-primary/40'
    ].join(' ')
  }
  if (props.variant === 'drawer') {
    return [
      'mt-1 flex w-full items-center justify-center gap-2 rounded-xl',
      'border-[1.5px] border-primary bg-primary/5 px-4 py-3',
      'text-sm font-bold text-primary',
      'outline-none transition-colors hover:bg-primary/10',
      'focus-visible:ring-2 focus-visible:ring-primary/40'
    ].join(' ')
  }
  return [
    'inline-flex h-8 shrink-0 items-center gap-1 rounded-full',
    'border-[1.5px] border-primary bg-elevated px-3',
    'text-xs font-bold text-primary',
    'outline-none transition-colors hover:bg-primary/5',
    'focus-visible:ring-2 focus-visible:ring-primary/40'
  ].join(' ')
})
</script>
