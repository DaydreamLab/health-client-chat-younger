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
      <div
        v-if="!readonly"
        class="flex shrink-0 flex-wrap items-center gap-2"
      >
        <AppButton
          variant="ghost"
          data-testid="chat-reset"
          :disabled="resetting"
          @click="resetConversation"
        >
          {{ $t('chat.reset') }}
        </AppButton>
        <AppButton
          v-if="!escalated"
          variant="outline"
          data-testid="chat-escalate"
          @click="escalate"
        >
          {{ $t('chat.escalate') }}
        </AppButton>
      </div>
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
            <span class="text-muted">（{{ selectedPackage.package_plan_code }}）</span>
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
      <div
        v-if="showReportStatusBanner"
        class="absolute inset-x-3 top-3 z-20 flex flex-col overflow-hidden rounded-2xl border border-default bg-elevated shadow-lg sm:inset-x-4"
        data-testid="chat-report-status-banner"
      >
        <div
          class="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
          :data-testid="reportInFlight ? 'chat-report-loading' : undefined"
        >
          <div class="flex min-w-0 items-center gap-2.5">
            <AssistantMark
              v-if="reportInFlight"
              state="thinking"
            />
            <span
              v-else
              class="flex size-8 shrink-0 items-center justify-center rounded-full bg-error/10 text-error ring-1 ring-error/20"
            >
              <UIcon
                name="i-lucide-triangle-alert"
                class="size-4"
              />
            </span>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-highlighted">
                {{ reportPollFailed ? $t('chat.reportStatusBannerFailedTitle') : $t('chat.reportStatusBannerTitle') }}
              </p>
              <p
                class="truncate text-xs text-muted"
                data-testid="chat-report-status-label"
              >
                {{ $t('chat.reportStatusBannerHint', { status: reportStatusLabel }) }}
              </p>
            </div>
          </div>
          <AppButton
            v-if="reportPollFailed && (reportRetryId || journey.reportId)"
            variant="outline"
            class="report-status-retry"
            data-testid="chat-report-retry"
            :disabled="reportInFlight"
            @click="retryReport"
          >
            {{ $t('chat.reportRetry') }}
          </AppButton>
        </div>
      </div>
      <ReportDataDock
        v-model:open="journey.reportDockOpen"
        v-model:collapsed="journey.reportDockCollapsed"
        :results="reportResults"
        :report-id="journey.reportId"
        :show-interpret="showInterpretButton"
        @updated="onReportResultsUpdated"
        @interpret="askInterpret"
      />
      <div
        ref="transcriptEl"
        data-testid="chat-transcript"
        class="absolute inset-0 space-y-2 overflow-y-auto px-4 py-4 sm:px-6"
      >
        <article
          v-for="message in messages"
          :key="message.id"
          class="flex items-end gap-2"
          :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <ChatAssistantMark
            v-if="message.role === 'assistant'"
            :state="assistantMarkState(message)"
          />
          <div
            class="max-w-[min(40rem,85%)] overflow-hidden rounded-2xl text-sm leading-relaxed"
            :class="[
              message.role === 'user' ? 'bg-elevated text-highlighted' : 'bg-muted text-default',
              message.id === reportDockMessageId ? 'ring-1 ring-primary/40' : ''
            ]"
            :data-testid="message.id === lastAssistantId ? 'chat-last-reply' : undefined"
          >
            <div
              class="px-4 pt-2.5"
              :class="hasTurnActions(message) ? 'pb-3.5' : 'pb-2.5'"
            >
              <ChatMarkdown :text="displayMessageText(message)" />
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
              <TurnActions
                v-if="message.role === 'assistant'"
                :choices="choicesFor(message)"
                :selected-codes="selectedCodes"
                :show-confirm="showConfirmFor(message)"
                :confirm-disabled="confirmDisabled"
                :show-upload="showUploadCta(message)"
                :upload-disabled="!canOfferUpload"
                :show-checkup="showCheckupCta(message)"
                :checkup-url="checkupLinkUrl"
                :show-recommend="showRecommendCta(message)"
                :show-retry="showRetryCta(message)"
                :pending="pending"
                @choice="onChoice"
                @confirm="confirmMultiSelection"
                @upload="pickFile"
                @recommend="goRecommend"
                @retry="retryReport"
              />
            </div>
          </div>
        </article>
        <p
          v-if="pending && !reportInFlight && !liveAssistantId"
          class="flex items-center gap-2 text-sm text-muted"
          data-testid="chat-thinking"
        >
          <AssistantMark state="thinking" />
          <span>{{ $t('chat.thinking') }}</span>
        </p>
      </div>
    </div>

    <div
      v-if="!readonly"
      class="shrink-0 border-t border-default bg-elevated px-4 py-4 sm:px-6"
    >
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
          :disabled="!canOfferUpload"
          data-testid="chat-upload"
          :aria-label="$t('chat.upload')"
          @click="pickFile"
        >
          <UIcon
            name="i-lucide-plus"
            class="size-4"
          />
        </button>
        <textarea
          ref="chatInput"
          v-model="input"
          rows="1"
          class="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-highlighted outline-none placeholder:text-muted"
          :placeholder="composerPlaceholder"
          :disabled="inputLocked"
          :readonly="pending"
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
  HealthReportResult,
  ProfileAnswerType,
  ProfileNext
} from '~/utils/candor-api'
import { CandorApiError } from '~/utils/candor-api'
import type { ChatMessage } from '~/utils/first-order'
import {
  assistantStillAsking,
  goalsClarificationOpen,
  inferClarifyingGoalLabels,
  messageOffersUpload,
  recommendCtaVisible,
  stripFinishedQuizGuide
} from '~/utils/first-order'
import { storeToRefs } from 'pinia'

const POLL_INTERVAL_MS = 2000
const LAB_GAP_CODES = new Set(['lab_report', 'checkup', 'blood_test'])
/** Answers that mean a recent enough report to offer upload (within 1 year). */
const UPLOADABLE_LAB_CODES = new Set(['within_1y', 'within_6m'])
/** Answers that mean no usable report — suggest external checkup instead. */
const STALE_LAB_CODES = new Set(['none', '1_to_3y', 'over_3y'])

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const config = useRuntimeConfig()
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
  postQuizGuided,
  profileGaps
} = storeToRefs(journey)
const ordersApi = useFirstOrderApi()
const candor = useCandorApi()

const input = ref('')
const pending = ref(false)
const liveAssistantId = ref<string | null>(null)
const resetting = ref(false)
const reportInFlight = ref(false)
const reportPollStatus = ref<string | null>(null)
const escalated = ref(false)
const pendingUserContent = ref<string | null>(null)
const pendingIntent = ref<string | null>(null)
/** After lab_report confirm of within_1y / within_6m, mark the next agent reply for upload. */
const offerUploadAfterStream = ref(false)
/** After lab_report confirm of none / over 1y, mark the next agent reply for checkup link. */
const offerCheckupAfterStream = ref(false)
/** True only when the user confirmed a recent-enough lab answer for upload CTA. */
const labUploadEligible = ref(false)
const resolvedCheckupUrl = ref('')
const checkupUrlLoaded = ref(false)
const reportRetryId = ref<string | null>(null)
const reportResults = ref<HealthReportResult[]>([])
const reportDockMessageId = ref<string | null>(null)
const transcriptEl = useTemplateRef<HTMLElement>('transcriptEl')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const chatInput = useTemplateRef<HTMLTextAreaElement>('chatInput')
const viewMessages = ref<ChatMessage[]>([])
let pollGeneration = 0

function focusChatInput() {
  void nextTick(() => {
    const el = chatInput.value
    if (!el || el.disabled) {
      return
    }
    el.focus({ preventScroll: true })
  })
}

function queryValue(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : ''
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
const canOfferUpload = computed(() => !readonly.value && !escalated.value && !reportInFlight.value)
const canUpload = computed(() => canOfferUpload.value && auth.isMember)
const reportPollFailed = computed(() => reportPollStatus.value === 'failed' && !reportInFlight.value)
const showReportStatusBanner = computed(() =>
  !readonly.value && (reportInFlight.value || reportPollFailed.value)
)
const checkupLinkUrl = computed(() => resolvedCheckupUrl.value.trim())
const reportStatusLabel = computed(() => {
  const status = reportPollStatus.value
    ?? (reportInFlight.value ? 'extracting' : '')
  if (!status) {
    return ''
  }
  const key = `member.reportStatus.${status}`
  const label = t(key)
  return label === key ? status : label
})
const showInterpretButton = computed(() =>
  !readonly.value
  && !escalated.value
  && journey.hasAnalysis
)
const composerPlaceholder = computed(() =>
  goalSelectActive.value ? t('chat.placeholderGoals') : t('chat.placeholder')
)
const inputLocked = computed(() => readonly.value || escalated.value)
const canType = computed(() => {
  if (inputLocked.value || pending.value) {
    return false
  }
  return true
})

const selectedPackageCodeFromQuery = computed(() => queryPackageCode(route.query.package))

const messages = computed(() => readonly.value ? viewMessages.value : journey.messages)

function findIntakeMessage(list: ChatMessage[]): ChatMessage | undefined {
  if (goalSelectActive.value) {
    return [...list].reverse().find(message =>
      message.role === 'assistant' && !message.notice && !message.uploadOffer && !message.checkupOffer
    )
  }
  return [...list].reverse().find(message =>
    message.role === 'assistant'
    && !message.notice
    && (Boolean(message.options?.length) || Boolean(message.profileQuestion))
  )
}

const intakeMessage = computed(() => findIntakeMessage(messages.value))

const choiceOptions = computed((): GreetingOption[] => {
  if (goalSelectActive.value) {
    return goalOptions.value
  }
  return intakeMessage.value?.options ?? []
})

const lastAssistantProfile = computed(() => {
  const message = intakeMessage.value
  if (!message || message.turnType !== 'profile' || !message.profileQuestion) {
    return null
  }
  return message.profileQuestion
})

const isLabRecencyQuestion = computed(() => {
  const gap = lastAssistantProfile.value?.gap_code
  return gap !== undefined && LAB_GAP_CODES.has(gap)
})

const needsMultiConfirm = computed(() => {
  if (goalSelectActive.value) {
    return true
  }
  if (isLabRecencyQuestion.value) {
    return true
  }
  return lastAssistantProfile.value?.answer_type === 'multi_enum'
})

const confirmDisabled = computed(() =>
  pending.value
  || selectedCodes.value.length === 0
  || (goalSelectActive.value && selectedCodes.value.length < 2)
)

function choicesFor(message: ChatMessage): GreetingOption[] {
  if (!intakeMessage.value || message.id !== intakeMessage.value.id) {
    return []
  }
  return choiceOptions.value
}

function showConfirmFor(message: ChatMessage) {
  return choicesFor(message).length > 0 && needsMultiConfirm.value
}

function isConsultationGoalOptions(
  options: GreetingOption[] | undefined,
  optionsKind?: string | null
) {
  return optionsKind === 'consultation_goals' && Array.isArray(options) && options.length >= 2
}

/** Free-text / number answers (or open chat) should keep the composer focused. */
const needsTextInput = computed(() => {
  if (readonly.value || escalated.value) {
    return false
  }
  if (goalSelectActive.value) {
    return true
  }
  const profile = lastAssistantProfile.value
  if (profile) {
    const type = profile.answer_type
    if (type === 'int' || type === 'text') {
      return true
    }
    return choiceOptions.value.length === 0
  }
  return true
})

function showUploadCta(message: ChatMessage) {
  if (message.role !== 'assistant' || message.id !== lastAssistantId.value) {
    return false
  }
  if (readonly.value || escalated.value || journey.hasAnalysis) {
    return false
  }
  // lab_report 問卷題本身不掛上傳；選「一年內／半年內」後才用 uploadOffer 訊息開鈕。
  if (
    message.turnType === 'profile'
    && message.profileQuestion
    && LAB_GAP_CODES.has(message.profileQuestion.gap_code)
  ) {
    return false
  }
  if (message.uploadOffer) {
    return true
  }
  return messageOffersUpload(displayMessageText(message))
}

function showCheckupCta(message: ChatMessage) {
  if (message.role !== 'assistant' || !message.checkupOffer) {
    return false
  }
  if (readonly.value || escalated.value) {
    return false
  }
  return checkupLinkUrl.value !== ''
}

async function loadCheckupLinkUrl() {
  if (checkupUrlLoaded.value) {
    return
  }
  const fallback = String(config.public.individualTestsUrl || '').trim()
  try {
    const remote = await candor.getClientConfig()
    const fromApi = String(remote.individual_tests_url || '').trim()
    // Empty string from API is intentional (hide button); only fall back on fetch failure.
    resolvedCheckupUrl.value = fromApi
  } catch {
    resolvedCheckupUrl.value = fallback
  } finally {
    checkupUrlLoaded.value = true
  }
}

function applyPackageFromQuery() {
  const packageCode = queryPackageCode(route.query.package)
  if (packageCode) {
    journey.selectedPackageCode = packageCode
  }
}

function onReportResultsUpdated(results: HealthReportResult[]) {
  reportResults.value = results
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

function markUploadOffer(message: ChatMessage, text: string) {
  if (message.role !== 'assistant') {
    return
  }
  if (journey.hasAnalysis || readonly.value || escalated.value) {
    return
  }
  if (messageOffersUpload(text)) {
    message.uploadOffer = true
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
  markUploadOffer(message, text)
  const isLive = id === liveAssistantId.value
  const isLatestAssistant = id === lastAssistantId.value
  if (isLive || isLatestAssistant) {
    scrollToLatestSoon(isLive ? 'auto' : 'smooth')
  }
}

function appendMessage(role: ChatMessage['role'], text: string, file?: string, uploadOffer = false) {
  const message = makeMessage(role, text, undefined, file)
  if (uploadOffer) {
    message.uploadOffer = true
  } else {
    markUploadOffer(message, text)
  }
  journey.messages.push(message)
  return message
}

const lastAssistantId = computed(() => {
  const last = [...messages.value].reverse().find(message => message.role === 'assistant')
  return last?.id
})

function assistantMarkState(message: ChatMessage): 'idle' | 'thinking' | 'speaking' {
  if (message.id !== liveAssistantId.value) {
    return 'idle'
  }
  return messageText(message).trim() === '' ? 'thinking' : 'speaking'
}

const clarifyingGoalLabels = computed(() => {
  if (journey.clarifyingGoals.length > 0) {
    return journey.clarifyingGoals
  }
  return inferClarifyingGoalLabels(messages.value, goalOptions.value)
})

const goalClarificationPending = computed(() =>
  goalsClarificationOpen(messages.value, clarifyingGoalLabels.value)
)

const intakeOpen = computed(() =>
  goalSelectActive.value
  || profileGaps.value.length > 0
  || lastAssistantProfile.value !== null
  || goalClarificationPending.value
)

function lineMentionsPackage(line: string) {
  if (/(基礎保養|完整調理)/.test(line) || /\d{3,5}\s*元\s*[/／]?\s*月/.test(line)) {
    return true
  }
  return /方案|兩種選擇/.test(line) && !/[?？]/.test(line)
}

function displayMessageText(message: ChatMessage) {
  let text = messageText(message)
  if (message.role === 'assistant' && goalClarificationPending.value) {
    text = stripFinishedQuizGuide(text)
  }
  if (message.role !== 'assistant' || !intakeOpen.value) {
    return text
  }
  const kept = text.split('\n').filter(line => !lineMentionsPackage(line))
  const out = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return out || text
}

function showRecommendCta(message: ChatMessage) {
  return recommendCtaVisible({
    readonlyMode: readonly.value,
    escalated: escalated.value,
    goalSelectActive: goalSelectActive.value,
    profileQuestionActive: message.turnType === 'profile' && Boolean(message.profileQuestion),
    isLatestAssistant: message.role === 'assistant' && message.id === lastAssistantId.value,
    reportRetry: Boolean(reportRetryId.value),
    pending: pending.value
  })
}

function showRetryCta(_message: ChatMessage) {
  return false
}

function hasTurnActions(message: ChatMessage) {
  if (message.role !== 'assistant') {
    return false
  }
  return choicesFor(message).length > 0
    || showConfirmFor(message)
    || showUploadCta(message)
    || showCheckupCta(message)
    || showRecommendCta(message)
    || showRetryCta(message)
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
  const anchor = scroller.querySelector('[data-testid="chat-last-reply"]')
    ?? scroller.querySelector('article:last-of-type')
  if (anchor instanceof HTMLElement) {
    anchor.scrollIntoView({ block: 'end', behavior })
  }
}

let streamScrollFrame = 0
function scrollToLatestSoon(behavior: ScrollBehavior = 'smooth') {
  if (streamScrollFrame) {
    cancelAnimationFrame(streamScrollFrame)
  }
  streamScrollFrame = requestAnimationFrame(() => {
    streamScrollFrame = 0
    void nextTick().then(() => {
      requestAnimationFrame(() => {
        scrollToLatest(behavior)
      })
    })
  })
}

const lastAssistantTextLen = computed(() => {
  const id = lastAssistantId.value
  if (!id) {
    return 0
  }
  const message = messages.value.find(item => item.id === id)
  return message ? messageText(message).length : 0
})

watch(
  () => [
    messages.value.length,
    pending.value,
    reportInFlight.value,
    lastAssistantId.value,
    lastAssistantTextLen.value,
    liveAssistantId.value,
    journey.hasAnalysis,
    quizActive.value,
    goalSelectActive.value,
    profileGaps.value.length,
    selectedCodes.value.length,
    intakeOpen.value
  ],
  () => {
    const behavior: ScrollBehavior = pending.value || liveAssistantId.value ? 'auto' : 'smooth'
    scrollToLatestSoon(behavior)
  },
  { flush: 'post' }
)

watch(
  () => [needsTextInput.value, pending.value, inputLocked.value] as const,
  ([needs, isPending, locked]) => {
    if (needs && !isPending && !locked) {
      focusChatInput()
    }
  }
)

async function resetConversation() {
  if (readonly.value || resetting.value) {
    return
  }
  if (!window.confirm(t('chat.resetConfirm'))) {
    return
  }

  resetting.value = true
  pollGeneration += 1
  pending.value = false
  reportInFlight.value = false
  reportPollStatus.value = null
  escalated.value = false
  input.value = ''
  pendingUserContent.value = null
  offerUploadAfterStream.value = false
  offerCheckupAfterStream.value = false
  labUploadEligible.value = false
  reportRetryId.value = null
  reportResults.value = []
  journey.reportDockOpen = false
  journey.reportDockCollapsed = false
  reportDockMessageId.value = null
  journey.clearSession()

  try {
    await ensureConversation()
    await nextTick()
    scrollToLatest('auto')
  } catch {
    appendMessage('assistant', t('chat.conversationError'))
  } finally {
    resetting.value = false
  }
}

async function ensureConversation() {
  if (journey.conversationId) {
    return journey.conversationId
  }

  await auth.ensureSession()
  applyPackageFromQuery()
  const packageCode = selectedPackageCodeFromQuery.value
    ?? journey.selectedPackageCode
    ?? undefined
  const created = await candor.createConversation(
    packageCode ? { package_plan_code: packageCode } : {}
  )
  journey.conversationId = created.id
  if (created.package_plan) {
    selectedPackage.value = created.package_plan
    packageConfirmed.value = created.package_plan.confirmed
  }
  postQuizGuided.value = false
  profileGaps.value = []
  reportResults.value = []
  journey.reportDockOpen = false
  journey.reportDockCollapsed = false
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
    const result = await candor.confirmConversationPackagePlan(journey.conversationId)
    selectedPackage.value = result.package_plan
    packageConfirmed.value = result.package_plan.confirmed
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
  if (profileGaps.value.length > 0 || goalClarificationPending.value) {
    return
  }
  const last = [...journey.messages].reverse().find(message => message.role === 'assistant')
  // Still collecting goal clarifications via turn actions — don't append「問答已完成」.
  if (last?.options?.length || (last && assistantStillAsking(messageText(last)))) {
    return
  }
  postQuizGuided.value = true
  if (!journey.hasAnalysis && last?.checkupOffer) {
    // Stale / none path: checkup suggestion already on this bubble — do not invite upload.
    return
  }
  if (!journey.hasAnalysis && !labUploadEligible.value) {
    return
  }
  const text = journey.hasAnalysis
    ? t('chat.guideRecommendAfterQuiz')
    : t('chat.guideUploadAfterQuiz')
  if (last) {
    const existing = messageText(last)
    setMessageText(last.id, existing ? `${existing}\n\n${text}` : text)
    if (!journey.hasAnalysis) {
      last.uploadOffer = true
    }
    return
  }
  appendMessage('assistant', text, undefined, !journey.hasAnalysis)
}

function applyStreamMeta(assistantId: string, result: {
  options?: ChatMessage['options']
  options_kind?: string | null
  turn: { type: string }
  profile_question: ChatMessage['profileQuestion']
  profile_gaps: string[]
  upload_offer?: boolean
}) {
  const message = journey.messages.find(item => item.id === assistantId)
  if (message) {
    message.options = result.options ?? []
    message.turnType = result.turn.type as ChatMessage['turnType']
    message.profileQuestion = result.profile_question ?? null
    message.profileGaps = result.profile_gaps
    if (result.upload_offer) {
      message.uploadOffer = true
      labUploadEligible.value = true
    }
  }
  profileGaps.value = result.profile_gaps
  selectedCodes.value = []
  if (result.turn.type === 'profile' && result.profile_question) {
    activeQuestion.value = {
      done: false,
      gap_code: result.profile_question.gap_code,
      prompt: '',
      answer_type: result.profile_question.answer_type as ProfileAnswerType,
      options: result.options ?? []
    }
    quizActive.value = true
  } else {
    activeQuestion.value = null
    quizActive.value = false
    if (isConsultationGoalOptions(result.options, result.options_kind)) {
      goalSelectActive.value = true
      goalOptions.value = result.options ?? []
    }
  }
}

/** Show bank prompt locally without calling chat. Returns true when a profile question was shown. */
function presentBankQuestion(next: ProfileNext, uploadOffer = false): boolean {
  if (next.done) {
    activeQuestion.value = null
    quizActive.value = false
    return false
  }

  const options = next.options ?? []
  const message = appendMessage('assistant', next.prompt, undefined, uploadOffer)
  message.options = options
  message.turnType = 'profile'
  message.profileQuestion = {
    gap_code: next.gap_code,
    answer_type: next.answer_type
  }
  activeQuestion.value = {
    done: false,
    gap_code: next.gap_code,
    prompt: next.prompt,
    answer_type: next.answer_type,
    options
  }
  quizActive.value = true
  goalSelectActive.value = false
  selectedCodes.value = []
  return true
}

async function continueAfterSavedAnswer(opts: {
  profileGaps: string[]
  nextQuestion?: ProfileNext | null
  pendingContent: string
  uploadOffer?: boolean
  checkupOffer?: boolean
}) {
  profileGaps.value = opts.profileGaps
  clearLastAssistantOptions()
  selectedCodes.value = []

  const next = opts.nextQuestion
  if (next && presentBankQuestion(next, false)) {
    pending.value = false
    focusChatInput()
    return
  }

  pendingUserContent.value = opts.pendingContent
  await streamPending()
  if (opts.uploadOffer) {
    const last = [...journey.messages].reverse().find(message =>
      message.role === 'assistant' && !message.notice
    )
    if (last) {
      last.uploadOffer = true
    }
  }
  if (opts.checkupOffer) {
    const last = [...journey.messages].reverse().find(message =>
      message.role === 'assistant' && !message.notice
    )
    if (last) {
      last.checkupOffer = true
    }
  }
}

async function streamPending() {
  const content = pendingUserContent.value
  const intent = pendingIntent.value
  pendingUserContent.value = null
  pendingIntent.value = null
  // Keep goalSelectActive until stream meta arrives — clearing it early flashes the
  // recommend CTA on the latest assistant bubble while the reply is still in flight.
  const wasSelectingGoals = goalSelectActive.value
  pending.value = true

  if (!content) {
    if (intent === 'interpret') {
      journey.reportInterpretSent = false
    }
    guideAfterQuiz()
    pending.value = false
    return
  }

  if (wasSelectingGoals) {
    goalSelectActive.value = false
  }

  const assistantId = crypto.randomUUID()
  let streamed = ''

  try {
    const conversationId = await ensureConversation()
    journey.messages.push(makeMessage('assistant', '', assistantId))
    liveAssistantId.value = assistantId

    const result = await candor.streamMessage(conversationId, content, {
      onDelta: (chunk) => {
        streamed += chunk
        setMessageText(assistantId, streamed)
      },
      onReplace: (text) => {
        streamed = text
        setMessageText(assistantId, streamed)
      }
    }, intent)

    setMessageText(assistantId, result.content || streamed)
    applyStreamMeta(assistantId, result)
    if (journey.hasAnalysis && reportResults.value.length > 0) {
      reportDockMessageId.value = assistantId
      openReportDock({ expand: false })
    }
    guideAfterQuiz()
  } catch {
    if (intent === 'interpret') {
      journey.reportInterpretSent = false
    }
    if (wasSelectingGoals) {
      goalSelectActive.value = true
    }
    const existing = journey.messages.find(item => item.id === assistantId)
    if (existing) {
      setMessageText(assistantId, t('chat.streamError'))
    } else {
      appendMessage('assistant', t('chat.streamError'))
    }
  } finally {
    pending.value = false
    liveAssistantId.value = null
    focusChatInput()
  }
}

async function runProfileThenStream() {
  if (!pendingUserContent.value) {
    const lastUser = [...journey.messages].reverse().find(message => message.role === 'user')
    pendingUserContent.value = lastUser ? messageText(lastUser) : '開始'
  }
  await streamPending()
}

async function sendText(text: string) {
  const content = text.trim()
  if (!content || pending.value || readonly.value || escalated.value) {
    return
  }

  const profile = lastAssistantProfile.value
  if (profile) {
    appendMessage('user', content)
    pending.value = true
    try {
      const conversationId = await ensureConversation()
      const result = await candor.submitProfileAnswer({
        gap_code: profile.gap_code,
        raw_text: content,
        conversation_id: conversationId
      })
      if (result.saved) {
        await continueAfterSavedAnswer({
          profileGaps: result.profile_gaps,
          nextQuestion: result.next_question,
          pendingContent: content
        })
        return
      }
      // diverted / clarification: short reply, keep profile choices
      appendMessage('assistant', result.prompt)
      if (result.options) {
        const last = [...journey.messages].reverse().find(message => message.role === 'assistant')
        if (last) {
          last.options = result.options
          last.turnType = 'profile'
          last.profileQuestion = {
            gap_code: profile.gap_code,
            answer_type: profile.answer_type
          }
        }
      }
      pending.value = false
      focusChatInput()
    } catch {
      appendMessage('assistant', t('chat.streamError'))
      pending.value = false
      focusChatInput()
    }
    return
  }

  appendMessage('user', content)
  pendingUserContent.value = content
  await streamPending()
}

function clearLastAssistantOptions() {
  const message = intakeMessage.value
  if (!message) {
    return
  }
  message.options = []
  message.profileQuestion = null
  message.turnType = 'message'
}

function onChoice(option: GreetingOption) {
  if (pending.value) {
    return
  }

  if (goalSelectActive.value || lastAssistantProfile.value?.answer_type === 'multi_enum') {
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
    selectedCodes.value = [option.code]
    return
  }

  if (lastAssistantProfile.value) {
    return submitProfileChoice({ value: option.code, display: option.label })
  }

  // Free-form message options
  clearLastAssistantOptions()
  return sendText(option.label)
}

async function confirmMultiSelection() {
  if (selectedCodes.value.length === 0 || pending.value) {
    return
  }

  if (goalSelectActive.value) {
    if (selectedCodes.value.length < 2) {
      appendMessage('assistant', t('chat.goalsNeedTwo'))
      return
    }
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
        if (result.options_kind === 'consultation_goals' || result.options?.length) {
          goalSelectActive.value = true
        }
        pending.value = false
        return
      }
      journey.clarifyingGoals = labels
      selectedCodes.value = []
      // Clear after pending is already true so recommend CTA does not flash.
      goalSelectActive.value = false
      const nextAfterGoals = result.next_question
      if (nextAfterGoals && !nextAfterGoals.done && presentBankQuestion(nextAfterGoals)) {
        if (profileGaps.value.length === 0) {
          profileGaps.value = [nextAfterGoals.gap_code]
        }
        pending.value = false
        focusChatInput()
        return
      }
      await continueAfterSavedAnswer({
        profileGaps: [],
        nextQuestion: { done: true },
        pendingContent: labels.join('、')
      })
    } catch {
      appendMessage('assistant', t('chat.streamError'))
      pending.value = false
    }
    return
  }

  if (lastAssistantProfile.value) {
    if (isLabRecencyQuestion.value) {
      const code = selectedCodes.value[0]
      if (!code) {
        return
      }
      const label = choiceOptions.value.find(o => o.code === code)?.label ?? code
      offerUploadAfterStream.value = UPLOADABLE_LAB_CODES.has(code)
      offerCheckupAfterStream.value = STALE_LAB_CODES.has(code)
      labUploadEligible.value = UPLOADABLE_LAB_CODES.has(code)
      if (offerCheckupAfterStream.value) {
        void loadCheckupLinkUrl()
      }
      return submitProfileChoice({ value: code, display: label })
    }

    const labels = choiceOptions.value
      .filter(o => selectedCodes.value.includes(o.code))
      .map(o => o.label)
    return submitProfileChoice({
      value: selectedCodes.value,
      display: labels.join('、')
    })
  }
}

async function submitProfileChoice(payload: {
  value?: string | number | boolean | string[] | null
  raw_text?: string | null
  display: string
}) {
  const profile = lastAssistantProfile.value
  if (!profile) {
    return
  }

  appendMessage('user', payload.display)
  pending.value = true

  try {
    const conversationId = await ensureConversation()
    const result = await candor.submitProfileAnswer({
      gap_code: profile.gap_code,
      value: payload.value,
      raw_text: payload.raw_text,
      conversation_id: conversationId
    })

    if (!result.saved) {
      appendMessage('assistant', result.prompt)
      if (result.options) {
        const last = [...journey.messages].reverse().find(message => message.role === 'assistant')
        if (last) {
          last.options = result.options
          last.turnType = 'profile'
          last.profileQuestion = {
            gap_code: profile.gap_code,
            answer_type: profile.answer_type
          }
        }
      }
      pending.value = false
      return
    }

    const uploadOffer = offerUploadAfterStream.value
    const checkupOffer = offerCheckupAfterStream.value
    offerUploadAfterStream.value = false
    offerCheckupAfterStream.value = false
    await continueAfterSavedAnswer({
      profileGaps: result.profile_gaps,
      nextQuestion: result.next_question,
      pendingContent: payload.display,
      uploadOffer,
      checkupOffer
    })
  } catch {
    offerUploadAfterStream.value = false
    offerCheckupAfterStream.value = false
    appendMessage('assistant', t('chat.streamError'))
    pending.value = false
  }
}

function pickFile() {
  if (!canOfferUpload.value) {
    return
  }
  if (!auth.isMember) {
    void navigateTo(
      `${localePath('/login')}?redirect=${encodeURIComponent(route.fullPath)}&mode=login`
    )
    return
  }

  fileInput.value?.click()
}

function openReportDock(opts?: { expand?: boolean }) {
  journey.reportDockOpen = true
  if (opts?.expand !== false) {
    journey.reportDockCollapsed = false
  }
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
    reportPollStatus.value = report.status

    if (report.status === 'ready' || report.status === 'needs_review' || report.status === 'failed') {
      return report
    }

    await sleep(POLL_INTERVAL_MS)
  }

  return null
}

async function bindAndInterpret(reportId: string) {
  const conversationId = await ensureConversation()
  let attached = false
  for (let attempt = 0; attempt < 8 && !attached; attempt++) {
    try {
      await candor.attachReport(conversationId, reportId)
      attached = true
    } catch (error) {
      if (error instanceof CandorApiError && error.errorCode === 'report_not_ready') {
        reportInFlight.value = true
        reportPollStatus.value = 'extracting'
        await sleep(POLL_INTERVAL_MS)
        continue
      }
      if (error instanceof CandorApiError && error.errorCode === 'report_profile_mismatch') {
        journey.reportId = null
        journey.hasAnalysis = false
        try {
          await candor.detachReport(conversationId)
        } catch {
          // already unbound or never attached
        }
        appendMessage('assistant', t('chat.reportSkippedMismatch')).notice = true
        return
      }
      throw error
    }
  }
  if (!attached) {
    reportInFlight.value = false
    reportPollStatus.value = 'failed'
    reportRetryId.value = reportId
    return
  }

  if (!reportResults.value.length) {
    try {
      const fresh = await candor.getHealthReport(reportId)
      rememberReport(fresh)
    } catch {
      // table may stay empty until reopen
    }
  }

  const keepGoals = goalSelectActive.value
  const keepProfile = lastAssistantProfile.value !== null
  const gapsRemain = profileGaps.value.length > 0

  journey.reportId = reportId
  journey.hasAnalysis = true
  journey.reportInterpretSent = false
  reportRetryId.value = null
  reportPollStatus.value = null
  openReportDock()

  if (!keepGoals && !keepProfile && gapsRemain && !readonly.value && !escalated.value) {
    pendingUserContent.value = t('chat.continueIntake')
    pendingIntent.value = null
    await streamPending()
  }
}

async function askInterpret() {
  if (pending.value || readonly.value || escalated.value || !journey.hasAnalysis) {
    return
  }
  const interpret = t('chat.askInterpret')
  journey.reportInterpretSent = true
  appendMessage('user', interpret)
  pendingUserContent.value = interpret
  pendingIntent.value = 'interpret'
  await runProfileThenStream()
}

async function handleReportTerminal(report: HealthReport) {
  if (report.status === 'ready' || report.status === 'needs_review') {
    await waitWhileChatPending()
    await bindAndInterpret(report.id)
    return
  }

  if (report.status === 'failed') {
    reportPollStatus.value = 'failed'
    reportRetryId.value = report.id
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
  reportPollStatus.value = 'uploaded'
  reportRetryId.value = null

  try {
    await ensureConversation()
    const uploaded = await candor.uploadHealthReport(file)
    journey.reportId = uploaded.id
    reportPollStatus.value = uploaded.status || 'uploaded'

    const report = await pollReport(uploaded.id)
    if (!report) {
      return
    }

    reportInFlight.value = false
    await handleReportTerminal(report)
  } catch {
    reportPollStatus.value = 'failed'
    if (journey.reportId) {
      reportRetryId.value = journey.reportId
    }
    appendMessage('assistant', t('chat.streamError')).notice = true
  } finally {
    reportInFlight.value = false
  }
}

async function retryReport() {
  const id = reportRetryId.value ?? journey.reportId
  if (!id || reportInFlight.value) {
    return
  }

  reportInFlight.value = true
  reportRetryId.value = null
  reportPollStatus.value = 'extracting'

  try {
    await candor.retryHealthReport(id)
    const report = await pollReport(id)
    if (!report) {
      return
    }
    reportInFlight.value = false
    await handleReportTerminal(report)
  } catch {
    reportPollStatus.value = 'failed'
    reportRetryId.value = id
    appendMessage('assistant', t('chat.streamError')).notice = true
  } finally {
    reportInFlight.value = false
  }
}

async function onSubmit() {
  const content = input.value.trim()
  input.value = ''
  focusChatInput()
  if (!content || pending.value) {
    return
  }

  if (goalSelectActive.value) {
    appendMessage('user', content)
    pending.value = true
    focusChatInput()
    try {
      const conversationId = await ensureConversation()
      const result = await candor.setConversationGoals(conversationId, { raw_text: content })
      if (result.saved) {
        selectedCodes.value = []
        // Clear after pending is already true so recommend CTA does not flash.
        goalSelectActive.value = false
        const nextAfterGoals = result.next_question
        if (nextAfterGoals && !nextAfterGoals.done && presentBankQuestion(nextAfterGoals)) {
          if (profileGaps.value.length === 0) {
            profileGaps.value = [nextAfterGoals.gap_code]
          }
          pending.value = false
          focusChatInput()
          return
        }
        pendingUserContent.value = content
        await streamPending()
        return
      }
      appendMessage('assistant', result.prompt || t('chat.streamError'))
      if (result.options) {
        goalOptions.value = result.options
      }
      if (result.options_kind === 'consultation_goals' || result.options?.length) {
        goalSelectActive.value = true
      }
    } catch {
      appendMessage('assistant', t('chat.streamError'))
    } finally {
      pending.value = false
      focusChatInput()
    }
    return
  }

  await sendText(content)
  focusChatInput()
}

function escalate() {
  if (readonly.value) {
    return
  }

  if (!auth.hasSession) {
    const chatPath = selectedPackageCodeFromQuery.value
      ? `${localePath('/chat')}?package=${encodeURIComponent(selectedPackageCodeFromQuery.value)}&handoff=1`
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

  const path = localePath('/app/recommendations')
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

function restoreUploadOffers() {
  if (journey.hasAnalysis || readonly.value || escalated.value) {
    return
  }
  for (const message of journey.messages) {
    markUploadOffer(message, messageText(message))
  }
}

/** Reload report rows after refresh; dock stays closed until the user expands it. */
async function restoreReportSession() {
  const reportId = journey.reportId
  if (!reportId || readonly.value) {
    return
  }

  try {
    const report = await candor.getHealthReport(reportId)
    rememberReport(report)

    if (report.status === 'ready' || report.status === 'needs_review') {
      journey.hasAnalysis = true
      // After reload: show only the collapsed bar — do not auto-expand.
      journey.reportDockOpen = true
      journey.reportDockCollapsed = true
      const last = [...journey.messages].reverse().find(message => message.role === 'assistant')
      if (last) {
        reportDockMessageId.value = last.id
      }
      return
    }

    if (report.status === 'failed') {
      reportPollStatus.value = 'failed'
      reportRetryId.value = reportId
      return
    }

    reportInFlight.value = true
    reportPollStatus.value = report.status
    const terminal = await pollReport(reportId)
    reportInFlight.value = false
    if (terminal) {
      await handleReportTerminal(terminal)
    }
  } catch {
    // keep dock as stored; table may stay empty
  }
}

onMounted(async () => {
  if (orderId.value) {
    await loadOrderChat(orderId.value)
    return
  }

  journey.hydrate()
  restoreUploadOffers()

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
  await restoreReportSession()
  scrollToLatest('auto')
})

onBeforeUnmount(() => {
  pollGeneration += 1
  if (streamScrollFrame) {
    cancelAnimationFrame(streamScrollFrame)
    streamScrollFrame = 0
  }
})
</script>

<style scoped>
:deep(.report-status-retry) {
  height: 2rem;
  min-height: 2rem;
  padding-inline: 0.75rem;
  font-size: 0.8125rem;
}
</style>
