<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const localePath = useLocalePath()
const { t } = useI18n()

const statusCode = computed(() => Number(props.error?.statusCode) || 500)
const isNotFound = computed(() => statusCode.value === 404)

const title = computed(() =>
  isNotFound.value ? t('error.notFoundTitle') : t('error.genericTitle')
)

const description = computed(() =>
  isNotFound.value ? t('error.notFoundBody') : t('error.genericBody')
)

useHead({
  title: () => `${statusCode.value} · ${title.value}`
})

function goHome() {
  clearError({ redirect: localePath('/') })
}
</script>

<template>
  <div
    class="flex min-h-dvh flex-col items-center justify-center gap-4 bg-default px-6 text-center text-default"
    data-testid="error-page"
    :data-status="statusCode"
  >
    <p class="text-sm font-medium uppercase tracking-[0.2em] text-muted">
      {{ statusCode }}
    </p>
    <h1 class="text-2xl font-semibold text-highlighted">
      {{ title }}
    </h1>
    <p class="max-w-md text-sm leading-6 text-muted">
      {{ description }}
    </p>
    <AppButton
      variant="primary"
      data-testid="error-home"
      @click="goHome"
    >
      {{ $t('error.backHome') }}
    </AppButton>
  </div>
</template>
