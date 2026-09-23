<template>
  <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-default">
    <header class="flex shrink-0 flex-wrap items-center gap-3 border-b border-default bg-elevated px-4 py-4 sm:px-6">
      <div class="min-w-0 flex-1">
        <h1 class="text-lg font-semibold text-highlighted">
          {{ $t(readonly ? 'chat.viewOnlyTitle' : 'chat.title') }}
        </h1>
        <p
          v-if="escalated && !readonly"
          class="mt-1 text-sm text-muted"
        >
          {{ $t('chat.escalatedBody') }}
        </p>
        <p
          v-else-if="readonly"
          class="mt-1 text-sm text-muted"
          data-testid="chat-readonly"
        >
          {{ $t('chat.viewOnlyBody') }}
        </p>
      </div>
      <AppButton
        v-if="!escalated && !readonly"
        variant="outline"
        data-testid="chat-escalate"
        @click="escalate"
      >
        {{ $t('chat.escalate') }}
      </AppButton>
    </header>

    <div
      v-if="escalated && !readonly"
      class="shrink-0 border-b border-default bg-muted px-4 py-3 sm:px-6"
      data-testid="chat-escalated"
    >
      <p class="text-sm font-medium text-highlighted">
        {{ $t('chat.escalatedTitle') }}
      </p>
      <p class="mt-1 text-sm text-muted">
        {{ $t('chat.escalatedLocked') }}
      </p>
    </div>

    <div
      v-if="selectedPackage && !readonly"
      class="shrink-0 border-b border-default bg-primary/5 px-4 py-3 sm:px-6"
      data-testid="chat-selected-plan"
    >
      <div class="flex flex-wrap items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-highlighted">
            {{ selectedPackage.name_zh }}
            <span class="text-muted">／ {{ selectedPackage.price }} 元／月</span>
          </p>
          <p class="mt-0.5 text-xs text-muted">
            {{ packageConfirmed ? $t('chat.packageConfirmed') : $t('chat.packagePending') }}
          </p>
        </div>
        <AppButton
          v-if="!packageConfirmed"
          size="sm"
          data-testid="chat-confirm-package"
          :disabled="pending"
          @click="confirmPackage"
        >
          {{ $t('chat.confirmPackage') }}
        </AppButton>
      </div>
    </div>

    <div class="relative min-h-0 flex-1">
      <ReportDataDock
        v-model:open="reportDockOpen"
        v-model:collapsed="reportDockCollapsed"
        :results="reportResults"
      />
      <div
        ref="transcriptEl"
        data-testid="chat-transcript"
        class="absolute inset-0 space-y-2 overflow-y-auto px-4 py-4 sm:px-6"
      >
      <article
        v-for="message in messages"
        :key="message.id"
        class="flex items-start gap-2"
        :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <span
          v-if="message.role === 'assistant'"
          class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-elevated text-primary"
        >
          <UIcon
            name="i-lucide-bot"
            class="size-4"
          />
        </span>
        <div
          class="max-w-[min(40rem,85%)] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
          :class="[
            message.role === 'user' ? 'bg-elevated text-highlighted' : 'bg-muted text-default',
            message.id === reportDockMessageId ? 'ring-1 ring-primary/40' : ''
          ]"
          :data-testid="message.id === lastAssistantId ? 'chat-last-reply' : undefined"
        >
          <p class="whitespace-pre-line">
            {{ messageText(message) }}
          </p>
          <p
            v-if="fileName(message)"
            class="mt-2 inline-flex items-center gap-1 rounded-lg bg-default px-2 py-1 text-xs text-muted"
          >
            <UIcon
              name="i-lucide-paperclip"
              class="size-3.5"
            />
            {{ fileName(message) }}
          </p>
          <AppButton
            v-if="showReportDataCta(message)"
            class="mt-3"
            variant="outline"
            data-testid="chat-view-report-data"
            @click="openReportDock"
          >
            {{ $t('chat.viewReportData') }}
          </AppButton>
          <AppButton
            v-if="showRecommendCta(message)"
            class="mt-3"
            data-testid="chat-view-recommend"
            @click="goRecommend"
          >
            {{ $t('chat.viewRecommend') }}
          </AppButton>
          <AppButton
            v-if="showRetryCta(message)"
            class="mt-3"
            variant="outline"
            data-testid="chat-report-retry"
            @click="retryReport"
          >
            {{ $t('chat.reportRetry') }}
          </AppButton>
        </div>
      </article>
      <p
        v-if="pending"
        class="text-sm text-muted"
      >
        {{ $t('chat.thinking') }}
      </p>
      </div>
    </div>

    <div
      v-if="!readonly"
      class="shrink-0 border-t border-default bg-elevated px-4 py-4 sm:px-6"
    >
      <div
        v-if="chipOptions.length || showUploadChip"
        class="mb-3 flex flex-wrap gap-2"
        data-testid="chat-quiz-options"
      >
        <button
          v-for="option in chipOptions"
          :key="option.code"
          type="button"
          class="app-chip"
          :class="{ 'ring-2 ring-primary': isOptionSelected(option.code) }"
          :data-testid="`chat-quiz-option-${option.code}`"
          :disabled="pending"
          @click="onOptionChip(option)"
        >
          {{ option.label }}
        </button>
        <button
          v-if="needsMultiConfirm"
          type="button"
          class="app-chip"
          data-testid="chat-quiz-confirm"
          :disabled="pending || selectedCodes.length === 0"
          @click="confirmMultiSelection"
        >
          {{ $t('chat.confirmSelection') }}
        </button>
        <button
          v-if="showUploadChip"
          type="button"
          class="app-chip"
          data-testid="chat-chip-upload"
          :disabled="!canUpload"
          @click="pickFile"
        >
          <UIcon
            name="i-lucide-paperclip"
            class="size-3.5"
          />
          {{ $t('chat.chips.upload') }}
        </button>
      </div>
      <form
        v-if="!escalated"
        class="flex items-end gap-2 rounded-xl border border-default bg-default p-2"
        @submit.prevent="onSubmit"
      >
        <input
          ref="fileInput"
          type="file"
          accept="image/*,.pdf"
          class="hidden"
          data-testid="chat-upload-input"
          @change="onFile"
        >
        <button
          type="button"
          class="app-btn app-btn-ghost size-10 shrink-0 px-0"
          :disabled="!canUpload"
          data-testid="chat-upload"
          :aria-label="$t('chat.upload')"
          @click="pickFile"
        >
          <UIcon
            name="i-lucide-paperclip"
            class="size-4"
          />
        </button>
        <textarea
          v-model="input"
          rows="1"
          class="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-highlighted outline-none placeholder:text-muted"
          :placeholder="$t('chat.placeholder')"
          :disabled="!canType"
          data-testid="chat-input"
          @keydown.enter.exact.prevent="onSubmit"
        />
        <AppButton
          type="submit"
          :disabled="!canType"
          data-testid="chat-send"
        >
          {{ $t('chat.send') }}
        </AppButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  GreetingOption,
  HealthReport,
  HealthReportResult
} from '~/utils/candor-api'
import { CandorApiError } from '~/utils/candor-api'
import { isPlanId, type PlanId } from '~/utils/plans'
import { isSupplementPlanId, type ChatMessage, type SupplementPlanId } from '~/utils/first-order'
import { storeToRefs } from 'pinia'

const POLL_INTERVAL_MS = 2000
const LAB_GAP_CODES = new Set(['checkup', 'blood_test'])
const UPLOADABLE_LAB_CODES = new Set(['1_to_3y', 'within_1y', 'within_6m'])

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()
const journey = useJourneyStore()
const {
  quizActive,
  goalSelectActive,
  activeQuestion,
  goalOptions,
  selectedCodes,
  selectedPackage,
  packageConfirmed,
  postQuizGuided
} = storeToRefs(journey)
const ordersApi = useFirstOrderApi()
const candor = useCandorApi()

const input = ref('')
const pending = ref(false)
const reportInFlight = ref(false)
const escalated = ref(false)
const pendingUserContent = ref<string | null>(null)
const reportRetryId = ref<string | null>(null)
const retryMessageId = ref<string | null>(null)
const reportResults = ref<HealthReportResult[]>([])
const reportDockOpen = ref(false)
const reportDockCollapsed = ref(false)
const reportDockMessageId = ref<string | null>(null)
const transcriptEl = useTemplateRef<HTMLElement>('transcriptEl')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const viewMessages = ref<ChatMessage[]>([])
let pollGeneration = 0

function queryValue(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : ''
}

function queryPlan(value: unknown): PlanId | undefined {
  const raw = queryValue(value)
  return isPlanId(raw) ? raw : undefined
}

function queryShopPlan(value: unknown): SupplementPlanId | undefined {
  const raw = queryValue(value)
  return isSupplementPlanId(raw) ? raw : undefined
}

function queryPackageCode(value: unknown): string | undefined {
  const raw = queryValue(value).trim()
  return raw !== '' ? raw : undefined
}

function queryOrderId(value: unknown) {
  return queryValue(value)
}

const orderId = computed(() => queryOrderId(route.query.orderId))
const readonly = computed(() => Boolean(orderId.value))
const canUpload = computed(() => !readonly.value && !escalated.value && !reportInFlight.value)
const canType = computed(() => {
  if (readonly.value || escalated.value || pending.value) {
    return false
  }
  return true
})

const selectedPlan = computed<PlanId | SupplementPlanId | undefined>(() => {
  return queryShopPlan(route.query.plan) ?? queryPlan(route.query.plan)
})

const selectedPackageCodeFromQuery = computed(() => queryPackageCode(route.query.package))

const messages = computed(() => readonly.value ? viewMessages.value : journey.messages)

const chipOptions = computed((): GreetingOption[] => {
  if (goalSelectActive.value) {
    return goalOptions.value
  }
  if (quizActive.value && activeQuestion.value) {
    const type = activeQuestion.value.answer_type
    if (type === 'enum' || type === 'multi_enum') {
      return activeQuestion.value.options ?? []
    }
  }
  return []
})

const isLabRecencyQuestion = computed(() => {
  return quizActive.value
    && activeQuestion.value !== null
    && LAB_GAP_CODES.has(activeQuestion.value.gap_code)
})

const needsMultiConfirm = computed(() => {
  if (goalSelectActive.value) {
    return true
  }
  if (isLabRecencyQuestion.value) {
    return true
  }
  return quizActive.value && activeQuestion.value?.answer_type === 'multi_enum'
})

const showUploadChip = computed(() => {
  if (!isLabRecencyQuestion.value) {
    return false
  }
  const selected = selectedCodes.value[0]
  return selected !== undefined && UPLOADABLE_LAB_CODES.has(selected)
})

function isOptionSelected(code: string) {
  return selectedCodes.value.includes(code)
}

function applyShopPlanFromQuery() {
  const packageCode = queryPackageCode(route.query.package)
  if (packageCode) {
    journey.selectedPackageCode = packageCode
  }
  const shopPlan = queryShopPlan(route.query.plan)
  if (shopPlan) {
    journey.selectedPlanId = shopPlan
  }
}

function makeMessage(role: ChatMessage['role'], text: string, id?: string, file?: string): ChatMessage {
  const parts: ChatMessage['parts'] = [{ type: 'text', text }]
  if (file) {
    parts.push({ type: 'file', name: file })
  }

  return {
    id: id ?? crypto.randomUUID(),
    role,
    parts
  }
}

function setMessageText(id: string, text: string) {
  const message = journey.messages.find(item => item.id === id)
  if (!message) {
    return
  }
  const file = message.parts.find(part => part.type === 'file')
  message.parts = [{ type: 'text', text }]
  if (file) {
    message.parts.push(file)
  }
}

function appendMessage(role: ChatMessage['role'], text: string, file?: string) {
  journey.messages.push(makeMessage(role, text, undefined, file))
}

const lastAssistantId = computed(() => {
  const last = [...messages.value].reverse().find(message => message.role === 'assistant')
  return last?.id
})

function showRecommendCta(message: ChatMessage) {
  return !readonly.value
    && !escalated.value
    && !quizActive.value
    && journey.hasAnalysis
    && message.role === 'assistant'
    && message.id === lastAssistantId.value
    && !reportRetryId.value
}

function showReportDataCta(message: ChatMessage) {
  return !readonly.value
    && !escalated.value
    && reportResults.value.length > 0
    && message.id === reportDockMessageId.value
}

function showRetryCta(message: ChatMessage) {
  return !readonly.value
    && Boolean(reportRetryId.value)
    && message.id === retryMessageId.value
}

function messageText(message: ChatMessage) {
  return message.parts.filter(part => part.type === 'text').map(part => part.text).join('\n')
}

function fileName(message: ChatMessage) {
  return message.parts.find(part => part.type === 'file')?.name
}

function scrollToLatest(behavior: ScrollBehavior = 'smooth') {
  const scroller = transcriptEl.value
  if (!scroller) {
    return
  }

  scroller.scrollTo({ top: scroller.scrollHeight, behavior })
}

watch(
  () => [messages.value.length, pending.value, lastAssistantId.value, journey.hasAnalysis, quizActive.value],
  async () => {
    await nextTick()
    requestAnimationFrame(() => {
      scrollToLatest()
    })
  },
  { flush: 'post' }
)

async function ensureConversation() {
  if (journey.conversationId) {
    return journey.conversationId
  }

  await auth.ensureSession()
  applyShopPlanFromQuery()
  const packageCode = selectedPackageCodeFromQuery.value
    ?? journey.selectedPackageCode
    ?? undefined
  const created = await candor.createConversation(
    packageCode ? { package_code: packageCode } : {}
  )
  journey.conversationId = created.id
  if (created.package) {
    selectedPackage.value = created.package
    packageConfirmed.value = created.package.confirmed
  }
  postQuizGuided.value = false
  reportResults.value = []
  reportDockOpen.value = false
  reportDockCollapsed.value = false
  reportDockMessageId.value = null
  if (journey.messages.length === 0) {
    journey.messages.push(makeMessage(
      'assistant',
      created.greeting.content,
      created.greeting.message_id || 'greet'
    ))
  }
  goalOptions.value = created.greeting.options ?? []
  selectedCodes.value = [...(created.greeting.selected ?? [])]
  goalSelectActive.value = true
  quizActive.value = false
  activeQuestion.value = null

  return created.id
}

async function confirmPackage() {
  if (!journey.conversationId || !selectedPackage.value || packageConfirmed.value || pending.value) {
    return
  }
  pending.value = true
  try {
    const result = await candor.confirmConversationPackage(journey.conversationId)
    selectedPackage.value = result.package
    packageConfirmed.value = result.package.confirmed
    appendMessage('assistant', t('chat.guideAfterPackageConfirm'))
  } catch {
    appendMessage('assistant', t('chat.streamError'))
  } finally {
    pending.value = false
  }
}

function guideAfterQuiz() {
  if (postQuizGuided.value) {
    return
  }
  postQuizGuided.value = true
  if (journey.hasAnalysis) {
    appendMessage('assistant', t('chat.guideRecommendAfterQuiz'))
    return
  }
  appendMessage('assistant', t('chat.guideUploadAfterQuiz'))
}

async function streamPending() {
  const content = pendingUserContent.value
  pendingUserContent.value = null
  quizActive.value = false
  activeQuestion.value = null
  goalSelectActive.value = false

  if (!content) {
    guideAfterQuiz()
    pending.value = false
    return
  }

  pending.value = true
  const assistantId = crypto.randomUUID()
  let streamed = ''

  try {
    const conversationId = await ensureConversation()
    journey.messages.push(makeMessage('assistant', '', assistantId))

    const result = await candor.streamMessage(conversationId, content, {
      onDelta: (chunk) => {
        streamed += chunk
        setMessageText(assistantId, streamed)
      },
      onReplace: (text) => {
        streamed = text
        setMessageText(assistantId, streamed)
      }
    })

    setMessageText(assistantId, result.content || streamed)
    if (journey.hasAnalysis && reportResults.value.length > 0) {
      reportDockMessageId.value = assistantId
      openReportDock()
    }
    guideAfterQuiz()
  } catch {
    const existing = journey.messages.find(item => item.id === assistantId)
    if (existing) {
      setMessageText(assistantId, t('chat.streamError'))
    } else {
      appendMessage('assistant', t('chat.streamError'))
    }
  } finally {
    pending.value = false
  }
}

async function finishQuestionnaire() {
  if (journey.reportId && !journey.hasAnalysis) {
    try {
      const report = await candor.getHealthReport(journey.reportId)
      rememberReport(report)
      if (report.status === 'ready' || report.status === 'needs_review') {
        await bindAndInterpret(report.id)
        return
      }
    } catch {
      // fall through
    }
  }
  await streamPending()
}

async function runProfileThenStream() {
  pending.value = true
  try {
    const next = await candor.nextProfileQuestion(journey.reportId)
    if (next.done) {
      await finishQuestionnaire()
      return
    }

    appendMessage('assistant', next.prompt)
    activeQuestion.value = next
    quizActive.value = true
    goalSelectActive.value = false
    selectedCodes.value = []
    pending.value = false
  } catch {
    appendMessage('assistant', t('chat.streamError'))
    pendingUserContent.value = null
    quizActive.value = false
    activeQuestion.value = null
    pending.value = false
  }
}

async function sendText(text: string) {
  const content = text.trim()
  if (!content || pending.value || readonly.value || escalated.value) {
    return
  }

  appendMessage('user', content)
  pendingUserContent.value = content
  await runProfileThenStream()
}

function onOptionChip(option: GreetingOption) {
  if (pending.value) {
    return
  }

  if (goalSelectActive.value || activeQuestion.value?.answer_type === 'multi_enum') {
    const noneCodes = ['none', 'none_of_above']
    if (noneCodes.includes(option.code)) {
      selectedCodes.value = [option.code]
      return
    }
    const withoutNone = selectedCodes.value.filter(code => !noneCodes.includes(code))
    selectedCodes.value = withoutNone.includes(option.code)
      ? withoutNone.filter(code => code !== option.code)
      : [...withoutNone, option.code]
    return
  }

  if (isLabRecencyQuestion.value) {
    const wasUploadable = selectedCodes.value.some(code => UPLOADABLE_LAB_CODES.has(code))
    selectedCodes.value = [option.code]
    if (!wasUploadable && UPLOADABLE_LAB_CODES.has(option.code)) {
      appendMessage('assistant', t('chat.guideUploadOnLabs'))
    }
    return
  }

  if (quizActive.value && activeQuestion.value) {
    const label = option.label
    return submitQuizAnswer({ value: option.code, display: label })
  }
}

async function confirmMultiSelection() {
  if (selectedCodes.value.length === 0 || pending.value) {
    return
  }

  if (goalSelectActive.value) {
    const labels = goalOptions.value
      .filter(o => selectedCodes.value.includes(o.code))
      .map(o => o.label)
    appendMessage('user', labels.join('、'))
    pending.value = true
    try {
      const conversationId = await ensureConversation()
      const result = await candor.setConversationGoals(conversationId, {
        goals: selectedCodes.value
      })
      if (!result.saved) {
        appendMessage('assistant', result.prompt || t('chat.streamError'))
        if (result.options) {
          goalOptions.value = result.options
        }
        pending.value = false
        return
      }
      goalSelectActive.value = false
      selectedCodes.value = []
      await runProfileThenStream()
    } catch {
      appendMessage('assistant', t('chat.streamError'))
      pending.value = false
    }
    return
  }

  if (quizActive.value && activeQuestion.value) {
    if (isLabRecencyQuestion.value) {
      const code = selectedCodes.value[0]
      if (!code) {
        return
      }
      const label = (activeQuestion.value.options ?? []).find(o => o.code === code)?.label ?? code
      return submitQuizAnswer({ value: code, display: label })
    }

    const labels = (activeQuestion.value.options ?? [])
      .filter(o => selectedCodes.value.includes(o.code))
      .map(o => o.label)
    return submitQuizAnswer({
      value: selectedCodes.value,
      display: labels.join('、')
    })
  }
}

async function submitQuizAnswer(payload: {
  value?: string | number | boolean | string[] | null
  raw_text?: string | null
  display: string
}) {
  const question = activeQuestion.value
  if (!question || !quizActive.value) {
    return
  }

  appendMessage('user', payload.display)
  pending.value = true

  try {
    const result = await candor.submitProfileAnswer({
      gap_code: question.gap_code,
      value: payload.value,
      raw_text: payload.raw_text
    })

    if (!result.saved) {
      appendMessage('assistant', result.prompt)
      if (result.options) {
        activeQuestion.value = { ...question, options: result.options }
      }
      pending.value = false
      return
    }

    selectedCodes.value = []
    const next = await candor.nextProfileQuestion(journey.reportId)
    if (next.done) {
      await finishQuestionnaire()
      return
    }

    appendMessage('assistant', next.prompt)
    activeQuestion.value = next
    pending.value = false
  } catch {
    appendMessage('assistant', t('chat.streamError'))
    pending.value = false
  }
}

function pickFile() {
  if (!canUpload.value) {
    return
  }

  fileInput.value?.click()
}

function openReportDock() {
  reportDockCollapsed.value = false
  reportDockOpen.value = true
}

function rememberReport(report: HealthReport) {
  if (Array.isArray(report.results) && report.results.length > 0) {
    reportResults.value = report.results
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitWhileChatPending() {
  while (pending.value) {
    await sleep(100)
  }
}

async function pollReport(reportId: string) {
  const generation = ++pollGeneration
  let lastStatus: string | null = null
  let statusMessageId: string | null = null

  while (generation === pollGeneration) {
    let report: HealthReport
    try {
      report = await candor.getHealthReport(reportId)
    } catch {
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    if (generation !== pollGeneration) {
      return null
    }

    rememberReport(report)

    if (report.status !== lastStatus) {
      lastStatus = report.status
      const text = t('chat.reportStatus', { status: report.status })
      if (statusMessageId) {
        setMessageText(statusMessageId, text)
      } else {
        statusMessageId = crypto.randomUUID()
        journey.messages.push(makeMessage('assistant', text, statusMessageId))
      }
    }

    if (report.status === 'ready' || report.status === 'needs_review' || report.status === 'failed') {
      return report
    }

    await sleep(POLL_INTERVAL_MS)
  }

  return null
}

async function bindAndInterpret(reportId: string) {
  const conversationId = await ensureConversation()
  try {
    await candor.attachReport(conversationId, reportId)
  } catch (error) {
    if (error instanceof CandorApiError && error.errorCode === 'report_not_ready') {
      appendMessage('assistant', t('chat.reportStatus', { status: 'processing' }))
      return
    }
    throw error
  }

  if (!reportResults.value.length) {
    try {
      const fresh = await candor.getHealthReport(reportId)
      rememberReport(fresh)
    } catch {
      // table may stay empty until reopen
    }
  }

  journey.reportId = reportId
  journey.hasAnalysis = true
  reportRetryId.value = null
  retryMessageId.value = null
  appendMessage('assistant', t('chat.reportReady'))
  openReportDock()

  const interpret = t('chat.askInterpret')
  appendMessage('user', interpret)
  pendingUserContent.value = interpret
  await runProfileThenStream()
}

async function handleReportTerminal(report: HealthReport) {
  if (report.status === 'ready' || report.status === 'needs_review') {
    await waitWhileChatPending()
    await bindAndInterpret(report.id)
    return
  }

  if (report.status === 'failed') {
    const msg = t('chat.reportFailed')
    const id = crypto.randomUUID()
    journey.messages.push(makeMessage('assistant', msg, id))
    reportRetryId.value = report.id
    retryMessageId.value = id
  }
}

async function onFile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file || !canUpload.value) {
    return
  }

  appendMessage('user', t('chat.uploaded', { name: file.name }))
  reportInFlight.value = true
  reportRetryId.value = null
  retryMessageId.value = null

  try {
    await ensureConversation()
    const uploaded = await candor.uploadHealthReport(file)
    journey.reportId = uploaded.id

    const report = await pollReport(uploaded.id)
    if (!report) {
      return
    }

    await handleReportTerminal(report)
  } catch {
    appendMessage('assistant', t('chat.streamError'))
  } finally {
    reportInFlight.value = false
  }
}

async function retryReport() {
  const id = reportRetryId.value
  if (!id || reportInFlight.value) {
    return
  }

  reportInFlight.value = true
  reportRetryId.value = null
  retryMessageId.value = null

  try {
    await candor.retryHealthReport(id)
    const report = await pollReport(id)
    if (!report) {
      return
    }
    await handleReportTerminal(report)
  } catch {
    appendMessage('assistant', t('chat.streamError'))
  } finally {
    reportInFlight.value = false
  }
}

async function onSubmit() {
  const content = input.value.trim()
  input.value = ''
  if (!content || pending.value) {
    return
  }

  if (goalSelectActive.value) {
    appendMessage('user', content)
    pending.value = true
    try {
      const conversationId = await ensureConversation()
      const result = await candor.setConversationGoals(conversationId, { raw_text: content })
      if (result.saved) {
        goalSelectActive.value = false
        selectedCodes.value = []
        await runProfileThenStream()
        return
      }
      appendMessage('assistant', result.prompt || t('chat.streamError'))
      if (result.options) {
        goalOptions.value = result.options
      }
    } catch {
      appendMessage('assistant', t('chat.streamError'))
    } finally {
      pending.value = false
    }
    return
  }

  if (quizActive.value && activeQuestion.value) {
    const type = activeQuestion.value.answer_type
    const n = Number(content)
    return submitQuizAnswer({
      value: type === 'int' && Number.isFinite(n) ? n : undefined,
      raw_text: content,
      display: content
    })
  }

  return sendText(content)
}

function escalate() {
  if (readonly.value) {
    return
  }

  if (!auth.hasSession) {
    const chatPath = selectedPackageCodeFromQuery.value
      ? `${localePath('/chat')}?package=${encodeURIComponent(selectedPackageCodeFromQuery.value)}&handoff=1`
      : selectedPlan.value
        ? `${localePath('/chat')}?plan=${selectedPlan.value}&handoff=1`
        : `${localePath('/chat')}?handoff=1`

    return navigateTo({
      path: localePath('/login'),
      query: { redirect: chatPath }
    })
  }

  escalated.value = true
}

function goRecommend() {
  if (readonly.value || escalated.value) {
    return
  }

  const path = localePath('/app/recommend')
  if (!auth.hasSession) {
    return navigateTo({
      path: localePath('/login'),
      query: { redirect: path }
    })
  }

  return navigateTo(path)
}

async function loadOrderChat(id: string) {
  pending.value = false
  input.value = ''
  quizActive.value = false
  activeQuestion.value = null
  pendingUserContent.value = null
  viewMessages.value = await ordersApi.getOrderChat(id)
  await nextTick()
  scrollToLatest('auto')
}

watch(orderId, async (id) => {
  if (id) {
    await loadOrderChat(id)
    return
  }

  viewMessages.value = []
  try {
    await ensureConversation()
  } catch {
    appendMessage('assistant', t('chat.conversationError'))
  }
})

onMounted(async () => {
  if (orderId.value) {
    await loadOrderChat(orderId.value)
    return
  }

  journey.hydrate()

  if (route.query.handoff === '1' && auth.hasSession) {
    escalated.value = true
  }

  try {
    await ensureConversation()
  } catch {
    if (journey.messages.length === 0) {
      appendMessage('assistant', t('chat.conversationError'))
    }
  }
  scrollToLatest('auto')
})

onBeforeUnmount(() => {
  pollGeneration += 1
})
</script>
