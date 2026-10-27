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

const BODY_ZH = `歡迎使用 Candor（坦見）。使用本服務即表示你同意以下條款。（placeholder · 待法務／營運審）

## 1. 適用範圍

本條款適用於網站、會員、諮詢對話、報告相關功能與下單流程。

## 2. 帳號與安全

你應提供正確資料並妥善保管登入憑證；不得將帳號提供他人使用。

## 3. 服務說明

諮詢與建議僅供一般資訊參考，不構成醫療診斷或處方。如有不適請就醫。

## 4. 禁止事項

- 侵害他人權利或散佈違法內容
- 干擾系統或未經授權存取
- 濫用自動化手段大量抓取

## 5. 智慧財產

介面、文案、商標與軟體權利歸營運單位或合法授權人所有。

## 6. 免責與責任限制

在法令允許範圍內，我們對間接損害不負責任；服務可能維護或中斷。

## 7. 準據法

中華民國法律；以臺灣臺北地方法院為第一審管轄法院（placeholder）。`

const BODY_EN = `Welcome to Candor. By using this service you agree to the following terms. (placeholder · pending legal/ops review)

## 1. Scope

These terms cover the website, membership, consult chat, report features, and checkout.

## 2. Account and security

Provide accurate information and keep credentials safe; do not share your account.

## 3. Service description

Consults and suggestions are general information only and are not medical diagnosis or prescriptions. Seek care if you feel unwell.

## 4. Prohibited use

- Infringing others’ rights or posting illegal content
- Interfering with systems or unauthorized access
- Abusive automated scraping

## 5. Intellectual property

UI, copy, trademarks, and software belong to the operator or rightful licensors.

## 6. Disclaimer and limitation

To the extent allowed by law, we are not liable for indirect damages; service may pause for maintenance.

## 7. Governing law

Laws of the Republic of China (Taiwan); Taipei District Court as court of first instance (placeholder).`

const bodyMarkdown = computed(() => locale.value === 'en' ? BODY_EN : BODY_ZH)

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
