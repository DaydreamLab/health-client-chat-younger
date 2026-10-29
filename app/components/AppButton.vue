<template>
  <a
    v-if="href"
    v-bind="attrs"
    :href="href"
    :class="classes"
    @click="emit('click', $event)"
  >
    <slot />
  </a>
  <NuxtLink
    v-else-if="to"
    v-bind="attrs"
    :to="to"
    active-class=""
    exact-active-class=""
    :class="classes"
    @click="emit('click', $event)"
  >
    <slot />
  </NuxtLink>
  <button
    v-else
    v-bind="attrs"
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
  variant?: 'primary' | 'outline' | 'ghost' | 'segment'
  type?: 'button' | 'submit'
  class?: string
}>(), {
  variant: 'primary',
  type: 'button'
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const attrs = useAttrs()

const classes = computed(() => [
  'app-btn',
  {
    primary: 'app-btn-primary',
    outline: 'app-btn-outline',
    ghost: 'app-btn-ghost',
    segment: 'app-btn-segment'
  }[props.variant],
  props.class
])
</script>
