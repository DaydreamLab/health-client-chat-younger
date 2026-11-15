<template>
  <div
    class="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16"
    data-testid="terms-page"
  >
    <p
      v-if="pending"
      class="text-sm text-muted"
      data-testid="terms-loading"
    >
      {{ $t('terms.loading') }}
    </p>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-dashed border-error/40 bg-elevated p-8"
      data-testid="terms-error"
    >
      <p class="text-sm text-error">
        {{ $t('terms.loadError') }}
      </p>
      <AppButton
        class="mt-4"
        variant="outline"
        data-testid="terms-retry"
        @click="load"
      >
        {{ $t('terms.retry') }}
      </AppButton>
    </div>

    <article
      v-else
      data-testid="terms-article"
    >
      <header class="space-y-2 border-b border-default pb-6">
        <h1
          class="text-2xl font-semibold text-highlighted sm:text-3xl"
          data-testid="terms-title"
        >
          {{ $t('terms.title') }}
        </h1>
        <p
          class="text-sm text-muted"
          data-testid="terms-meta"
        >
          {{ $t('terms.updatedAt', { date: formatUpdatedAt(UPDATED_AT) }) }}
          <span aria-hidden="true"> · </span>
          {{ $t('terms.version', { version: VERSION }) }}
        </p>
      </header>

      <div
        class="terms-body mt-8 text-base text-highlighted"
        data-testid="terms-body"
      >
        <ChatMarkdown :text="bodyMarkdown" />
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()

useSeoMeta({
  title: () => t('terms.metaTitle')
})

/** Static placeholder meta（第一波不走 legal_documents）。 */
const UPDATED_AT = '2026-10-28'
const VERSION = '1'

const bodyMarkdown = computed(() => t('terms.body'))

const pending = ref(false)
const loadError = ref(false)

function formatUpdatedAt(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return isoDate
  }

  try {
    return new Intl.DateTimeFormat(locale.value === 'en' ? 'en-US' : 'zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  } catch {
    return isoDate
  }
}

function load() {
  pending.value = false
  loadError.value = false
}
</script>

<style scoped>
.terms-body :deep(.chat-md) {
  font-size: 1rem;
  line-height: 1.7;
}
</style>
