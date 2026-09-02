<template>
  <a
    v-if="href"
    :href="href"
    :class="classes"
  >
    <slot />
  </a>
  <NuxtLink
    v-else-if="to"
    :to="to"
    active-class=""
    exact-active-class=""
    :class="classes"
  >
    <slot />
  </NuxtLink>
  <button
    v-else
    :type="type"
    :class="classes"
    @click="emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  to?: string
  href?: string
  variant?: 'primary' | 'outline' | 'ghost'
  type?: 'button' | 'submit'
  class?: string
}>(), {
  variant: 'primary',
  type: 'button'
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const classes = computed(() => [
  'app-btn',
  {
    primary: 'app-btn-primary',
    outline: 'app-btn-outline',
    ghost: 'app-btn-ghost'
  }[props.variant],
  props.class
])
</script>
