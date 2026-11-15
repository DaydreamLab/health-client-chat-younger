<template>
  <div
    class="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16"
    data-testid="about-page"
  >
    <p
      v-if="pending"
      class="text-sm text-muted"
      data-testid="about-loading"
    >
      {{ $t('about.loading') }}
    </p>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-dashed border-error/40 bg-elevated p-8"
      data-testid="about-error"
    >
      <p class="text-sm text-error">
        {{ $t('about.loadError') }}
      </p>
      <AppButton
        class="mt-4"
        variant="outline"
        data-testid="about-retry"
        @click="load"
      >
        {{ $t('about.retry') }}
      </AppButton>
    </div>

    <article
      v-else
      data-testid="about-article"
    >
      <header class="space-y-2 border-b border-default pb-6">
        <h1
          class="text-2xl font-semibold text-highlighted sm:text-3xl"
          data-testid="about-title"
        >
          {{ $t('about.title') }}
        </h1>
      </header>

      <div
        class="mt-8 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-4 text-base leading-relaxed text-highlighted dark:border-brand-800 dark:bg-brand-950/40"
        data-testid="about-lead"
      >
        <p>
          <strong class="font-semibold text-brand-700 dark:text-brand-300">{{ $t('about.leadStrong') }}</strong>
          {{ $t('about.leadRest') }}
        </p>
      </div>

      <div
        class="about-body mt-8 text-base text-highlighted"
        data-testid="about-body"
      >
        <ChatMarkdown :text="bodyMarkdown" />
      </div>

      <div
        class="about-body mt-8 text-base text-highlighted"
        data-testid="about-contact"
      >
        <h2>{{ $t('about.contactHeading') }}</h2>
        <p>
          <SupportEmailLink
            link-class="text-highlighted underline-offset-2 hover:underline"
          />
          <template v-if="supportEmail">
            <br>
          </template>
          {{ $t('about.contactHours') }}
        </p>
        <p class="text-muted">
          {{ $t('about.contactNote') }}
        </p>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { normalizeSupportEmail } from '~/utils/support-email'

const { t } = useI18n()
const config = useRuntimeConfig()
const supportEmail = computed(() => normalizeSupportEmail(config.public.supportEmail))

useSeoMeta({
  title: () => t('about.metaTitle')
})

const bodyMarkdown = computed(() => t('about.body'))

const pending = ref(false)
const loadError = ref(false)

function load() {
  pending.value = false
  loadError.value = false
}
</script>

<style scoped>
.about-body :deep(.chat-md) {
  font-size: 1rem;
  line-height: 1.7;
}

.about-body :deep(h2) {
  margin: 1.5em 0 0.5em;
  font-size: 1.25rem;
  font-weight: 600;
}

.about-body > h2 {
  margin: 1.5em 0 0.5em;
  font-size: 1.25rem;
  font-weight: 600;
}
</style>
