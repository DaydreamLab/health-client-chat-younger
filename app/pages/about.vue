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
    </article>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()

useSeoMeta({
  title: () => t('about.metaTitle')
})

/** Static placeholder body（第一波不走 legal_documents）。 */
const BODY_ZH = `## 我們是誰

Candor（坦見）由 Daydream Lab 打造，協助你把檢驗與穿戴數據轉成可理解的下一步——而不是一堆難懂的數值。

## 我們做什麼

- 健康／營養相關諮詢對話與個人化建議流程
- 報告上傳、解讀與追蹤
- 方案瀏覽與需要時的專人協助

## 聯絡我們

Email：service@candor.example
服務時間：週一至週五 10:00–18:00

（placeholder 文案 · 待營運審）`

const BODY_EN = `## Who we are

Candor is built by Daydream Lab to turn lab and wearable data into understandable next steps—not a wall of numbers.

## What we do

- Health and nutrition consult flows with personalized guidance
- Report upload, interpretation, and follow-up
- Plan browsing and specialist handoff when needed

## Contact

Email: service@candor.example
Hours: Mon–Fri 10:00–18:00

(placeholder copy · pending ops review)`

const bodyMarkdown = computed(() => locale.value === 'en' ? BODY_EN : BODY_ZH)

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
</style>
