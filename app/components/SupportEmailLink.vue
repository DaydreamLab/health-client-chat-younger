<template>
  <a
    v-if="mailtoHref"
    :href="mailtoHref"
    :class="linkClass"
    data-testid="support-email"
  >{{ email }}</a>
</template>

<script setup lang="ts">
import { supportEmailLinkModel } from '~/utils/support-email'

withDefaults(defineProps<{
  linkClass?: string
}>(), {
  linkClass: 'text-sm text-white/70 underline-offset-2 transition hover:text-white hover:underline'
})

const config = useRuntimeConfig()
const model = computed(() => supportEmailLinkModel(config.public.supportEmail))
const email = computed(() => model.value?.email ?? '')
const mailtoHref = computed(() => model.value?.href ?? null)
</script>
