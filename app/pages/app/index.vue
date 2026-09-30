<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('member.title') }}
      </h1>
      <AppButton
        v-if="auth.isMember"
        :to="localePath('/app/recommendations')"
        variant="primary"
        class="ms-auto"
      >
        {{ $t('chat.viewRecommend') }}
      </AppButton>
    </div>

    <div
      class="relative"
      data-testid="health-body"
    >
      <div
        v-if="!auth.isMember"
        class="absolute inset-0 z-10 flex min-h-72 flex-col items-center justify-center gap-3 rounded-2xl bg-elevated/85 px-6 py-12 text-center backdrop-blur-sm"
        data-testid="health-auth-gate"
      >
        <span class="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
          <UIcon
            name="i-lucide-heart-pulse"
            class="size-7"
          />
        </span>
        <p class="text-base font-semibold text-highlighted">
          {{ $t('member.guestRequired') }}
        </p>
        <p class="max-w-sm text-sm leading-6 text-muted">
          {{ $t('member.guestRequiredHint') }}
        </p>
        <div class="mt-2 flex w-full max-w-xs flex-col gap-2 sm:flex-row">
          <AppButton
            class="w-full"
            :to="loginRedirect"
            data-testid="health-login"
          >
            {{ $t('member.login') }}
          </AppButton>
          <AppButton
            class="w-full"
            variant="outline"
            :to="registerRedirect"
            data-testid="health-register"
          >
            {{ $t('member.register') }}
          </AppButton>
        </div>
      </div>

      <div
        class="space-y-6"
        :class="!auth.isMember ? 'pointer-events-none select-none opacity-40' : undefined"
        :aria-hidden="!auth.isMember || undefined"
      >
        <section
          class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="health-profile-cards"
        >
          <article
            v-for="card in profileCards"
            :key="card.key"
            class="rounded-2xl border border-default bg-elevated p-5"
            :data-testid="`health-stat-${card.key}`"
          >
            <p class="text-sm text-muted">
              {{ card.label }}
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ card.value }}
            </p>
          </article>
        </section>

        <p
          v-if="profileError"
          class="text-sm text-red-600 dark:text-red-400"
          data-testid="health-profile-error"
        >
          {{ profileError }}
        </p>

        <section
          class="space-y-3"
          data-testid="health-reports"
        >
          <h2 class="font-semibold text-highlighted">
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
              class="overflow-hidden rounded-2xl border border-default bg-elevated"
              :data-testid="`health-report-${report.id}`"
            >
              <button
                type="button"
                class="flex w-full items-center gap-3 px-5 py-4 text-start"
                :aria-expanded="expandedId === report.id"
                data-testid="health-report-toggle"
                @click="toggleReport(report.id)"
              >
                <div class="min-w-0 flex-1">
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
                </div>
                <UIcon
                  :name="expandedId === report.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                  class="size-4 shrink-0 text-muted"
                />
              </button>
              <div
                v-if="expandedId === report.id"
                class="border-t border-default px-5 py-4"
                data-testid="health-report-detail"
              >
                <p
                  v-if="detailLoadingId === report.id"
                  class="text-sm text-muted"
                >
                  {{ $t('member.reportDetailLoading') }}
                </p>
                <p
                  v-else-if="detailErrorById[report.id]"
                  class="text-sm text-red-600 dark:text-red-400"
                >
                  {{ detailErrorById[report.id] }}
                </p>
                <div
                  v-else
                  class="space-y-3"
                >
                  <ReportResultLegend />
                  <div class="max-h-80 overflow-y-auto">
                    <ReportResultTable
                      :results="resultsById[report.id] ?? []"
                      :show-legend="false"
                    />
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

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
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HealthReportResult, HealthReportSummary, UserHealthProfile } from '~/utils/candor-api'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const localePath = useLocalePath()
const route = useRoute()
const { t, locale } = useI18n()
const auth = useAuthStore()
const journey = useJourneyStore()
const ordersStore = useOrdersStore()
const candor = useCandorApi()

const profile = ref<UserHealthProfile | null>(null)
const profileError = ref('')
const reports = ref<HealthReportSummary[]>([])
const reportsLoading = ref(false)
const reportsError = ref('')
const expandedId = ref<string | null>(null)
const detailLoadingId = ref<string | null>(null)
const resultsById = ref<Record<string, HealthReportResult[]>>({})
const detailErrorById = ref<Record<string, string>>({})

const anonymizeOpen = ref(false)
const anonymizePending = ref(false)
const anonymizeError = ref('')

const loginRedirect = computed(() =>
  `${localePath('/login')}?redirect=${encodeURIComponent(route.fullPath)}&mode=login`
)
const registerRedirect = computed(() =>
  `${localePath('/login')}?redirect=${encodeURIComponent(route.fullPath)}&mode=register`
)

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
      expandedId.value = latest.id
      await loadReportDetail(latest.id)
    }
  } catch {
    reportsError.value = t('member.reportsLoadError')
  } finally {
    reportsLoading.value = false
  }
}

function toggleReport(reportId: string) {
  if (expandedId.value === reportId) {
    expandedId.value = null
    return
  }
  expandedId.value = reportId
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
  void loadReports()
}

onMounted(() => {
  loadHealth()
})

watch(() => auth.isMember, (member) => {
  if (member) {
    loadHealth()
  }
})
</script>
