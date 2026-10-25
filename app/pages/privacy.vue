<template>
  <div
    class="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16"
    data-testid="privacy-page"
  >
    <p
      v-if="pending"
      class="text-sm text-muted"
      data-testid="privacy-loading"
    >
      {{ $t('privacy.loading') }}
    </p>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-dashed border-error/40 bg-elevated p-8"
      data-testid="privacy-error"
    >
      <p class="text-sm text-error">
        {{ $t('privacy.loadError') }}
      </p>
      <AppButton
        class="mt-4"
        variant="outline"
        data-testid="privacy-retry"
        @click="load"
      >
        {{ $t('privacy.retry') }}
      </AppButton>
    </div>

    <article
      v-else-if="policy"
      data-testid="privacy-article"
    >
      <header class="space-y-2 border-b border-default pb-6">
        <h1
          class="text-2xl font-semibold text-highlighted sm:text-3xl"
          data-testid="privacy-title"
        >
          {{ policy.title }}
        </h1>
        <p
          class="text-sm text-muted"
          data-testid="privacy-meta"
        >
          {{ $t('privacy.updatedAt', { date: formatUpdatedAt(policy.updated_at) }) }}
          <span aria-hidden="true"> · </span>
          {{ $t('privacy.version', { version: policy.version }) }}
        </p>
      </header>

      <div
        class="privacy-body mt-8 text-base text-highlighted"
        data-testid="privacy-body"
      >
        <ChatMarkdown :text="policy.body" />
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { PrivacyPolicy } from '~/utils/candor-api'

const { t, locale } = useI18n()
const candor = useCandorApi()

useSeoMeta({
  title: () => t('privacy.metaTitle')
})

const policy = ref<PrivacyPolicy | null>(null)
const pending = ref(true)
const loadError = ref(false)

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }

  try {
    return new Intl.DateTimeFormat(locale.value === 'en' ? 'en-US' : 'zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  } catch {
    return iso
  }
}

async function load() {
  pending.value = true
  loadError.value = false
  try {
    policy.value = await candor.getPrivacyPolicy()
  } catch {
    policy.value = null
    loadError.value = true
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.privacy-body :deep(.chat-md) {
  font-size: 1rem;
  line-height: 1.7;
}
</style>
