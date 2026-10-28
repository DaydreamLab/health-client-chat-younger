<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('member.title') }}
      </h1>
      <AppButton
        v-if="auth.isMember && headerCta === 'view'"
        :to="localePath('/app/recommendations')"
        variant="primary"
        class="ms-auto"
        data-testid="health-view-recommend"
      >
        {{ $t('chat.viewRecommend') }}
      </AppButton>
      <AppButton
        v-else-if="auth.isMember && headerCta === 'submit'"
        :to="localePath('/chat')"
        variant="primary"
        class="ms-auto"
        data-testid="health-submit-expert-review"
      >
        {{ $t('chat.submitExpertReview') }}
      </AppButton>
    </div>

    <MemberAuthGate
      v-if="previewLocked"
      :title="$t('member.guestRequired')"
      :hint="$t('member.guestRequiredHint')"
      icon="i-lucide-heart-pulse"
      test-id="health-auth-gate"
      login-test-id="health-login"
      register-test-id="health-register"
      back-to-chat-test-id="health-back-chat"
    />

    <div
      v-else
      class="flex flex-col gap-6 lg:flex-row lg:items-start"
      data-testid="health-body"
    >
      <div class="flex w-full shrink-0 flex-col gap-4 lg:w-72">
        <section
          class="rounded-2xl border border-default bg-elevated p-3"
          data-testid="health-profile-cards"
        >
          <div
            v-for="card in profileCards"
            :key="card.key"
            class="flex items-baseline justify-between gap-3 py-1.5"
            :data-testid="`health-stat-${card.key}`"
          >
            <p class="shrink-0 text-xs text-muted">
              {{ card.label }}
            </p>
            <p class="min-w-0 text-end text-base font-semibold text-highlighted">
              {{ card.value }}
            </p>
          </div>
        </section>

        <p
          v-if="profileError"
          class="text-sm text-red-600 dark:text-red-400"
          data-testid="health-profile-error"
        >
          {{ profileError }}
        </p>

        <section
          class="rounded-2xl border border-default bg-elevated p-5"
          data-testid="member-privacy"
        >
          <h2 class="font-semibold text-highlighted">
            {{ $t('member.privacyTitle') }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            {{ $t('member.privacyHint') }}
          </p>
          <div
            v-if="!anonymizeOpen"
            class="mt-4"
          >
            <AppButton
              variant="outline"
              data-testid="member-anonymize"
              @click="anonymizeOpen = true"
            >
              {{ $t('member.anonymize') }}
            </AppButton>
          </div>
          <div
            v-else
            class="mt-4 space-y-3"
            data-testid="member-anonymize-panel"
          >
            <p class="text-sm text-highlighted">
              {{ $t('member.anonymizeConfirm') }}
            </p>
            <div class="flex flex-wrap gap-2">
              <AppButton
                data-testid="member-anonymize-confirm"
                :disabled="anonymizePending"
                @click="onAnonymize"
              >
                {{ $t('member.anonymizeConfirmAction') }}
              </AppButton>
              <AppButton
                variant="ghost"
                :disabled="anonymizePending"
                @click="anonymizeOpen = false"
              >
                {{ $t('member.anonymizeDismiss') }}
              </AppButton>
            </div>
            <p
              v-if="anonymizeError"
              class="text-sm text-red-600 dark:text-red-400"
              data-testid="member-anonymize-error"
            >
              {{ anonymizeError }}
            </p>
          </div>
        </section>
      </div>

      <section
        class="min-w-0 flex-1 space-y-6"
      >
        <div
          class="space-y-3"
          data-testid="health-review-records"
        >
          <h2 class="text-lg font-semibold text-highlighted">
            {{ $t('member.reviewRecordsTitle') }}
          </h2>
          <p
            v-if="reviewsLoading"
            class="text-sm text-muted"
            data-testid="health-reviews-loading"
          >
            {{ $t('member.reportsLoading') }}
          </p>
          <p
            v-else-if="reviewsError"
            class="text-sm text-red-600 dark:text-red-400"
            data-testid="health-reviews-error"
          >
            {{ reviewsError }}
          </p>
          <p
            v-else-if="!reviewRecords.length"
            class="text-sm text-muted"
            data-testid="health-reviews-empty"
          >
            {{ $t('member.reviewRecordsEmpty') }}
          </p>
          <ul
            v-else
            class="space-y-3"
          >
            <li
              v-for="review in reviewRecords"
              :key="review.id"
              class="rounded-2xl border border-default bg-elevated p-4"
              :data-testid="`health-review-card-${review.id}`"
              :data-status="review.status"
            >
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="min-w-0 space-y-1">
                  <p class="font-medium text-highlighted">
                    {{ review.status === 'reviewed'
                      ? $t('member.reviewStatusReviewed')
                      : $t('member.reviewStatusAwaiting') }}
                  </p>
                  <p class="text-xs text-muted">
                    {{ review.status === 'reviewed' && review.reviewed_at
                      ? $t('member.reviewReviewedAt', { time: formatReviewTime(review.reviewed_at) })
                      : $t('member.reviewSubmittedAt', { time: formatReviewTime(review.created_at) }) }}
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <AppButton
                    variant="outline"
                    :to="localePath('/chat')"
                    data-testid="health-review-open-chat"
                    @click="focusReviewConversation(review)"
                  >
                    {{ $t('member.reviewOpenChat') }}
                  </AppButton>
                  <AppButton
                    v-if="review.health_report_id"
                    variant="ghost"
                    data-testid="health-review-open-report"
                    @click="openReportFromReview(review.health_report_id)"
                  >
                    {{ $t('member.reviewOpenReport') }}
                  </AppButton>
                  <AppButton
                    v-if="review.status === 'reviewed'"
                    :to="localePath('/app/recommendations')"
                    data-testid="health-review-view-recommend"
                    @click="focusReviewConversation(review)"
                  >
                    {{ $t('chat.viewRecommend') }}
                  </AppButton>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div
          class="space-y-3"
          data-testid="health-reports"
        >
          <h2 class="text-lg font-semibold text-highlighted">
            {{ $t('member.reportsTitle') }}
          </h2>
          <p
            v-if="reportsLoading"
            class="text-sm text-muted"
            data-testid="health-reports-loading"
          >
            {{ $t('member.reportsLoading') }}
          </p>
          <p
            v-else-if="reportsError"
            class="text-sm text-red-600 dark:text-red-400"
            data-testid="health-reports-error"
          >
            {{ reportsError }}
          </p>
          <p
            v-else-if="!reports.length"
            class="text-sm text-muted"
            data-testid="health-reports-empty"
          >
            {{ $t('member.reportsEmpty') }}
          </p>
          <div
            v-else
            class="space-y-3"
          >
            <template
              v-for="report in reports"
              :key="report.id"
            >
              <article
                v-for="variant in reportVariants"
                :key="`${report.id}-${variant}`"
                class="overflow-hidden rounded-2xl border border-default bg-elevated lg:flex lg:max-h-[calc(50dvh+2.75rem)] lg:flex-col"
                :data-testid="variant === 'primary' ? `health-report-${report.id}` : `health-report-cards-${report.id}`"
              >
                <div class="flex shrink-0 items-center gap-3 px-5 py-4">
                  <button
                    type="button"
                    class="min-w-0 flex-1 text-start"
                    :aria-expanded="isReportExpanded(report.id, variant)"
                    data-testid="health-report-toggle"
                    @click="toggleReport(report.id, variant)"
                  >
                    <p class="font-medium text-highlighted">
                      {{ formatReportDate(report.created_at) }}
                      <span class="ms-2 text-xs font-normal text-muted">
                        {{ variant === 'primary' ? $t('member.reportStyleTable') : $t('member.reportStyleCards') }}
                      </span>
                    </p>
                    <p class="mt-0.5 text-sm text-muted">
                      {{ statusLabel(report.status) }}
                      <span
                        v-if="report.error"
                        class="text-red-600 dark:text-red-400"
                      > · {{ report.error }}</span>
                    </p>
                  </button>
                  <ReportViewToggle
                    :mode="viewModeByVariant[variant]"
                    @update:mode="setViewMode(variant, $event)"
                  />
                  <AppButton
                    variant="outline"
                    class="report-expand-btn shrink-0"
                    data-testid="health-report-expand"
                    @click="openReportSheet(report.id, variant)"
                  >
                    {{ $t('member.reportExpand') }}
                  </AppButton>
                  <button
                    type="button"
                    class="inline-flex size-8 shrink-0 items-center justify-center text-muted"
                    :aria-expanded="isReportExpanded(report.id, variant)"
                    :aria-label="isReportExpanded(report.id, variant) ? $t('labChart.collapse') : $t('labChart.expand')"
                    @click="toggleReport(report.id, variant)"
                  >
                    <UIcon
                      :name="isReportExpanded(report.id, variant) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                      class="size-4"
                    />
                  </button>
                </div>
                <div
                  v-if="isReportExpanded(report.id, variant)"
                  class="flex min-h-0 flex-1 flex-col border-t border-default"
                  data-testid="health-report-detail"
                >
                  <p
                    v-if="detailLoadingId === report.id"
                    class="px-5 py-4 text-sm text-muted"
                  >
                    {{ $t('member.reportDetailLoading') }}
                  </p>
                  <p
                    v-else-if="detailErrorById[report.id]"
                    class="px-5 py-4 text-sm text-red-600 dark:text-red-400"
                  >
                    {{ detailErrorById[report.id] }}
                  </p>
                  <p
                    v-else-if="!(resultsById[report.id] ?? []).length"
                    class="px-5 py-4 text-sm text-muted"
                  >
                    {{ $t('labChart.empty') }}
                  </p>
                  <div
                    v-else
                    class="flex min-h-0 flex-1 flex-col"
                  >
                    <div class="shrink-0 px-5 pt-4">
                      <ReportResultLegend />
                    </div>
                    <ReportResultTable
                      v-if="variant === 'primary' && viewModeByVariant[variant] === 'table'"
                      :results="resultsById[report.id] ?? []"
                      :show-legend="false"
                      hide-scrollbar
                      class="min-h-0 flex-1 px-5 py-4"
                    />
                    <ReportResultStrips
                      v-else-if="viewModeByVariant[variant] === 'table'"
                      :results="resultsById[report.id] ?? []"
                      hide-scrollbar
                      class="min-h-0 flex-1 px-5 py-4"
                    />
                    <ReportResultCards
                      v-else
                      :results="resultsById[report.id] ?? []"
                      :position="variant === 'primary' ? 'gauge' : 'rail'"
                      hide-scrollbar
                      class="min-h-0 flex-1 px-5 py-4"
                    />
                  </div>
                </div>
              </article>
            </template>
          </div>
          <UModal
            v-model:open="sheetOpen"
            :title="$t('labChart.dockTitle')"
            :ui="{
              content: '!h-[calc(100dvh-3rem)] !max-h-[calc(100dvh-3rem)] !max-w-6xl sm:!max-h-[calc(100dvh-3rem)] sm:!max-w-6xl',
              header: 'shrink-0',
              body: 'flex min-h-0 flex-1 flex-col overflow-hidden p-0 sm:p-0'
            }"
          >
            <template #actions>
              <ReportViewToggle
                class="absolute end-14 top-4"
                :mode="viewModeByVariant[sheetVariant]"
                @update:mode="setViewMode(sheetVariant, $event)"
              />
            </template>
            <template #body>
              <div
                class="flex min-h-0 flex-1 flex-col"
                data-testid="health-report-sheet"
              >
                <p
                  v-if="sheetLoading"
                  class="px-5 py-4 text-sm text-muted"
                >
                  {{ $t('member.reportDetailLoading') }}
                </p>
                <p
                  v-else-if="sheetError"
                  class="px-5 py-4 text-sm text-red-600 dark:text-red-400"
                >
                  {{ sheetError }}
                </p>
                <p
                  v-else-if="!sheetResults.length"
                  class="px-5 py-4 text-sm text-muted"
                >
                  {{ $t('labChart.empty') }}
                </p>
                <div
                  v-else
                  class="flex min-h-0 flex-1 flex-col"
                >
                  <div class="shrink-0 border-b border-default px-5 py-2.5">
                    <ReportResultLegend />
                  </div>
                  <ReportResultTable
                    v-if="sheetVariant === 'primary' && viewModeByVariant[sheetVariant] === 'table'"
                    :results="sheetResults"
                    :show-legend="false"
                    hide-scrollbar
                    class="min-h-0 flex-1 px-5 py-4"
                  />
                  <ReportResultStrips
                    v-else-if="viewModeByVariant[sheetVariant] === 'table'"
                    :results="sheetResults"
                    hide-scrollbar
                    class="min-h-0 flex-1 px-5 py-4"
                  />
                  <ReportResultCards
                    v-else
                    :results="sheetResults"
                    :position="sheetVariant === 'primary' ? 'gauge' : 'rail'"
                    hide-scrollbar
                    class="min-h-0 flex-1 px-5 py-4"
                  />
                </div>
              </div>
            </template>
          </UModal>
          <WearablesReportReference
            v-if="showWearablesReportReference"
            class="mt-4"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  ExpertCaseReviewListItem,
  HealthReportResult,
  HealthReportSummary,
  UserHealthProfile
} from '~/utils/candor-api'
import {
  expertReviewUiStatusFromList,
  expertReviewUiStatusFromRow
} from '~/utils/expert-review'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const localePath = useLocalePath()
const route = useRoute()
const nuxtApp = useNuxtApp()
const { t, locale } = useI18n()
const auth = useAuthStore()
// SSR paints the guest gate; sync after hydration so members are not stuck behind it.
const previewLocked = ref(nuxtApp.isHydrating || !auth.isMember)

const showWearablesReportReference = computed(() => {
  const raw = route.query.wearables_report
  const value = Array.isArray(raw) ? raw[0] : raw
  return value === '1' || value === 'demo'
})

function syncPreviewLock() {
  previewLocked.value = !auth.isMember
}
const journey = useJourneyStore()
const ordersStore = useOrdersStore()
const candor = useCandorApi()

const profile = ref<UserHealthProfile | null>(null)
const profileError = ref('')
const reviewRecords = ref<ExpertCaseReviewListItem[]>([])
const reviewsLoading = ref(false)
const reviewsError = ref('')
const reports = ref<HealthReportSummary[]>([])
const reportsLoading = ref(false)
const reportsError = ref('')

const headerCta = computed<'view' | 'submit' | 'none'>(() => {
  if (!auth.isMember) {
    return 'none'
  }
  if (journey.expertReviewStatus === 'reviewed') {
    return 'view'
  }
  if (journey.expertReviewStatus === 'awaiting_review') {
    return 'none'
  }
  return 'submit'
})

function formatReviewTime(value: string) {
  const ts = Date.parse(value)
  if (Number.isNaN(ts)) {
    return value
  }
  try {
    return new Intl.DateTimeFormat(locale.value || 'zh-TW', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(ts))
  } catch {
    return value
  }
}

function focusReviewConversation(review: ExpertCaseReviewListItem) {
  journey.conversationId = review.conversation_id
  if (review.health_report_id) {
    journey.reportId = review.health_report_id
  }
  journey.expertReviewStatus = expertReviewUiStatusFromRow(review.status)
}

function openReportFromReview(reportId: string) {
  openReportSheet(reportId, 'primary')
}

async function loadReviews() {
  if (!auth.isMember) {
    reviewRecords.value = []
    reviewsLoading.value = false
    reviewsError.value = ''
    return
  }
  reviewsLoading.value = true
  reviewsError.value = ''
  try {
    const list = await candor.listExpertCaseReviews({ limit: 50 })
    reviewRecords.value = list.expert_case_reviews ?? []
    const nextStatus = expertReviewUiStatusFromList(
      reviewRecords.value,
      journey.conversationId
    )
    if (nextStatus !== null) {
      journey.expertReviewStatus = nextStatus
    }
  } catch {
    reviewsError.value = t('member.reviewRecordsLoadError')
  } finally {
    reviewsLoading.value = false
  }
}
const reportVariants = ['primary', 'secondary'] as const
type ReportVariant = (typeof reportVariants)[number]
type ReportViewMode = 'table' | 'cards'
const viewModeByVariant = ref<Record<ReportVariant, ReportViewMode>>({
  primary: 'table',
  secondary: 'table'
})
const expandedKeys = ref<string[]>([])
const sheetReportId = ref<string | null>(null)
const sheetVariant = ref<ReportVariant>('primary')
const detailLoadingId = ref<string | null>(null)
const resultsById = ref<Record<string, HealthReportResult[]>>({})
const detailErrorById = ref<Record<string, string>>({})

const sheetOpen = computed({
  get: () => sheetReportId.value != null,
  set(open: boolean) {
    if (!open) {
      sheetReportId.value = null
    }
  }
})
const sheetLoading = computed(() =>
  sheetReportId.value != null && detailLoadingId.value === sheetReportId.value
)
const sheetError = computed(() => {
  const id = sheetReportId.value
  return id ? (detailErrorById.value[id] ?? '') : ''
})
const sheetResults = computed(() => {
  const id = sheetReportId.value
  return id ? (resultsById.value[id] ?? []) : []
})

const anonymizeOpen = ref(false)
const anonymizePending = ref(false)
const anonymizeError = ref('')

const profileCards = computed(() => {
  const p = profile.value
  return [
    {
      key: 'sex',
      label: t('member.statSex'),
      value: formatSex(p?.sex)
    },
    {
      key: 'age',
      label: t('member.statAge'),
      value: p?.age_years != null ? t('member.statAgeValue', { age: p.age_years }) : t('member.statEmpty')
    },
    {
      key: 'height',
      label: t('member.statHeight'),
      value: p?.height_cm != null ? t('member.statHeightValue', { cm: p.height_cm }) : t('member.statEmpty')
    },
    {
      key: 'weight',
      label: t('member.statWeight'),
      value: p?.weight_kg != null ? t('member.statWeightValue', { kg: p.weight_kg }) : t('member.statEmpty')
    },
    {
      key: 'diet',
      label: t('member.statDiet'),
      value: formatDiet(p?.diet)
    },
    {
      key: 'goals',
      label: t('member.statGoals'),
      value: formatGoals(p?.goals ?? [])
    }
  ]
})

function formatSex(sex: string | null | undefined) {
  if (sex === 'F') {
    return t('member.sexFemale')
  }
  if (sex === 'M') {
    return t('member.sexMale')
  }
  return t('member.statEmpty')
}

function formatDiet(diet: string | null | undefined) {
  if (!diet) {
    return t('member.statEmpty')
  }
  const key = `member.diet.${diet}`
  const label = t(key)
  return label === key ? diet : label
}

function formatGoals(goals: string[]) {
  if (!goals.length) {
    return t('member.statEmpty')
  }
  return goals.map((code) => {
    const key = `member.goal.${code}`
    const label = t(key)
    return label === key ? code : label
  }).join('、')
}

function statusLabel(status: string) {
  const key = `member.reportStatus.${status}`
  const label = t(key)
  return label === key ? status : label
}

function formatReportDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return new Intl.DateTimeFormat(locale.value === 'en' ? 'en-US' : 'zh-TW', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

async function loadProfile() {
  if (!auth.isMember) {
    profile.value = null
    profileError.value = ''
    return
  }
  profileError.value = ''
  try {
    profile.value = await candor.getProfile()
  } catch {
    profileError.value = t('member.profileLoadError')
  }
}

async function loadReportDetail(reportId: string) {
  if (resultsById.value[reportId]) {
    return
  }
  detailLoadingId.value = reportId
  detailErrorById.value = { ...detailErrorById.value, [reportId]: '' }
  try {
    const detail = await candor.getHealthReport(reportId)
    resultsById.value = {
      ...resultsById.value,
      [reportId]: detail.results ?? []
    }
  } catch {
    detailErrorById.value = {
      ...detailErrorById.value,
      [reportId]: t('member.reportDetailError')
    }
  } finally {
    detailLoadingId.value = null
  }
}

async function loadReports() {
  if (!auth.isMember) {
    reports.value = []
    reportsLoading.value = false
    reportsError.value = ''
    return
  }
  reportsLoading.value = true
  reportsError.value = ''
  try {
    const list = await candor.listHealthReports()
    reports.value = list.reports ?? []
    const latest = reports.value[0]
    if (latest) {
      expandedKeys.value = reportVariants.map(variant => reportVariantKey(latest.id, variant))
      await loadReportDetail(latest.id)
    }
  } catch {
    reportsError.value = t('member.reportsLoadError')
  } finally {
    reportsLoading.value = false
  }
}

function reportVariantKey(reportId: string, variant: ReportVariant) {
  return `${reportId}:${variant}`
}

function isReportExpanded(reportId: string, variant: ReportVariant) {
  return expandedKeys.value.includes(reportVariantKey(reportId, variant))
}

function toggleReport(reportId: string, variant: ReportVariant) {
  const key = reportVariantKey(reportId, variant)
  if (expandedKeys.value.includes(key)) {
    expandedKeys.value = expandedKeys.value.filter(item => item !== key)
    return
  }
  expandedKeys.value = [...expandedKeys.value, key]
  void loadReportDetail(reportId)
}

function setViewMode(variant: ReportVariant, mode: ReportViewMode) {
  viewModeByVariant.value = {
    ...viewModeByVariant.value,
    [variant]: mode
  }
}

function openReportSheet(reportId: string, variant: ReportVariant) {
  sheetReportId.value = reportId
  sheetVariant.value = variant
  void loadReportDetail(reportId)
}

async function onAnonymize() {
  if (anonymizePending.value) {
    return
  }
  anonymizePending.value = true
  anonymizeError.value = ''
  try {
    await candor.anonymizeMe()
    journey.clearSession()
    ordersStore.clear()
    auth.logout()
    await navigateTo(localePath('/'))
  } catch {
    anonymizeError.value = t('member.anonymizeError')
  } finally {
    anonymizePending.value = false
  }
}

function loadHealth() {
  void loadProfile()
  void loadReviews()
  void loadReports()
}

onMounted(() => {
  syncPreviewLock()
  loadHealth()
})

watch(() => auth.isMember, (member) => {
  previewLocked.value = !member
  if (member) {
    loadHealth()
  }
})
</script>

<style scoped>
:deep(.report-expand-btn) {
  height: 2rem;
  min-height: 2rem;
  padding-inline: 0.75rem;
  font-size: 0.8125rem;
}
</style>
