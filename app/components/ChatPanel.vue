<template>
  <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-default">
    <header class="flex shrink-0 flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
      <div class="min-w-0 flex-1">
        <h1 class="flex items-center gap-2 text-lg font-semibold text-highlighted">
          <span>{{ $t(readonly ? 'chat.viewOnlyTitle' : (isStandardFlow ? 'nav.chatAi' : 'chat.title')) }}</span>
          <span
            v-if="isStandardFlow && !readonly"
            class="app-badge app-badge-pending"
            data-testid="chat-flow-standard"
          >
            {{ $t('chat.standard') }}
          </span>
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
      class="shrink-0 px-4 py-3 sm:px-6"
      data-testid="chat-escalated"
    >
      <div class="mx-auto w-full max-w-3xl">
        <p class="text-sm font-medium text-highlighted">
          {{ $t('chat.escalatedTitle') }}
        </p>
        <p class="mt-1 text-sm text-muted">
          {{ $t('chat.escalatedLocked') }}
        </p>
      </div>
    </div>

    <div
      v-if="selectedPackage && !readonly"
      class="shrink-0 px-4 py-3 sm:px-6"
      data-testid="chat-selected-plan"
    >
      <div class="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-3">
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
        class="absolute left-1/2 top-3 z-20 flex w-[min(48rem,calc(100%-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-default bg-elevated shadow-lg sm:w-[min(48rem,calc(100%-3rem))]"
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
        :open="reportDockVisible"
        :collapsed="showEmptyReportBar ? true : journey.reportDockCollapsed"
        :prompt="showEmptyReportBar"
        :results="reportResults"
        :report-id="journey.reportId"
        :show-interpret="reportDockBar.showExplainHighlights"
        :interpret-disabled="reportDockBar.explainHighlightsDisabled"
        :show-want-more-tests="reportDockBar.showWantMoreTestsLink"
        @update:collapsed="onReportDockCollapsed"
        @updated="onReportResultsUpdated"
        @interpret="askInterpret"
        @upload="openAttachMenu"
      />
      <div
        ref="transcriptEl"
        data-testid="chat-transcript"
        class="absolute inset-0 overflow-y-auto px-4 py-4 [scrollbar-width:none] [-ms-overflow-style:none] sm:px-6 [&::-webkit-scrollbar]:hidden"
        :class="{ 'pt-20': transcriptNeedsDockPad }"
      >
        <div class="mx-auto w-full max-w-3xl">
          <article
            v-for="message in messages"
            :key="message.id"
            class="flex gap-3 pb-8"
            :class="[
              message.role === 'user' ? 'justify-end items-end' : 'justify-start items-start'
            ]"
          >
            <ChatAssistantMark
              v-if="message.role === 'assistant'"
              :state="assistantMarkState(message)"
            />
            <div
              class="text-sm leading-relaxed"
              :class="message.role === 'user'
                ? 'max-w-[75%] overflow-hidden rounded-lg bg-elevated px-4 py-3 text-highlighted'
                : 'min-w-0 flex-1 text-default'"
              :data-testid="message.id === lastAssistantId ? 'chat-last-reply' : undefined"
            >
              <ChatMarkdown
                v-if="!isLiveEmptyAssistant(message)"
                :text="displayMessageText(message)"
                :streaming="isLiveStreamingAssistant(message)"
              />
              <ChatTypingEllipsis
                v-else
                class="text-muted"
              />
              <p
                v-if="fileName(message)"
                class="mt-2 inline-flex items-center gap-1 rounded-lg bg-elevated px-2 py-1 text-xs text-muted"
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
                :checkup-url="checkupUrlFor(message)"
                :show-want-more-tests="showWantMoreTestsCta(message)"
                :want-more-tests-url="checkupLinkUrl"
                :show-submit-review="showSubmitReviewCta(message)"
                :show-view-recommend="showViewRecommendCta(message)"
                :show-retry="showRetryCta(message)"
                :pending="pending"
                :flow="isStandardFlow ? 'standard' : undefined"
                :vitals-fields="vitalsFieldsFor(message)"
                :vitals-disabled="pending || readonly || escalated"
                :path-allows-continue="completionCtaPathAllows(conversationPath)"
                @choice="onChoice"
                @confirm="confirmMultiSelection"
                @upload="openAttachMenu"
                @submit-review="submitExpertReview"
                @recommend="goViewRecommend"
                @retry="retryReport"
                @continue-consult="onContinueConsult"
                @vitals-submit="onVitalsSubmit"
              />
            </div>
          </article>
          <p
            v-if="pending && !reportInFlight && !liveAssistantId"
            class="flex items-center gap-2 pb-8 text-sm text-muted"
            data-testid="chat-thinking"
          >
            <AssistantMark state="thinking" />
            <span class="inline-flex items-center gap-2">
              <span>{{ $t('chat.thinking') }}</span>
              <ChatTypingEllipsis class="text-muted" />
            </span>
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="!readonly"
      class="shrink-0 px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <ChatPhotoTray
        v-if="photoTrayOpen && !escalated"
        :items="photoTrayItems"
        :busy="photoTrayBusy"
        :error="photoTrayError"
        @camera="pickCamera"
        @gallery="pickGallery"
        @remove="removePhotoTrayItem"
        @confirm="confirmPhotoTray"
        @cancel="closePhotoTray"
      />
      <form
        v-if="!escalated"
        class="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-xl border border-default bg-default p-2"
        @submit.prevent="onSubmit"
      >
        <input
          ref="pdfInput"
          type="file"
          accept=".pdf,application/pdf"
          class="hidden"
          data-testid="chat-upload-input"
          @change="onFile"
        >
        <input
          ref="cameraInput"
          type="file"
          accept="image/*"
          capture="environment"
          class="hidden"
          data-testid="chat-camera-input"
          @change="onCameraFile"
        >
        <input
          ref="galleryInput"
          type="file"
          accept="image/*"
          multiple
          class="hidden"
          data-testid="chat-gallery-input"
          @change="onGalleryFiles"
        >
        <div
          ref="attachMenuRoot"
          class="relative shrink-0"
        >
          <button
            type="button"
            class="app-btn app-btn-ghost size-10 shrink-0 px-0"
            :disabled="!canOfferUpload"
            data-testid="chat-upload"
            :aria-label="$t('chat.upload')"
            :aria-expanded="attachMenuOpen"
            aria-haspopup="menu"
            @click="toggleAttachMenu"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-4"
            />
          </button>
          <div
            v-if="attachMenuOpen"
            role="menu"
            class="absolute bottom-full left-0 z-30 mb-2 min-w-40 overflow-hidden rounded-xl border border-default bg-elevated py-1 shadow-lg"
            data-testid="chat-attach-menu"
          >
            <button
              type="button"
              role="menuitem"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-highlighted hover:bg-default"
              data-testid="chat-attach-pdf"
              @click="pickPdf"
            >
              <UIcon
                name="i-lucide-file-text"
                class="size-4 shrink-0 text-muted"
              />
              {{ $t('chat.attachPdf') }}
            </button>
            <button
              type="button"
              role="menuitem"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-highlighted hover:bg-default"
              data-testid="chat-attach-image"
              @click="pickImagesFromMenu"
            >
              <UIcon
                name="i-lucide-image"
                class="size-4 shrink-0 text-muted"
              />
              {{ $t('chat.attachImage') }}
            </button>
          </div>
        </div>
        <textarea
          ref="chatInput"
          v-model="input"
          rows="1"
          class="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-highlighted outline-none placeholder:text-muted"
          :placeholder="composerPlaceholder"
          :disabled="inputLocked"
          :readonly="pending"
          data-testid="chat-input"
          @compositionstart="onCompositionStart"
          @compositionend="onCompositionEnd"
          @keydown.enter.exact="onComposerEnter"
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
import type { PhotoTrayItem } from '~/components/ChatPhotoTray.vue'
import type {
  ConversationGreeting,
  GreetingOption,
  HealthReport,
  HealthReportResult,
  ProfileAnswerType,
  ProfileAnswerNeedsClarification,
  ProfileNext
} from '~/utils/candor-api'
import { CandorApiError } from '~/utils/candor-api'
import {
  CompressReportImagesError,
  REPORT_IMAGE_MAX_COUNT,
  compressReportImages,
  tryLoadImageFile
} from '~/utils/compress-report-images'
import { IME_CONFIRM_ENTER_MS, shouldIgnoreComposerEnter } from '~/utils/composer-enter'
import type { ChatMessage } from '~/utils/first-order'
import {
  assistantStillAsking,
  goalsClarificationOpen,
  inferClarifyingGoalLabels,
  stripFinishedQuizGuide
} from '~/utils/first-order'
import {
  basicQuestionFollowsUserTurn,
  peelAppendedPrompt
} from '~/utils/basic-question-host'
import { findIntakeAssistantMessage } from '~/utils/chat-intake'
import {
  buildTurnActionsVisibility,
  type ChatTurnUiContext,
  reportDockBarVisibility,
  resolveEffectiveGoalOptions
} from '~/utils/chat-turn-actions'
import {
  isBasicProfileComplete,
  completionCtaPathAllows,
  isConversationPath,
  isRequiredBasicGapCode,
  normalizeConversationPath,
  PATH_ENTRY_OPTIONS,
  pathAfterReportUpload,
  pathRequiresBasicProfile,
  toApiConversationPath,
  type ConversationPath
} from '~/utils/path-contract'
import {
  chooseOptionPayload,
  detectPathRuleCopyKind,
  findGapCtaHostMessage,
  hasAskReportAction,
  hasReplyActionsColumn,
  hasReportRequiredAsk,
  CONTINUE_CONSULT_I18N_KEY,
  isContinueConsultationOption,
  isPathSwitchOptionCode,
  isUsableReplyActions,
  normalizeChooseOptionMapsTo,
  parseReplyActions,
  pathSwitchChipI18nKey,
  shouldSkipFollowUpStream,
  type ReplyActions,
  type VitalsField
} from '~/utils/reply-actions'
import { vitalsGapCodeForField } from '~/utils/vitals-input'
import {
  historyMessageToChatMessage,
  parseConversationMessagesResult
} from '~/utils/chat-history'
import { expertReviewUiStatusFromRow } from '~/utils/expert-review'
import { storeToRefs } from 'pinia'

const props = defineProps<{
  flow?: 'standard'
}>()

const POLL_INTERVAL_MS = 2000

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const config = useRuntimeConfig()
const auth = useAuthStore()
const journey = useJourneyStore()
const {
  quizActive,
  goalSelectActive,
  reportAskActive,
  activeQuestion,
  goalOptions,
  selectedCodes,
  selectedPackage,
  packageConfirmed,
  postQuizGuided,
  profileGaps,
  conversationPath,
  pathCAwaitingUpload
} = storeToRefs(journey)
const ordersApi = useFirstOrderApi()
const candor = useCandorApi()

const isStandardFlow = computed(() =>
  props.flow === 'standard' || route.meta.flow === 'standard'
)

/** Path contract feature flag (`nuxt.config` public.pathContract). */
const pathContractEnabled = computed(() => config.public.pathContract !== false)

const input = ref('')
const composing = ref(false)
let compositionEndedAt = 0
let composingTimer: ReturnType<typeof setTimeout> | undefined
const pending = ref(false)
const liveAssistantId = ref<string | null>(null)
const resetting = ref(false)
const reportInFlight = ref(false)
const reportPollStatus = ref<string | null>(null)
const escalated = ref(false)
const pendingUserContent = ref<string | null>(null)
const pendingIntent = ref<string | null>(null)
const resolvedCheckupUrl = ref('')
const checkupUrlLoaded = ref(false)
const reportRetryId = ref<string | null>(null)
const reportResults = ref<HealthReportResult[]>([])
const transcriptEl = useTemplateRef<HTMLElement>('transcriptEl')
const pdfInput = useTemplateRef<HTMLInputElement>('pdfInput')
const cameraInput = useTemplateRef<HTMLInputElement>('cameraInput')
const galleryInput = useTemplateRef<HTMLInputElement>('galleryInput')
const attachMenuRoot = useTemplateRef<HTMLElement>('attachMenuRoot')

type PhotoTrayEntry = PhotoTrayItem & { file: File }

const photoTrayOpen = ref(false)
const photoTrayBusy = ref(false)
const photoTrayError = ref('')
const photoTrayEntries = ref<PhotoTrayEntry[]>([])
const photoTrayItems = computed(() =>
  photoTrayEntries.value.map(({ id, previewUrl, name }) => ({ id, previewUrl, name }))
)
const attachMenuOpen = ref(false)
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

function queryGoalCodes(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : value == null ? [] : [value]
  const codes: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') {
      continue
    }
    const code = item.trim()
    if (code !== '' && !codes.includes(code)) {
      codes.push(code)
    }
  }
  return codes
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
/** Top bar when this conversation has no ready report yet (not persisted as reportDockOpen). */
const showEmptyReportBar = computed(() =>
  !readonly.value
  && !escalated.value
  && !showReportStatusBanner.value
  // Only a bound report counts as analysis; visiting recommendations must not hide this bar.
  && !(journey.hasAnalysis && journey.reportId)
)
const reportDockVisible = computed(() =>
  showEmptyReportBar.value || journey.reportDockOpen
)
const transcriptNeedsDockPad = computed(() =>
  showEmptyReportBar.value
  || showReportStatusBanner.value
  || (journey.reportDockOpen && journey.reportDockCollapsed)
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

/**
 * Waiting for 進站三選 on a fresh greeting only.
 * May be before POST /conversations (path is create-time); after create with path,
 * conversationPath is set and this is false.
 * Legacy／hydrate sessions with user turns keep path=null → RA rules (no entry overlay).
 */
const pathEntryPending = computed(() =>
  pathContractEnabled.value
  && !readonly.value
  && !isStandardFlow.value
  && conversationPath.value == null
  && messages.value.some(m => m.role === 'assistant')
  && !messages.value.some(m => m.role === 'user')
)

const labReportQuizActive = computed(() => {
  if (!pathContractEnabled.value || !reportAskActive.value) {
    return false
  }
  // Only suppress bubble upload／checkup while lab_report choose_option is active.
  const last = [...messages.value].reverse().find(m => m.role === 'assistant')
  const ra = last?.replyActions
  if (!isUsableReplyActions(ra)) {
    return false
  }
  return ra!.actions.some((action) => {
    if (action.type !== 'choose_option') {
      return false
    }
    const payload = chooseOptionPayload(action)
    return payload.kind === 'lab_report' || payload.gap_code === 'lab_report'
  })
})

const choiceOptions = computed((): GreetingOption[] => {
  if (goalSelectActive.value) {
    const last = messages.value.find(message => message.id === lastAssistantId.value)
    return resolveEffectiveGoalOptions({
      goalSelectActive: true,
      goalOptions: goalOptions.value,
      intake: intakeMessage.value,
      message: last
    })
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

const needsMultiConfirm = computed(() => {
  if (goalSelectActive.value) {
    return true
  }
  // profile enum (incl. lab_report / checkup / blood_test) = single-tap submit;
  // only multi_enum needs confirm (reply_actions v0.1).
  return lastAssistantProfile.value?.answer_type === 'multi_enum'
})

const confirmDisabled = computed(() =>
  pending.value
  || selectedCodes.value.length === 0
  || (goalSelectActive.value && selectedCodes.value.length < 1)
)

const gapCtaHostMessage = computed(() =>
  findGapCtaHostMessage(messages.value, { openProfileGaps: profileGaps.value })
)

const gapCtaHostId = computed(() => gapCtaHostMessage.value?.id)

const turnUiContext = computed((): ChatTurnUiContext => ({
  readonlyMode: readonly.value,
  escalated: escalated.value,
  pending: pending.value,
  goalSelectActive: goalSelectActive.value,
  reportAskActive: reportAskActive.value,
  hasReportAnalysis: journey.hasAnalysis,
  reportRetry: Boolean(reportRetryId.value),
  checkupLinkReady: checkupLinkUrl.value !== '',
  lastAssistantId: lastAssistantId.value,
  gapCtaHostId: gapCtaHostId.value,
  gapCtaHostReplyActions: gapCtaHostMessage.value?.replyActions ?? null,
  conversationPath: pathContractEnabled.value ? conversationPath.value : null,
  openProfileGaps: profileGaps.value,
  labReportQuizActive: labReportQuizActive.value,
  pathEntryPending: pathEntryPending.value
}))

function turnActionsFor(message: ChatMessage) {
  return buildTurnActionsVisibility({
    message,
    ctx: turnUiContext.value,
    intake: intakeMessage.value,
    goalOptions: goalOptions.value,
    needsMultiConfirm: needsMultiConfirm.value,
    expertReviewStatus: journey.expertReviewStatus,
    flow: isStandardFlow.value ? 'standard' : undefined
  })
}

function pathEntryChoices(): GreetingOption[] {
  return PATH_ENTRY_OPTIONS.map(option => ({
    code: option.code,
    label: t(option.labelKey)
  }))
}

function isPathSwitchChoice(option: GreetingOption): boolean {
  // Only the latest assistant path_switch counts — older guide CTAs must not
  // keep intercepting unrelated chips (e.g. code `b`) after A→B.
  const last = [...messages.value].reverse().find(message => message.role === 'assistant')
  if (!last) {
    return false
  }
  return isPathSwitchOptionCode(last.replyActions, option.code)
}

/** Drop path-rule guide CTAs after the user has already switched path. */
function clearPathRuleGuideCtas() {
  for (const message of journey.messages) {
    if (message.role !== 'assistant' || !detectPathRuleCopyKind(message.replyActions)) {
      continue
    }
    message.replyActions = undefined
  }
}

/** @deprecated flow v2: assistant copy comes from core `content`. */
function applyPathRuleCopy(_message: ChatMessage | undefined) {
  // No-op — PR5+ 上限／引導文案由 conversation_copies 回傳。
}

function appendCoreAssistantTurn(turn: ConversationGreeting) {
  const msg = makeMessage(
    'assistant',
    turn.content,
    turn.message_id || crypto.randomUUID()
  )
  const ra = parseReplyActions(turn.reply_actions)
  if (ra) {
    msg.replyActions = ra
    applyReplyActionsInteraction(msg, ra)
  }
  journey.messages.push(msg)
  return msg
}

function localizePathSwitchChoices(
  message: ChatMessage,
  choices: GreetingOption[]
): GreetingOption[] {
  const kind = detectPathRuleCopyKind(message.replyActions)
  if (!kind) {
    return choices
  }
  const label = t(pathSwitchChipI18nKey(kind))
  return choices.map((option) => {
    if (!isPathSwitchOptionCode(message.replyActions, option.code)) {
      return option
    }
    if (String(option.label || '').trim() !== '') {
      return option
    }
    return { ...option, label }
  })
}

function choicesFor(message: ChatMessage): GreetingOption[] {
  if (pathEntryPending.value && message.id === lastAssistantId.value) {
    return pathEntryChoices()
  }
  return localizePathSwitchChoices(message, turnActionsFor(message).choices)
}

function showConfirmFor(message: ChatMessage) {
  if (pathEntryPending.value && message.id === lastAssistantId.value) {
    return false
  }
  return turnActionsFor(message).showConfirm
}

function isConsultationGoalOptions(
  options: GreetingOption[] | undefined,
  optionsKind?: string | null
) {
  return optionsKind === 'consultation_goals' && Array.isArray(options) && options.length >= 2
}

function showUploadCta(message: ChatMessage) {
  return turnActionsFor(message).showUpload
}

function showCheckupCta(message: ChatMessage) {
  return turnActionsFor(message).showCheckup
}

function showWantMoreTestsCta(message: ChatMessage) {
  return turnActionsFor(message).showWantMoreTests
}

function checkupUrlFor(message: ChatMessage) {
  const override = turnActionsFor(message).checkupUrlOverride
  return override || checkupLinkUrl.value
}

function vitalsFieldsFor(message: ChatMessage): VitalsField[] {
  return turnActionsFor(message).vitalsFields
}

function exclusiveCodesFor(message: ChatMessage): string[] {
  return turnActionsFor(message).exclusiveCodes
}

type CheckupOfferFields = {
  checkup_offer?: boolean
  checkup_suggest?: string | null
  individual_tests_url?: string | null
}

/**
 * Legacy checkup_offer flag no longer drives bubble CTA (#18–19 RA-only).
 * Still merges suggest copy into the bubble and caches checkup URL for dock / offer_checkup.
 */
function applyCheckupOffer(message: ChatMessage, fields: CheckupOfferFields) {
  if (!fields.checkup_offer) {
    return
  }
  // Do not set message.checkupOffer — bubble外連只認 reply_actions offer_checkup.
  const suggest = String(fields.checkup_suggest || '').trim()
  if (suggest) {
    const existing = messageText(message)
    if (!existing.includes(suggest)) {
      const next = existing ? `${existing}\n\n${suggest}` : suggest
      const file = message.parts.find(part => part.type === 'file')
      message.parts = [{ type: 'text', text: next }]
      if (file) {
        message.parts.push(file)
      }
    }
  }
  const url = String(fields.individual_tests_url || '').trim()
  if (url) {
    resolvedCheckupUrl.value = url
    checkupUrlLoaded.value = true
  } else if (!checkupUrlLoaded.value) {
    void loadCheckupLinkUrl()
  }
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

function onReportDockCollapsed(value: boolean) {
  if (showEmptyReportBar.value) {
    return
  }
  journey.reportDockCollapsed = value
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
  const isLive = id === liveAssistantId.value
  const isLatestAssistant = id === lastAssistantId.value
  if (isLive || isLatestAssistant) {
    scrollToLatestSoon(isLive ? 'auto' : 'smooth')
  }
}

function appendMessage(role: ChatMessage['role'], text: string, file?: string) {
  const message = makeMessage(role, text, undefined, file)
  journey.messages.push(message)
  return message
}

const lastAssistantId = computed(() => {
  const last = [...messages.value].reverse().find(message => message.role === 'assistant')
  return last?.id
})

function findIntakeMessage(list: ChatMessage[]): ChatMessage | undefined {
  return findIntakeAssistantMessage(list, {
    goalSelectActive: goalSelectActive.value,
    lastAssistantId: lastAssistantId.value
  })
}

const intakeMessage = computed(() => findIntakeMessage(messages.value))

const reportDockBar = computed(() =>
  reportDockBarVisibility({
    ctx: turnUiContext.value,
    profileQuestionActive: Boolean(lastAssistantProfile.value),
    reportInterpretSent: journey.reportInterpretSent,
    promptMode: showEmptyReportBar.value
  })
)

function assistantMarkState(message: ChatMessage): 'idle' | 'thinking' | 'speaking' {
  if (message.id !== liveAssistantId.value) {
    return 'idle'
  }
  return messageText(message).trim() === '' ? 'thinking' : 'speaking'
}

function isLiveEmptyAssistant(message: ChatMessage) {
  return message.role === 'assistant'
    && message.id === liveAssistantId.value
    && displayMessageText(message).trim() === ''
}

function isLiveStreamingAssistant(message: ChatMessage) {
  return message.role === 'assistant'
    && message.id === liveAssistantId.value
    && displayMessageText(message).trim() !== ''
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

function displayMessageText(message: ChatMessage) {
  const text = messageText(message)
  if (message.role === 'assistant' && goalClarificationPending.value) {
    return stripFinishedQuizGuide(text)
  }
  return text
}

function showSubmitReviewCta(message: ChatMessage) {
  return turnActionsFor(message).showSubmitReview
}

function showViewRecommendCta(message: ChatMessage) {
  return turnActionsFor(message).showViewRecommend
}

function showRetryCta(message: ChatMessage) {
  return turnActionsFor(message).showRetry
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
    selectedCodes.value.length
  ],
  () => {
    const behavior: ScrollBehavior = pending.value || liveAssistantId.value ? 'auto' : 'smooth'
    scrollToLatestSoon(behavior)
  },
  { flush: 'post' }
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
  reportRetryId.value = null
  reportResults.value = []
  closeAttachMenu()
  closePhotoTray()
  journey.reportDockOpen = false
  journey.reportDockCollapsed = false
  journey.clearSession()

  try {
    if (pathContractEnabled.value && !isStandardFlow.value) {
      await auth.ensureSession()
      ensureLocalPathEntryGreeting()
    } else {
      await ensureConversation()
    }
    await nextTick()
    scrollToLatest('auto')
  } catch {
    appendMessage('assistant', t('chat.conversationError'))
  } finally {
    resetting.value = false
  }
}

/** Local welcome + 進站三選 before create (path is written at POST /conversations). */
function ensureLocalPathEntryGreeting() {
  if (journey.messages.length > 0) {
    return
  }
  appendMessage('assistant', t('chat.pathEntryPrompt'))
  goalSelectActive.value = false
  quizActive.value = false
  activeQuestion.value = null
}

async function syncConversationPath(
  path: ConversationPath,
  reason: string
) {
  const conversationId = journey.conversationId
  if (!conversationId) {
    return
  }
  // Soft-fail if path API is down; local journey path still drives UI gates.
  try {
    await candor.setConversationPath(conversationId, {
      path: toApiConversationPath(path),
      reason
    })
  } catch {
    // Keep local journey path.
  }
}

/**
 * Path B／C: advance questionnaire via core `GET /profile/questions/next` only.
 * Order (goals → basics → lab_report) is owned by core — no client placeholder reorder.
 */
async function syncQuestionnaireFromBackend() {
  if (!pathContractEnabled.value || !pathRequiresBasicProfile(conversationPath.value)) {
    return
  }
  if (pathCAwaitingUpload.value || goalSelectActive.value || pending.value || readonly.value || escalated.value) {
    return
  }
  if (!journey.conversationId) {
    return
  }

  const lastMessage = journey.messages[journey.messages.length - 1]
  const userFollowsAsk = basicQuestionFollowsUserTurn(lastMessage?.role)
  const last = [...journey.messages].reverse().find(m => m.role === 'assistant')
  if (!userFollowsAsk && last?.profileQuestion) {
    quizActive.value = true
    return
  }
  if (!userFollowsAsk && last?.replyActions && isUsableReplyActions(last.replyActions)) {
    const hasOpenAsk = last.replyActions.actions.some((action) => {
      if (action.type === 'ask_vitals' || action.type === 'ask_goal' || action.type === 'ask_report') {
        return true
      }
      if (action.type !== 'choose_option') {
        return false
      }
      const payload = chooseOptionPayload(action)
      return payload.kind === 'consultation_goals'
        || payload.kind === 'lab_report'
        || payload.kind === 'profile'
        || Boolean(payload.gap_code)
    })
    if (hasOpenAsk) {
      return
    }
  }

  try {
    const next = await candor.nextProfileQuestion(
      journey.reportId,
      journey.conversationId
    )
    if (next && !next.done) {
      if (isConsultationGoalOptions(next.options ?? undefined, 'consultation_goals') || next.gap_code === 'goals') {
        goalOptions.value = next.options ?? goalOptions.value
        goalSelectActive.value = (next.options?.length ?? 0) >= 2
        return
      }
      paintLocalProfileQuestion(next)
    }
  } catch {
    // Core drives questionnaire; no client fallback prompts.
  }
}

function vitalGapField(gap: string): VitalsField | null {
  if (gap === 'age' || gap === 'age_years') {
    return 'age'
  }
  if (gap === 'height' || gap === 'height_cm') {
    return 'height'
  }
  if (gap === 'weight' || gap === 'weight_kg') {
    return 'weight'
  }
  return null
}

function askVitalsReplyActions(field: VitalsField): ReplyActions {
  return {
    schema_version: '0.1',
    source: 'path_contract_client',
    adaptor: 'fake',
    degraded: false,
    error: null,
    actions: [
      {
        type: 'ask_vitals',
        payload: { fields: [field], gap_code: field }
      }
    ]
  }
}

function messageHasRequiredBasicAsk(message: ChatMessage | undefined): boolean {
  if (!message) {
    return false
  }
  if (message.profileQuestion && isRequiredBasicGapCode(message.profileQuestion.gap_code)) {
    return true
  }
  const actions = message.replyActions
  if (!actions || !isUsableReplyActions(actions)) {
    return false
  }
  return actions.actions.some((action) => {
    if (action.type === 'ask_vitals') {
      return true
    }
    if (action.type !== 'choose_option') {
      return false
    }
    return isRequiredBasicGapCode(chooseOptionPayload(action).gap_code)
  })
}

/**
 * Host for the next basic question.
 * After a direct upload the latest turn is the user file bubble; appending
 * the prompt onto the previous assistant message cuts the question off.
 */
function placeBasicQuestionBubble(prompt: string): ChatMessage | null {
  const lastAssistant = [...journey.messages].reverse().find(m => m.role === 'assistant')
  if (!lastAssistant) {
    return null
  }
  const last = journey.messages[journey.messages.length - 1]
  if (!basicQuestionFollowsUserTurn(last?.role)) {
    return lastAssistant
  }
  const existing = messageText(lastAssistant)
  const peeled = peelAppendedPrompt(existing, prompt)
  if (peeled) {
    setMessageText(lastAssistant.id, peeled)
    if (lastAssistant.profileQuestion && isRequiredBasicGapCode(lastAssistant.profileQuestion.gap_code)) {
      lastAssistant.profileQuestion = null
      lastAssistant.turnType = 'message'
      lastAssistant.options = []
    }
    return appendMessage('assistant', prompt)
  }
  if (prompt && existing.trim() === prompt.trim()) {
    return lastAssistant
  }
  if (prompt && existing.includes(prompt) && messageHasRequiredBasicAsk(lastAssistant)) {
    return lastAssistant
  }
  return appendMessage('assistant', prompt)
}

function paintLocalProfileQuestion(next: Extract<ProfileNext, { done: false }>) {
  const host = placeBasicQuestionBubble(next.prompt || '')
  if (!host) {
    return
  }
  const answerType = next.answer_type
  const vitalField = vitalGapField(next.gap_code)
  // Int vitals keep ask_vitals. Clearing reply_actions here dropped the height card
  // after a direct upload (question text spliced onto the upload invite, no input).
  if (!next.options?.length && vitalField) {
    host.turnType = 'message'
    host.profileQuestion = null
    host.options = []
    host.replyActions = askVitalsReplyActions(vitalField)
    quizActive.value = false
    activeQuestion.value = null
    goalSelectActive.value = false
  } else {
    host.turnType = 'profile'
    host.profileQuestion = {
      gap_code: next.gap_code,
      answer_type: answerType
    }
    host.options = next.options ?? []
    // Prefer reply_actions choose_option so chips render even when history／stream
    // left a covering offer_recommend／none column on the same bubble.
    if (next.options?.length) {
      host.replyActions = {
        schema_version: '0.1',
        source: 'path_contract_client',
        adaptor: 'fake',
        degraded: false,
        error: null,
        actions: [
          {
            type: 'choose_option',
            payload: {
              kind: 'profile',
              gap_code: next.gap_code,
              answer_type: answerType,
              mode: answerType === 'multi_enum' ? 'multi' : 'single',
              options: next.options,
              confirm: answerType === 'multi_enum'
            }
          }
        ]
      }
    } else {
      host.replyActions = undefined
    }
    activeQuestion.value = {
      done: false,
      gap_code: next.gap_code,
      prompt: next.prompt || '',
      answer_type: answerType,
      options: next.options ?? []
    }
    quizActive.value = true
    goalSelectActive.value = false
  }
  if (next.gap_code && !profileGaps.value.includes(next.gap_code)) {
    profileGaps.value = [...profileGaps.value, next.gap_code]
  }
  if (next.prompt) {
    const existing = messageText(host)
    if (!existing.includes(next.prompt)) {
      setMessageText(host.id, existing ? `${existing}\n\n${next.prompt}` : next.prompt)
    }
  }
}

async function selectConversationPath(path: ConversationPath, reason = 'entry') {
  if (!pathContractEnabled.value || pending.value || readonly.value) {
    return
  }
  conversationPath.value = path
  pathCAwaitingUpload.value = path === 'C' && !journey.reportId

  // Entry choice: create with path (do not POST …/path — B→A is rejected).
  if (reason === 'entry' && !journey.conversationId) {
    pending.value = true
    try {
      await createConversationWithPath(path)
    } catch {
      conversationPath.value = null
      pathCAwaitingUpload.value = false
      appendMessage('assistant', t('chat.conversationError'))
      pending.value = false
      return
    }
    pending.value = false
  } else if (reason !== 'entry') {
    await syncConversationPath(path, reason)
    if (reason === 'guide_switch') {
      clearPathRuleGuideCtas()
    }
  }

  // Flow v2：A／B／C 選完路徑後不再附加本地路徑專屬句；開場白僅用 core greeting.consult。

  if (path === 'C' && !journey.reportId) {
    goalSelectActive.value = false
    quizActive.value = false
    activeQuestion.value = null
    return
  }

  // Entry A／B: option label already appended as a user turn — send it like a
  // typed message so core replies (B: goals in stream). Do not GET next for goals.
  if (reason === 'entry' && (path === 'A' || path === 'B')) {
    goalSelectActive.value = false
    quizActive.value = false
    activeQuestion.value = null
    const lastUser = [...journey.messages].reverse().find(message => message.role === 'user')
    if (lastUser) {
      pendingUserContent.value = messageText(lastUser)
      await streamPending()
    }
    return
  }

  if (path === 'A') {
    goalSelectActive.value = false
    quizActive.value = false
    activeQuestion.value = null
    return
  }

  // Path B／C（已綁報告或 guide）：問卷順序由 core 驅動（先 goals）。
  if (goalOptions.value.length >= 2) {
    goalSelectActive.value = true
  } else {
    await syncQuestionnaireFromBackend()
  }

  // A→B guide CTA: basics／goals may already be done — must stream so consult continues
  // (otherwise the chat looks stuck after path switch with no follow-up turn).
  if (reason === 'guide_switch' && path === 'B' && !quizActive.value && !goalSelectActive.value) {
    const lastUser = [...journey.messages].reverse().find(message => message.role === 'user')
    pendingUserContent.value = lastUser
      ? messageText(lastUser)
      : t('chat.pathSwitchToConsult')
    await streamPending()
  }
}

/**
 * Create conversation with entry path; replace local 進站 greeting with core greeting.
 */
async function createConversationWithPath(path: ConversationPath) {
  await auth.ensureSession()
  applyPackageFromQuery()
  const packageCode = selectedPackageCodeFromQuery.value
    ?? journey.selectedPackageCode
    ?? undefined
  const created = await candor.createConversation({
    path: toApiConversationPath(path),
    ...(packageCode ? { package_plan_code: packageCode } : {})
  })
  journey.conversationId = created.id
  if (created.package_plan) {
    selectedPackage.value = created.package_plan
    packageConfirmed.value = created.package_plan.confirmed
  }
  const normalized = normalizeConversationPath(created.path) ?? path
  conversationPath.value = normalized
  pathCAwaitingUpload.value = normalized === 'C' && !created.report_id

  const userTurns = journey.messages.filter(message => message.role === 'user')
  const greeting = makeMessage(
    'assistant',
    created.greeting.content,
    created.greeting.message_id || 'greet'
  )
  const greetingRa = parseReplyActions(created.greeting.reply_actions)
  if (greetingRa) {
    greeting.replyActions = greetingRa
  }
  // User path chip first, then core greeting（開場白在選項下方）.
  journey.messages = [...userTurns, greeting]
  if (greetingRa) {
    applyReplyActionsInteraction(greeting, greetingRa)
  }
  if (created.flow_prompt) {
    appendCoreAssistantTurn(created.flow_prompt)
    if (created.flow_prompt.options?.length) {
      goalOptions.value = created.flow_prompt.options
    }
  }

  goalOptions.value = created.greeting.options?.length
    ? created.greeting.options
    : goalOptions.value
  selectedCodes.value = [...(created.greeting.selected ?? [])]
  postQuizGuided.value = false
  profileGaps.value = []
  reportResults.value = []
  journey.reportDockOpen = false
  journey.reportDockCollapsed = false
  goalSelectActive.value = false
  quizActive.value = false
  activeQuestion.value = null
}

async function promotePathToCOnUpload() {
  if (!pathContractEnabled.value) {
    return
  }
  const next = pathAfterReportUpload(conversationPath.value)
  const changed = conversationPath.value !== next
  conversationPath.value = next
  pathCAwaitingUpload.value = false
  if (changed) {
    await syncConversationPath(next, 'upload_promote')
  }
}

function applyTurnLimitPayload(input: {
  prompt: string
  reply_actions?: ReplyActions | null
}) {
  const msg = appendMessage('assistant', input.prompt)
  const ra = parseReplyActions(input.reply_actions)
  if (ra) {
    msg.replyActions = ra
    applyReplyActionsInteraction(msg, ra)
  }
}

async function ensureConversation() {
  if (journey.conversationId) {
    return journey.conversationId
  }

  // Path contract: wait for 進站三選 — do not create with default b.
  if (pathContractEnabled.value && !isStandardFlow.value && conversationPath.value == null) {
    ensureLocalPathEntryGreeting()
    throw new Error('path_entry_pending')
  }

  await auth.ensureSession()
  applyPackageFromQuery()
  const packageCode = selectedPackageCodeFromQuery.value
    ?? journey.selectedPackageCode
    ?? undefined
  const pathForCreate = conversationPath.value
  const created = await candor.createConversation({
    ...(packageCode ? { package_plan_code: packageCode } : {}),
    ...(pathForCreate ? { path: toApiConversationPath(pathForCreate) } : {})
  })
  journey.conversationId = created.id
  if (created.package_plan) {
    selectedPackage.value = created.package_plan
    packageConfirmed.value = created.package_plan.confirmed
  }
  const hydratedPath = normalizeConversationPath(created.path)
  if (pathContractEnabled.value && hydratedPath) {
    conversationPath.value = hydratedPath
    pathCAwaitingUpload.value = hydratedPath === 'C' && !created.report_id
  }
  postQuizGuided.value = false
  profileGaps.value = []
  reportResults.value = []
  journey.reportDockOpen = false
  journey.reportDockCollapsed = false
  if (journey.messages.length === 0) {
    const greeting = makeMessage(
      'assistant',
      created.greeting.content,
      created.greeting.message_id || 'greet'
    )
    const greetingRa = parseReplyActions(created.greeting.reply_actions)
    if (greetingRa) {
      greeting.replyActions = greetingRa
    }
    journey.messages.push(greeting)
    if (greetingRa) {
      applyReplyActionsInteraction(greeting, greetingRa)
    }
    if (created.flow_prompt) {
      appendCoreAssistantTurn(created.flow_prompt)
    }
  }
  goalOptions.value = created.greeting.options?.length
    ? created.greeting.options
    : (created.flow_prompt?.options ?? goalOptions.value)
  selectedCodes.value = [...(created.greeting.selected ?? [])]
  goalSelectActive.value = !(pathContractEnabled.value && !isStandardFlow.value
    && conversationPath.value == null)
  quizActive.value = false
  activeQuestion.value = null

  // Path C awaiting upload: questionnaire starts after attach `flow_prompt`.
  if (pathRequiresBasicProfile(conversationPath.value) && !pathCAwaitingUpload.value) {
    void syncQuestionnaireFromBackend()
  }

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
  // Report 必問：只在 usable ask_report（或 reportAskActive）時補上傳引導文案；
  // 不再靠 legacy upload_offer／checkupOffer。
  if (!journey.hasAnalysis && !reportAskActive.value && !hasAskReportAction(last?.replyActions)) {
    return
  }
  const text = journey.hasAnalysis
    ? t('chat.guideRecommendAfterQuiz')
    : t('chat.guideUploadAfterQuiz')
  if (last) {
    const existing = messageText(last)
    setMessageText(last.id, existing ? `${existing}\n\n${text}` : text)
    return
  }
  appendMessage('assistant', text)
}

/**
 * Prefer server history (with reply_actions) over local journey transcript after reload.
 * On 405/404/network errors keep local messages (already normalized on journey.hydrate).
 */
async function hydrateConversationHistory(conversationId: string) {
  if (!conversationId || readonly.value) {
    return
  }
  try {
    const payload = await candor.getConversationMessages(conversationId)
    const parsed = parseConversationMessagesResult(payload)
    if (parsed.messages.length === 0) {
      return
    }
    const mapped = parsed.messages.map(historyMessageToChatMessage)
    journey.messages.splice(0, journey.messages.length, ...mapped)
    for (const message of mapped) {
      applyPathRuleCopy(message)
    }

    // Prefer *open* required-gap CTA host (may be behind a stream turn that only
    // has offer_recommend); ignore answered profile choose_option left on bank.
    const gapHost = findGapCtaHostMessage(mapped, { openProfileGaps: profileGaps.value })
    const lastAssistant = [...mapped].reverse().find(m => m.role === 'assistant')
    const ctaHost = gapHost
      ?? (lastAssistant && isUsableReplyActions(lastAssistant.replyActions)
        ? lastAssistant
        : undefined)
    if (ctaHost?.replyActions) {
      applyReplyActionsInteraction(ctaHost, ctaHost.replyActions)
      const override = turnActionsFor(ctaHost).checkupUrlOverride
      if (override) {
        resolvedCheckupUrl.value = override
      }
    } else if (lastAssistant?.checkupOffer) {
      // Legacy checkup URL may arrive only via client-config; offer flag still paints CTA.
    }
    if (lastAssistant?.profileGaps?.length) {
      profileGaps.value = [...lastAssistant.profileGaps]
    }
  } catch {
    // History endpoint may not be deployed yet (405) — local journey is fallback.
  }
}

function applyReplyActionsInteraction(message: ChatMessage, replyActions: ReplyActions) {
  const visibility = buildTurnActionsVisibility({
    message: { ...message, replyActions },
    ctx: turnUiContext.value,
    intake: message,
    goalOptions: goalOptions.value,
    needsMultiConfirm: true,
    expertReviewStatus: journey.expertReviewStatus,
    flow: isStandardFlow.value ? 'standard' : undefined
  })
  const projection = visibility.replyProjection
  if (!projection) {
    // Intentional none / degraded: clear required-ask flags; no legacy CTAs.
    if (hasReplyActionsColumn(replyActions) && !isUsableReplyActions(replyActions)) {
      reportAskActive.value = false
    }
    return
  }

  // Report 必問（對齊 goal／core #100）：ask_report 或 choose_option.kind=lab_report。
  reportAskActive.value = hasReportRequiredAsk(replyActions)

  const choose = projection.chooseOption
  if (choose?.kind === 'consultation_goals' || projection.askGoal) {
    goalSelectActive.value = true
    const opts = visibility.choices.length ? visibility.choices : (choose?.options ?? [])
    if (opts.length) {
      goalOptions.value = opts
      message.options = opts
    }
    quizActive.value = false
    activeQuestion.value = null
    return
  }

  // kind=lab_report（core #100，同 ask_goal 模式）：必問、不進 gap host。
  // Enum chips 仍可帶 gap_code → POST /profile/answers（過渡／答案管道）。
  if (choose?.kind === 'lab_report') {
    goalSelectActive.value = false
    reportAskActive.value = true
    if (choose.gap_code && choose.options?.length) {
      const answerType = (choose.answer_type || 'enum') as ProfileAnswerType
      message.turnType = 'profile'
      message.profileQuestion = {
        gap_code: choose.gap_code,
        answer_type: answerType
      }
      message.options = choose.options
      activeQuestion.value = {
        done: false,
        gap_code: choose.gap_code,
        prompt: '',
        answer_type: answerType,
        options: choose.options
      }
      quizActive.value = true
      return
    }
    if (choose.options?.length) {
      message.options = choose.options
      message.turnType = 'message'
      message.profileQuestion = null
    }
    quizActive.value = false
    activeQuestion.value = null
    return
  }

  // Profile chips (incl. transitional gap_code=lab_report → POST /profile/answers).
  if (choose?.kind === 'profile' && choose.gap_code) {
    const answerType = (choose.answer_type || 'enum') as ProfileAnswerType
    message.turnType = 'profile'
    message.profileQuestion = {
      gap_code: choose.gap_code,
      answer_type: answerType
    }
    message.options = choose.options ?? []
    activeQuestion.value = {
      done: false,
      gap_code: choose.gap_code,
      prompt: '',
      answer_type: answerType,
      options: choose.options ?? []
    }
    quizActive.value = true
    goalSelectActive.value = false
    if (choose.gap_code === 'lab_report') {
      reportAskActive.value = true
    }
    return
  }

  // LabFollowup dual chips (maps_to) — not a profile gap; click routes in onChoice.
  if (choose?.kind === 'lab_followup' && choose.options?.length) {
    message.options = choose.options
    message.turnType = 'message'
    message.profileQuestion = null
    quizActive.value = false
    activeQuestion.value = null
    goalSelectActive.value = false
    reportAskActive.value = true
    if (!checkupUrlLoaded.value) {
      void loadCheckupLinkUrl()
    }
    return
  }

  if (choose?.kind === 'path_switch' && choose.options?.length) {
    message.options = choose.options
    message.turnType = 'message'
    message.profileQuestion = null
    quizActive.value = false
    activeQuestion.value = null
    goalSelectActive.value = false
    return
  }

  if (choose?.kind === 'free' && choose.options?.length) {
    message.options = choose.options
    quizActive.value = false
    activeQuestion.value = null
    return
  }

  // ask_vitals / offer_* only: clear legacy quiz / goal selection state.
  if (visibility.vitalsFields.length > 0 || visibility.fromReplyActions) {
    quizActive.value = false
    activeQuestion.value = null
    goalSelectActive.value = false
  }
}

function applyStreamMeta(assistantId: string, result: {
  message_id?: string
  options?: ChatMessage['options']
  options_kind?: string | null
  turn: { type: string }
  profile_question: ChatMessage['profileQuestion']
  profile_gaps: string[]
  upload_offer?: boolean
  checkup_offer?: boolean
  checkup_suggest?: string | null
  individual_tests_url?: string | null
  reply_actions?: ReplyActions | null
}): string {
  const message = journey.messages.find(item => item.id === assistantId)
  const usableRa = isUsableReplyActions(result.reply_actions)
  const raColumn = hasReplyActionsColumn(result.reply_actions)
  if (message) {
    const serverId = typeof result.message_id === 'string' ? result.message_id.trim() : ''
    if (serverId && message.id !== serverId) {
      message.id = serverId
    }
    message.options = result.options ?? []
    message.turnType = result.turn.type as ChatMessage['turnType']
    message.profileQuestion = result.profile_question ?? null
    message.profileGaps = result.profile_gaps
    if (result.reply_actions) {
      message.replyActions = result.reply_actions
    }
    // Never dual-write legacy upload_offer / checkupOffer onto the bubble.
    // Cache checkup URL from stream meta when present (dock / offer_checkup).
    const url = String(result.individual_tests_url || '').trim()
    if (url) {
      resolvedCheckupUrl.value = url
      checkupUrlLoaded.value = true
    } else if (!raColumn) {
      applyCheckupOffer(message, result)
    }
  }
  profileGaps.value = result.profile_gaps
  selectedCodes.value = []

  if (message && raColumn) {
    applyReplyActionsInteraction(message, result.reply_actions!)
    applyPathRuleCopy(message)
    if (usableRa) {
      const override = turnActionsFor(message).checkupUrlOverride
      if (override) {
        resolvedCheckupUrl.value = override
      }
    }
    return message.id
  }

  applyPathRuleCopy(message)

  if (result.turn.type === 'profile' && result.profile_question) {
    activeQuestion.value = {
      done: false,
      gap_code: result.profile_question.gap_code,
      prompt: '',
      answer_type: result.profile_question.answer_type as ProfileAnswerType,
      options: result.options ?? []
    }
    quizActive.value = true
    if (result.profile_question.gap_code === 'lab_report') {
      reportAskActive.value = true
    }
  } else {
    activeQuestion.value = null
    quizActive.value = false
    if (isConsultationGoalOptions(result.options, result.options_kind)) {
      goalSelectActive.value = true
      goalOptions.value = result.options ?? []
    }
  }

  return message?.id ?? assistantId
}

/** Re-run CTA projection after stream `pending` clears (matches hydrate path). */
function reapplyTurnActionsAfterStream(lookupId: string) {
  const message = journey.messages.find(item => item.id === lookupId)
  if (!message?.replyActions || !hasReplyActionsColumn(message.replyActions)) {
    return
  }
  applyReplyActionsInteraction(message, message.replyActions)
  applyPathRuleCopy(message)
  if (isUsableReplyActions(message.replyActions)) {
    const override = turnActionsFor(message).checkupUrlOverride
    if (override) {
      resolvedCheckupUrl.value = override
    }
  }
}

/**
 * After POST /profile/answers (or goals), advance via chat stream so the next
 * required-gap CTA comes from message.reply_actions (hybrid §6).
 *
 * Do **not** short-circuit with a local `next_question` bank bubble: that path
 * never attaches reply_actions, so usable choose_option / ask_vitals (AskVitalsCard)
 * never appear. Clicking those CTAs still POSTs /profile/answers.
 *
 * When core already banked an *open* gap CTA on history, re-hydrate and skip
 * the follow-up stream — an unconditional stream often returns only
 * offer_recommend and would cover ask_vitals / choose_option on the prior turn.
 *
 * Do **not** skip when `next_question.done` or when hydrate still shows an
 * already-answered choose_option (e.g. lab_report=none): core may leave the
 * bank turn unchanged while profile_gaps is empty — skipping would lock chips.
 */
async function continueAfterSavedAnswer(opts: {
  profileGaps: string[]
  nextQuestion?: ProfileNext | null
  pendingContent: string
}) {
  profileGaps.value = opts.profileGaps
  const next = opts.nextQuestion
  if (next && !next.done && next.gap_code && !profileGaps.value.includes(next.gap_code)) {
    profileGaps.value = [...profileGaps.value, next.gap_code]
  }
  clearLastAssistantOptions()
  selectedCodes.value = []
  quizActive.value = false
  activeQuestion.value = null

  const conversationId = journey.conversationId
  if (conversationId) {
    await hydrateConversationHistory(conversationId)
  }
  // answers bank may omit the user turn when next was already done; restore optimistic bubble.
  restorePendingUserIfMissing(opts.pendingContent)
  if (next && !next.done) {
    paintLocalProfileQuestion(next)
    pending.value = false
    if (next.options?.length || next.answer_type === 'int' || next.answer_type === 'text') {
      return
    }
  }
  if (shouldSkipFollowUpStream({
    nextQuestionDone: next?.done === true,
    openProfileGaps: profileGaps.value,
    messages: journey.messages
  })) {
    pending.value = false
    return
  }

  pendingUserContent.value = opts.pendingContent
  await streamPending()
}

/** Re-attach the just-sent user text if hydrate replaced the transcript without it. */
function restorePendingUserIfMissing(pendingContent: string) {
  const text = pendingContent.trim()
  if (!text) {
    return
  }
  const lastUser = [...journey.messages].reverse().find(message => message.role === 'user')
  if (lastUser && messageText(lastUser).trim() === text) {
    return
  }
  appendMessage('user', text)
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
  let streamMessageLookupId: string = assistantId
  let streamed = ''
  let liveCreated = false

  /** Keep the thinking row (… animation) until the first token arrives. */
  const ensureLiveAssistant = () => {
    if (liveCreated) {
      return
    }
    liveCreated = true
    journey.messages.push(makeMessage('assistant', '', assistantId))
    liveAssistantId.value = assistantId
  }

  try {
    const conversationId = await ensureConversation()

    const result = await candor.streamMessage(conversationId, content, {
      onDelta: (chunk) => {
        ensureLiveAssistant()
        streamed += chunk
        setMessageText(assistantId, streamed)
      },
      onReplace: (text) => {
        // Avoid redraw flicker when done content matches what was already streamed.
        if (text === streamed) {
          return
        }
        ensureLiveAssistant()
        streamed = text
        setMessageText(assistantId, streamed)
      }
    }, intent)

    // Empty / meta-only replies still need a host bubble for CTAs.
    ensureLiveAssistant()
    streamMessageLookupId = applyStreamMeta(assistantId, result)
    // Interpret 外連改吃 stream reply_actions offer_checkup（#20）；勿 FE 硬設 wantMoreTestsOffer.
    if (intent === 'interpret' && !checkupUrlLoaded.value) {
      void loadCheckupLinkUrl()
    }
    if (journey.hasAnalysis && reportResults.value.length > 0) {
      openReportDock({ expand: false })
    }
    guideAfterQuiz()
    // Path B／C: if stream did not surface required basics, try one follow-up collect.
    // Avoid re-entrancy while another ensure is already painting／streaming.
    if (pathRequiresBasicProfile(conversationPath.value)
      && !isBasicProfileComplete(profileGaps.value)
      && !quizActive.value) {
      void syncQuestionnaireFromBackend()
    }
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
    await nextTick()
    reapplyTurnActionsAfterStream(streamMessageLookupId)
  }
}

async function runProfileThenStream() {
  if (!pendingUserContent.value) {
    const lastUser = [...journey.messages].reverse().find(message => message.role === 'user')
    pendingUserContent.value = lastUser ? messageText(lastUser) : '開始'
  }
  await streamPending()
}

async function onVitalsSubmit(values: Partial<Record<VitalsField, number>>) {
  if (pending.value || readonly.value || escalated.value) {
    return
  }
  // Prefer the latest bubble when it is the one showing the vitals card
  // (age correction while an older gap is still open).
  const latestAssistant = [...journey.messages].reverse().find(m => m.role === 'assistant')
  const submittedField = (Object.keys(values) as VitalsField[]).find(field => values[field] != null)
  const latestShowsField = Boolean(
    latestAssistant
    && submittedField
    && turnActionsFor(latestAssistant).vitalsFields.includes(submittedField)
  )
  const host = latestShowsField
    ? latestAssistant
    : findGapCtaHostMessage(journey.messages, { openProfileGaps: profileGaps.value })
      ?? latestAssistant
  if (!host) {
    return
  }
  const actions = turnActionsFor(host)
  const fields = actions.vitalsFields
  if (!fields.length) {
    return
  }
  // One card / one field per confirm (sequential when fields.length > 1).
  const field = fields.find(f => values[f] != null) ?? fields[0]
  if (!field) {
    return
  }
  const n = values[field]
  if (n == null || !Number.isInteger(n)) {
    return
  }
  // User bubble: bare integer (unit stays on the card, not in payload).
  const display = String(n)
  const remaining = fields.filter(f => f !== field)
  const gapCode = vitalsGapCodeForField(field, fields, actions.vitalsGapCode)

  appendMessage('user', display)
  pending.value = true
  try {
    const conversationId = await ensureConversation()
    const result = await candor.submitProfileAnswer({
      gap_code: gapCode,
      value: n,
      conversation_id: conversationId
    })

    // Advance local multi-field queue, or clear ask_vitals when done.
    if (host.replyActions) {
      if (remaining.length > 0) {
        host.replyActions = {
          ...host.replyActions,
          actions: host.replyActions.actions.map((action) => {
            if (action.type !== 'ask_vitals') {
              return action
            }
            const payload = (action.payload && typeof action.payload === 'object')
              ? { ...action.payload as Record<string, unknown> }
              : {}
            return {
              ...action,
              payload: {
                ...payload,
                fields: remaining,
                // After first field, subsequent posts use field id as gap_code.
                gap_code: null
              }
            }
          })
        }
      } else {
        host.replyActions = {
          ...host.replyActions,
          actions: host.replyActions.actions.filter(a => a.type !== 'ask_vitals')
        }
      }
    }

    if (result.saved) {
      if (remaining.length > 0) {
        // Stay on this turn for the next vitals field; do not jump to stream yet.
        pending.value = false
        return
      }
      await continueAfterSavedAnswer({
        profileGaps: result.profile_gaps,
        nextQuestion: result.next_question,
        pendingContent: display
      })
      return
    }
    appendMessage('assistant', result.prompt)
    pending.value = false
  } catch {
    appendMessage('assistant', t('chat.streamError'))
    pending.value = false
  }
}

async function sendText(text: string) {
  const content = text.trim()
  if (!content || pending.value || readonly.value || escalated.value) {
    return
  }
  if (pathEntryPending.value) {
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
      if ('turn_limit' in result && result.turn_limit === true) {
        applyTurnLimitPayload({
          prompt: result.prompt,
          reply_actions: result.reply_actions
        })
        pending.value = false
        return
      }
      const clarification = result as ProfileAnswerNeedsClarification
      appendMessage('assistant', clarification.prompt)
      const last = [...journey.messages].reverse().find(message => message.role === 'assistant')
      if (last) {
        if (clarification.options) {
          last.options = clarification.options
          last.turnType = 'profile'
          last.profileQuestion = {
            gap_code: profile.gap_code,
            answer_type: profile.answer_type
          }
        }
        applyCheckupOffer(last, clarification)
      }
      pending.value = false
    } catch {
      appendMessage('assistant', t('chat.streamError'))
      pending.value = false
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

/**
 * LabFollowup FE continue CTA — stream core copy「繼續健康諮詢」so prepareTurn
 * sets continue_health_consultation same turn (spec 16 preferred path).
 */
function onContinueConsult() {
  if (pending.value || readonly.value || escalated.value) {
    return
  }
  clearLastAssistantOptions()
  return sendText(t(CONTINUE_CONSULT_I18N_KEY))
}

/** Completion／fallback continue_consultation chip: same stream path as onContinueConsult. */
function submitContinueHealthConsultationLabel(label: string) {
  if (pending.value || readonly.value || escalated.value) {
    return
  }
  clearLastAssistantOptions()
  return sendText(label)
}

function onChoice(option: GreetingOption) {
  if (pending.value) {
    return
  }

  // Path contract: 進站三選
  if (pathEntryPending.value && isConversationPath(option.code)) {
    appendMessage('user', option.label)
    void selectConversationPath(option.code, 'entry')
    return
  }

  if (isPathSwitchChoice(option)) {
    appendMessage('user', option.label)
    const code = option.code.trim().toLowerCase()
    if (code === 'a') {
      void selectConversationPath('A', 'guide_switch')
    } else if (code === 'b') {
      void selectConversationPath('B', 'guide_switch')
    }
    return
  }

  const intake = intakeMessage.value
  if (intake && isContinueConsultationOption(intake.replyActions, option.code)) {
    return submitContinueHealthConsultationLabel(option.label)
  }

  // LabFollowup maps_to: upload UI or checkup外連 — never POST /profile/answers (#22).
  const mapsTo = normalizeChooseOptionMapsTo(option.maps_to)
  if (mapsTo === 'ask_report') {
    clearLastAssistantOptions()
    openAttachMenu()
    return
  }
  if (mapsTo === 'offer_checkup') {
    clearLastAssistantOptions()
    const url = checkupLinkUrl.value
    if (url && import.meta.client) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else if (!checkupUrlLoaded.value) {
      void loadCheckupLinkUrl()
    }
    return
  }

  if (goalSelectActive.value || lastAssistantProfile.value?.answer_type === 'multi_enum') {
    const host = intakeMessage.value
    const noneCodes = host ? exclusiveCodesFor(host) : ['none', 'none_of_above']
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
    if (selectedCodes.value.length < 1) {
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
        const last = [...journey.messages].reverse().find(message => message.role === 'assistant')
        if (last) {
          applyCheckupOffer(last, result)
        }
        pending.value = false
        return
      }
      journey.clarifyingGoals = labels
      selectedCodes.value = []
      // Clear after pending is already true so recommend CTA does not flash.
      goalSelectActive.value = false
      const nextAfterGoals = result.next_question
      const gapsAfterGoals = nextAfterGoals && !nextAfterGoals.done && nextAfterGoals.gap_code
        ? [nextAfterGoals.gap_code]
        : []
      await continueAfterSavedAnswer({
        profileGaps: gapsAfterGoals,
        nextQuestion: nextAfterGoals ?? { done: true },
        pendingContent: labels.join('、')
      })
    } catch {
      appendMessage('assistant', t('chat.streamError'))
      pending.value = false
    }
    return
  }

  if (lastAssistantProfile.value) {
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
      if ('turn_limit' in result && result.turn_limit === true) {
        applyTurnLimitPayload({
          prompt: result.prompt,
          reply_actions: result.reply_actions
        })
        pending.value = false
        return
      }
      const clarification = result as ProfileAnswerNeedsClarification
      appendMessage('assistant', clarification.prompt)
      if (clarification.options) {
        const last = [...journey.messages].reverse().find(message => message.role === 'assistant')
        if (last) {
          last.options = clarification.options
          last.turnType = 'profile'
          last.profileQuestion = {
            gap_code: profile.gap_code,
            answer_type: profile.answer_type
          }
          applyCheckupOffer(last, clarification)
        }
      } else {
        const last = [...journey.messages].reverse().find(message => message.role === 'assistant')
        if (last) {
          applyCheckupOffer(last, clarification)
        }
      }
      pending.value = false
      return
    }

    await continueAfterSavedAnswer({
      profileGaps: result.profile_gaps,
      nextQuestion: result.next_question,
      pendingContent: payload.display
    })
  } catch {
    appendMessage('assistant', t('chat.streamError'))
    pending.value = false
  }
}

function requireMemberForUpload(): boolean {
  if (!canOfferUpload.value) {
    return false
  }
  if (!auth.isMember) {
    void navigateTo(
      `${localePath('/login')}?redirect=${encodeURIComponent(route.fullPath)}&mode=login`
    )
    return false
  }
  return true
}

function closeAttachMenu() {
  attachMenuOpen.value = false
}

function openAttachMenu() {
  if (!requireMemberForUpload()) {
    return
  }
  attachMenuOpen.value = true
}

function toggleAttachMenu() {
  if (!canOfferUpload.value) {
    return
  }
  if (attachMenuOpen.value) {
    closeAttachMenu()
    return
  }
  openAttachMenu()
}

function pickPdf() {
  closeAttachMenu()
  if (!requireMemberForUpload()) {
    return
  }
  pdfInput.value?.click()
}

function pickImagesFromMenu() {
  closeAttachMenu()
  openPhotoTray()
}

function openPhotoTray() {
  if (!requireMemberForUpload()) {
    return
  }
  photoTrayOpen.value = true
  photoTrayError.value = ''
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!attachMenuOpen.value) {
    return
  }
  const root = attachMenuRoot.value
  const target = event.target
  if (!(target instanceof Node) || !root?.contains(target)) {
    closeAttachMenu()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
})

function revokePhotoPreview(url: string) {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

function closePhotoTray() {
  for (const entry of photoTrayEntries.value) {
    revokePhotoPreview(entry.previewUrl)
  }
  photoTrayEntries.value = []
  photoTrayOpen.value = false
  photoTrayBusy.value = false
  photoTrayError.value = ''
}

function pickCamera() {
  if (photoTrayBusy.value || photoTrayEntries.value.length >= REPORT_IMAGE_MAX_COUNT) {
    photoTrayError.value = t('chat.photoTrayFull')
    return
  }
  cameraInput.value?.click()
}

function pickGallery() {
  if (photoTrayBusy.value || photoTrayEntries.value.length >= REPORT_IMAGE_MAX_COUNT) {
    photoTrayError.value = t('chat.photoTrayFull')
    return
  }
  galleryInput.value?.click()
}

function removePhotoTrayItem(id: string) {
  const entry = photoTrayEntries.value.find(item => item.id === id)
  if (entry) {
    revokePhotoPreview(entry.previewUrl)
  }
  photoTrayEntries.value = photoTrayEntries.value.filter(item => item.id !== id)
}

async function appendPhotoFiles(files: File[]) {
  if (files.length === 0) {
    return
  }
  const remaining = REPORT_IMAGE_MAX_COUNT - photoTrayEntries.value.length
  if (remaining <= 0) {
    photoTrayError.value = t('chat.photoTrayFull')
    return
  }

  let trimmed = false
  const selected = files.slice(0, remaining)
  if (files.length > remaining) {
    trimmed = true
  }

  let decodeFailed = false
  const accepted: PhotoTrayEntry[] = []
  for (const file of selected) {
    const loaded = await tryLoadImageFile(file)
    if (!loaded) {
      decodeFailed = true
      continue
    }
    accepted.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      previewUrl: URL.createObjectURL(loaded),
      name: loaded.name || 'photo.jpg',
      file: loaded
    })
  }

  if (accepted.length > 0) {
    photoTrayEntries.value = [...photoTrayEntries.value, ...accepted]
  }

  if (decodeFailed) {
    photoTrayError.value = t('chat.photoTrayDecodeFailed')
  } else if (trimmed) {
    photoTrayError.value = t('chat.photoTrayTrimmed', { n: accepted.length })
  } else {
    photoTrayError.value = ''
  }
}

async function onCameraFile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) {
    return
  }
  await appendPhotoFiles([file])
}

async function onGalleryFiles(event: Event) {
  const target = event.target as HTMLInputElement
  const list = target.files ? Array.from(target.files) : []
  target.value = ''
  await appendPhotoFiles(list)
}

async function confirmPhotoTray() {
  if (photoTrayBusy.value || reportInFlight.value) {
    return
  }
  if (photoTrayEntries.value.length === 0) {
    photoTrayError.value = t('chat.photoTrayNeedOne')
    return
  }

  photoTrayBusy.value = true
  photoTrayError.value = ''

  let compressed: File[]
  try {
    compressed = await compressReportImages(photoTrayEntries.value.map(entry => entry.file))
  } catch (error) {
    photoTrayBusy.value = false
    if (error instanceof CompressReportImagesError && error.code === 'still_too_large') {
      photoTrayError.value = t('chat.photoTrayTooLarge')
      return
    }
    if (error instanceof CompressReportImagesError && error.code === 'decode_failed') {
      photoTrayError.value = t('chat.photoTrayDecodeFailed')
      return
    }
    photoTrayError.value = t('chat.streamError')
    return
  }

  const count = compressed.length
  closePhotoTray()
  appendMessage('user', t('chat.uploadedPhotos', { n: count }))
  reportInFlight.value = true
  reportPollStatus.value = 'uploaded'
  reportRetryId.value = null

  try {
    await ensureConversation()
    const uploaded = await candor.uploadHealthReportFiles(compressed)
    journey.reportId = uploaded.id
    reportPollStatus.value = uploaded.status || 'uploaded'
    await promotePathToCOnUpload()

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
  let attachAck: Awaited<ReturnType<typeof candor.attachReport>> | null = null
  for (let attempt = 0; attempt < 8 && !attached; attempt++) {
    try {
      attachAck = await candor.attachReport(conversationId, reportId)
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

  journey.reportId = reportId
  journey.hasAnalysis = true
  reportAskActive.value = false
  journey.reportInterpretSent = false
  reportRetryId.value = null
  reportPollStatus.value = null
  openReportDock()

  const hydratedPath = attachAck ? normalizeConversationPath(attachAck.path) : null
  if (hydratedPath) {
    conversationPath.value = hydratedPath
  }
  pathCAwaitingUpload.value = false

  if (attachAck?.flow_prompt) {
    appendCoreAssistantTurn(attachAck.flow_prompt)
    if (attachAck.flow_prompt.options?.length) {
      goalOptions.value = attachAck.flow_prompt.options
    }
    if ((attachAck.flow_prompt.options?.length ?? 0) >= 2
      || attachAck.flow_prompt.options_kind === 'consultation_goals') {
      goalSelectActive.value = true
    } else {
      void syncQuestionnaireFromBackend()
    }
    return
  }

  const keepGoals = goalSelectActive.value
  const keepProfile = lastAssistantProfile.value !== null
  const lastAssistant = [...journey.messages].reverse().find(m => m.role === 'assistant')
  const keepRequiredAsk = messageHasRequiredBasicAsk(lastAssistant)
  const gapsRemain = profileGaps.value.length > 0

  if (!keepGoals && !keepProfile && !keepRequiredAsk && gapsRemain && !readonly.value && !escalated.value) {
    pendingUserContent.value = t('chat.continueIntake')
    pendingIntent.value = null
    await streamPending()
  }
}

async function askInterpret() {
  // Mirrors reportDockBarVisibility.explainHighlightsDisabled (+ hasAnalysis).
  if (
    !journey.hasAnalysis
    || pending.value
    || readonly.value
    || escalated.value
    || Boolean(reportRetryId.value)
    || Boolean(lastAssistantProfile.value)
  ) {
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
    await promotePathToCOnUpload()

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

function clearComposingTimer() {
  if (composingTimer !== undefined) {
    clearTimeout(composingTimer)
    composingTimer = undefined
  }
}

function onCompositionStart() {
  clearComposingTimer()
  composing.value = true
}

function onCompositionEnd(event: CompositionEvent) {
  compositionEndedAt = event.timeStamp
  clearComposingTimer()
  composingTimer = setTimeout(() => {
    composing.value = false
    composingTimer = undefined
  }, IME_CONFIRM_ENTER_MS)
}

function onComposerEnter(event: KeyboardEvent) {
  const imeOwned = composing.value || event.isComposing || event.keyCode === 229
  if (shouldIgnoreComposerEnter(event, composing.value, compositionEndedAt)) {
    if (!imeOwned) {
      event.preventDefault()
    }
    return
  }
  event.preventDefault()
  onSubmit()
}

async function onSubmit() {
  const content = input.value.trim()
  input.value = ''
  focusChatInput()
  if (!content || pending.value) {
    return
  }
  if (pathEntryPending.value) {
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
        const gapsAfterGoals = nextAfterGoals && !nextAfterGoals.done && nextAfterGoals.gap_code
          ? [nextAfterGoals.gap_code]
          : []
        await continueAfterSavedAnswer({
          profileGaps: gapsAfterGoals,
          nextQuestion: nextAfterGoals ?? { done: true },
          pendingContent: content
        })
        return
      }
      appendMessage('assistant', result.prompt || t('chat.streamError'))
      if (result.options) {
        goalOptions.value = result.options
      }
      if (result.options_kind === 'consultation_goals' || result.options?.length) {
        goalSelectActive.value = true
      }
      const last = [...journey.messages].reverse().find(message => message.role === 'assistant')
      if (last) {
        applyCheckupOffer(last, result)
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

async function escalate() {
  if (readonly.value) {
    return
  }

  await auth.ensureSession()
  // Token in storage is enough (same gate as goRecommend); pinia user may lag.
  if (!auth.hasSession && !candor.readToken()) {
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

async function ensureMemberForReview(redirectPath: string) {
  await auth.ensureSession()
  if (!auth.hasSession && !candor.readToken()) {
    return navigateTo({
      path: localePath('/login'),
      query: { redirect: redirectPath }
    })
  }
  return null
}

/**
 * One-shot status sync for the active conversation (no background poll / auto-nav).
 * Health page loads the member list on enter; chat only needs this conversation.
 */
async function syncExpertReviewStatusOnce() {
  if (isStandardFlow.value || !auth.isMember) {
    return
  }
  const conversationId = journey.conversationId?.trim() ?? ''
  if (!conversationId) {
    return
  }
  try {
    const existing = await candor.getExpertReview(conversationId)
    journey.expertReviewStatus = expertReviewUiStatusFromRow(existing.status)
    if (existing.health_report_id) {
      journey.reportId = existing.health_report_id
    }
  } catch (err) {
    // GET expert-review 404 has no error_code in body (ResponseFactory::notFound).
    if (err instanceof CandorApiError
      && (err.statusCode === 404 || err.errorCode === 'not_found')) {
      journey.expertReviewStatus = 'none'
    }
  }
}

/** Submit for expert review → create case → 我的健康. Standard flow never calls this. */
async function submitExpertReview() {
  if (isStandardFlow.value || readonly.value || escalated.value) {
    return
  }

  const healthPath = localePath('/app')
  const redirected = await ensureMemberForReview(healthPath)
  if (redirected) {
    return redirected
  }

  const conversationId = journey.conversationId?.trim() ?? ''
  if (!conversationId || !auth.isMember) {
    // Guest / no conversation: keep them on health; do not create a case.
    return navigateTo(healthPath)
  }

  try {
    const review = await candor.createExpertReview(conversationId)
    journey.expertReviewStatus = expertReviewUiStatusFromRow(review.status)
    if (review.health_report_id) {
      journey.reportId = review.health_report_id
    }
  } catch (err) {
    if (err instanceof CandorApiError && err.errorCode === 'expert_review_exists') {
      try {
        const existing = await candor.getExpertReview(conversationId)
        journey.expertReviewStatus = expertReviewUiStatusFromRow(existing.status)
        if (existing.health_report_id) {
          journey.reportId = existing.health_report_id
        }
      } catch {
        journey.expertReviewStatus = 'awaiting_review'
      }
    } else {
      // Surface via navigation to health; list will show empty / user can retry.
      console.warn('submitExpertReview failed', err)
    }
  }

  return navigateTo(healthPath)
}

/** 「查看推薦方案」. Standard flow skips expert review and keeps `flow=standard` on the URL. */
async function goViewRecommend() {
  if (readonly.value || escalated.value) {
    return
  }

  const path = localePath('/app/recommendations')
  const target = isStandardFlow.value ? `${path}?flow=standard` : path
  const redirected = await ensureMemberForReview(target)
  if (redirected) {
    return redirected
  }

  if (isStandardFlow.value) {
    return navigateTo({ path, query: { flow: 'standard' } })
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

function homeGoalsAlreadySent(codes: string[]) {
  if (codes.length === 0) {
    return false
  }
  const labels = codes
    .map(code => goalOptions.value.find(option => option.code === code)?.label)
    .filter((label): label is string => Boolean(label))
  if (labels.length !== codes.length) {
    return false
  }
  return journey.messages.some((message) => {
    if (message.role !== 'user') {
      return false
    }
    const parts = messageText(message).split('、')
    return labels.every(label => parts.includes(label))
  })
}

function prepareHomeGoal() {
  const codes = queryGoalCodes(route.query.goal)
  if (codes.length === 0 || !journey.conversationId || homeGoalsAlreadySent(codes)) {
    return
  }
  const openGoalPick = goalSelectActive.value
    && codes.every(code => goalOptions.value.some(option => option.code === code))
    && !journey.messages.some(message => message.role === 'user')
  if (openGoalPick) {
    return
  }
  journey.clearSession()
}

async function applyHomeGoal() {
  const codes = queryGoalCodes(route.query.goal)
  if (codes.length === 0 || !goalSelectActive.value || pending.value) {
    return
  }
  if (homeGoalsAlreadySent(codes)) {
    return
  }
  if (!codes.every(code => goalOptions.value.some(option => option.code === code))) {
    return
  }
  selectedCodes.value = [...codes]
  await confirmMultiSelection()
}

onMounted(async () => {
  if (orderId.value) {
    await loadOrderChat(orderId.value)
    return
  }

  journey.hydrate()
  prepareHomeGoal()
  void loadCheckupLinkUrl()

  if (route.query.handoff === '1' && auth.hasSession) {
    escalated.value = true
  }

  try {
    const restoringConversation = Boolean(journey.conversationId)
    if (restoringConversation) {
      await ensureConversation()
      if (journey.conversationId) {
        await hydrateConversationHistory(journey.conversationId)
      }
    } else if (pathContractEnabled.value && !isStandardFlow.value) {
      // Delay POST /conversations until 進站三選 (path is create-time).
      await auth.ensureSession()
      ensureLocalPathEntryGreeting()
    } else {
      await ensureConversation()
    }
    // After hydrate／create: B／C must still surface required basics (trust GET /profile,
    // not history profile_gaps which may be empty while fields are still missing).
    if (pathRequiresBasicProfile(conversationPath.value) && !pathCAwaitingUpload.value) {
      await syncQuestionnaireFromBackend()
    }
    await applyHomeGoal()
  } catch {
    if (journey.messages.length === 0) {
      appendMessage('assistant', t('chat.conversationError'))
    }
  }
  await restoreReportSession()
  await syncExpertReviewStatusOnce()
  scrollToLatest('auto')
})

onBeforeUnmount(() => {
  clearComposingTimer()
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
