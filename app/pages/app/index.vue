<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('member.title') }}
      </h1>
      <AppButton
        v-if="auth.isMember && headerCta === 'submit'"
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
          <div class="mb-1 flex flex-wrap items-center justify-end gap-2">
            <template v-if="!clearProfileOpen">
              <AppButton
                variant="ghost"
                class="!px-2 !py-1 text-xs"
                data-testid="health-profile-clear"
                :disabled="clearProfilePending"
                @click="clearProfileOpen = true"
              >
                {{ $t('member.profileClear') }}
              </AppButton>
            </template>
            <template v-else>
              <p
                class="me-auto w-full text-xs text-muted sm:w-auto"
                data-testid="health-profile-clear-hint"
              >
                {{ $t('member.profileClearConfirm') }}
              </p>
              <AppButton
                class="!px-2 !py-1 text-xs"
                data-testid="health-profile-clear-confirm"
                :disabled="clearProfilePending"
                @click="onClearProfile"
              >
                {{ $t('member.profileClearConfirmAction') }}
              </AppButton>
              <AppButton
                variant="ghost"
                class="!px-2 !py-1 text-xs"
                data-testid="health-profile-clear-dismiss"
                :disabled="clearProfilePending"
                @click="clearProfileOpen = false"
              >
                {{ $t('member.profileClearDismiss') }}
              </AppButton>
            </template>
          </div>
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
        <p
          v-if="clearProfileError"
          class="text-sm text-red-600 dark:text-red-400"
          data-testid="health-profile-clear-error"
        >
          {{ clearProfileError }}
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
            <article
              v-for="report in reports"
              :key="report.id"
              class="flex flex-col overflow-hidden rounded-2xl border border-default bg-elevated"
              :class="isReportExpanded(report.id)
                ? 'h-[calc(50dvh+2.75rem)] max-h-[calc(50dvh+2.75rem)]'
                : undefined"
              :data-testid="`health-report-${report.id}`"
            >
              <div class="flex shrink-0 items-center gap-3 px-5 py-4">
                <button
                  type="button"
                  class="min-w-0 flex-1 text-start"
                  :aria-expanded="isReportExpanded(report.id)"
                  data-testid="health-report-toggle"
                  @click="toggleReport(report.id)"
                >
                  <p class="font-medium text-highlighted">
                    {{ formatReportDate(report.created_at) }}
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
                  :mode="reportViewMode"
                  @update:mode="setReportViewMode"
                />
                <AppButton
                  variant="outline"
                  class="report-expand-btn shrink-0"
                  data-testid="health-report-expand"
                  @click="openReportSheet(report.id)"
                >
                  {{ $t('member.reportExpand') }}
                </AppButton>
                <button
                  type="button"
                  class="inline-flex size-8 shrink-0 items-center justify-center text-muted"
                  :aria-expanded="isReportExpanded(report.id)"
                  :aria-label="isReportExpanded(report.id) ? $t('labChart.collapse') : $t('labChart.expand')"
                  @click="toggleReport(report.id)"
                >
                  <UIcon
                    :name="isReportExpanded(report.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                    class="size-4"
                  />
                </button>
              </div>
              <div
                v-if="isReportExpanded(report.id)"
                class="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-default"
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
                  class="flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                  <div class="shrink-0 px-5 pt-4">
                    <ReportResultLegend />
                  </div>
                  <div class="min-h-0 flex-1 overflow-hidden px-5 py-4">
                    <ReportResultCards
                      v-if="reportViewMode === 'cards'"
                      :results="resultsById[report.id] ?? []"
                      position="rail"
                      class="h-full min-h-0"
                    />
                    <ReportResultStrips
                      v-else
                      :results="resultsById[report.id] ?? []"
                      class="h-full min-h-0"
                    />
                  </div>
                </div>
              </div>
            </article>
          </div>
          <div
            v-if="showReportsPager"
            class="flex flex-wrap items-center justify-between gap-3 pt-1"
            data-testid="health-reports-pager"
          >
            <AppButton
              variant="outline"
              :disabled="!canReportsPrev || reportsLoading"
              data-testid="health-reports-prev"
              @click="goReportsPrev"
            >
              {{ $t('member.reportsPrevPage') }}
            </AppButton>
            <p
              class="text-sm text-muted"
              data-testid="health-reports-page-status"
            >
              {{ $t('member.reportsPageStatus', { page: reportsPage }) }}
            </p>
            <AppButton
              variant="outline"
              :disabled="!canReportsNext || reportsLoading"
              data-testid="health-reports-next"
              @click="goReportsNext"
            >
              {{ $t('member.reportsNextPage') }}
            </AppButton>
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
                :mode="reportViewMode"
                @update:mode="setReportViewMode"
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
                  class="flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                  <div class="shrink-0 border-b border-default px-5 py-2.5">
                    <ReportResultLegend />
                  </div>
                  <div class="min-h-0 flex-1 overflow-hidden px-5 py-4">
                    <ReportResultCards
                      v-if="reportViewMode === 'cards'"
                      :results="sheetResults"
                      position="rail"
                      class="h-full min-h-0"
                    />
                    <ReportResultStrips
                      v-else
                      :results="sheetResults"
                      class="h-full min-h-0"
                    />
                  </div>
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
  HealthReportResult,
  HealthReportSummary,
  UserHealthProfile
} from '~/utils/candor-api'
import { formatLocalDateTime } from '~/utils/format-local-datetime'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const REPORTS_PAGE_SIZE = 5

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
const reports = ref<HealthReportSummary[]>([])
const reportsTotal = ref(0)
const reportsOffset = ref(0)
const reportsLoading = ref(false)
const reportsError = ref('')

const reportsPage = computed(() => Math.floor(reportsOffset.value / REPORTS_PAGE_SIZE) + 1)
const showReportsPager = computed(() => reportsTotal.value > REPORTS_PAGE_SIZE)
const canReportsPrev = computed(() => reportsOffset.value > 0)
const canReportsNext = computed(
  () => reportsOffset.value + REPORTS_PAGE_SIZE < reportsTotal.value
)

/** Header only keeps「提交專家判讀」; reviewed → expert-cases via order detail, not a page header CTA. */
const headerCta = computed<'submit' | 'none'>(() => {
  if (!auth.isMember) {
    return 'none'
  }
  if (
    journey.expertReviewStatus === 'reviewed'
    || journey.expertReviewStatus === 'awaiting_review'
  ) {
    return 'none'
  }
  return 'submit'
})

type ReportViewMode = 'table' | 'cards'
/** Default to former「樣式2」card grid with rail markers. */
const reportViewMode = ref<ReportViewMode>('cards')
const expandedKeys = ref<string[]>([])
const sheetReportId = ref<string | null>(null)
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

const clearProfileOpen = ref(false)
const clearProfilePending = ref(false)
const clearProfileError = ref('')

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
  return formatLocalDateTime(iso, {
    style: 'intl-short',
    locale: locale.value === 'en' ? 'en-US' : 'zh-TW',
    empty: iso
  })
}

async function loadProfile() {
  if (!auth.isMember) {
    profile.value = null
    profileError.value = ''
    clearProfileError.value = ''
    clearProfileOpen.value = false
    return
  }
  profileError.value = ''
  try {
    profile.value = await candor.getProfile()
  } catch {
    profileError.value = t('member.profileLoadError')
  }
}

async function onClearProfile() {
  if (clearProfilePending.value) {
    return
  }
  clearProfilePending.value = true
  clearProfileError.value = ''
  try {
    profile.value = await candor.clearProfile()
    clearProfileOpen.value = false
  } catch {
    clearProfileError.value = t('member.profileClearError')
  } finally {
    clearProfilePending.value = false
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
    reportsTotal.value = 0
    reportsOffset.value = 0
    reportsLoading.value = false
    reportsError.value = ''
    return
  }
  reportsLoading.value = true
  reportsError.value = ''
  try {
    const list = await candor.listHealthReports({
      limit: REPORTS_PAGE_SIZE,
      offset: reportsOffset.value
    })
    reports.value = list.reports ?? []
    reportsTotal.value = typeof list.total === 'number' ? list.total : reports.value.length
    const latest = reports.value[0]
    if (latest && reportsOffset.value === 0) {
      expandedKeys.value = [latest.id]
      await loadReportDetail(latest.id)
    } else {
      expandedKeys.value = []
    }
  } catch {
    reportsError.value = t('member.reportsLoadError')
  } finally {
    reportsLoading.value = false
  }
}

function goReportsPrev() {
  if (!canReportsPrev.value || reportsLoading.value) {
    return
  }
  reportsOffset.value = Math.max(0, reportsOffset.value - REPORTS_PAGE_SIZE)
  void loadReports()
}

function goReportsNext() {
  if (!canReportsNext.value || reportsLoading.value) {
    return
  }
  reportsOffset.value += REPORTS_PAGE_SIZE
  void loadReports()
}

function isReportExpanded(reportId: string) {
  return expandedKeys.value.includes(reportId)
}

function toggleReport(reportId: string) {
  if (expandedKeys.value.includes(reportId)) {
    expandedKeys.value = expandedKeys.value.filter(item => item !== reportId)
    return
  }
  expandedKeys.value = [...expandedKeys.value, reportId]
  void loadReportDetail(reportId)
}

function setReportViewMode(mode: ReportViewMode) {
  reportViewMode.value = mode
}

function openReportSheet(reportId: string) {
  sheetReportId.value = reportId
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
  reportsOffset.value = 0
  void loadProfile()
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
