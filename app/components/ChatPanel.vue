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
      ref="transcriptEl"
      data-testid="chat-transcript"
      class="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4 sm:px-6"
    >
      <article
        v-for="message in messages"
        :key="message.id"
        class="flex items-end gap-2"
        :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <span
          v-if="message.role === 'assistant'"
          class="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-elevated text-primary"
        >
          <UIcon
            name="i-lucide-bot"
            class="size-4"
          />
        </span>
        <div
          class="max-w-[min(40rem,85%)] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
          :class="message.role === 'user' ? 'bg-elevated text-highlighted' : 'bg-muted text-default'"
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

    <div
      v-if="!readonly"
      class="shrink-0 border-t border-default bg-elevated px-4 py-4 sm:px-6"
    >
      <div
        v-if="quizActive && activeQuestion && enumOptions.length"
        class="mb-3 flex flex-wrap gap-2"
        data-testid="chat-quiz-options"
      >
        <button
          v-for="option in enumOptions"
          :key="option"
          type="button"
          class="app-chip"
          :data-testid="`chat-quiz-option-${option}`"
          :disabled="pending"
          @click="answerEnum(option)"
        >
          {{ option }}
        </button>
      </div>
      <div
        v-if="!escalated"
        class="mb-3 flex flex-wrap gap-2"
      >
        <button
          v-for="key in chipKeys"
          :key="key"
          type="button"
          class="app-chip"
          :data-testid="`chat-chip-${key}`"
          :disabled="key === 'upload' ? !canUpload : (!canSendText || quizActive)"
          @click="onChip(key)"
        >
          <UIcon
            v-if="key === 'upload'"
            name="i-lucide-paperclip"
            class="size-3.5"
          />
          {{ $t(`chat.chips.${key}`) }}
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
import type { ProfileNextQuestion } from '~/utils/candor-api'
import { CandorApiError } from '~/utils/candor-api'
import { isPlanId, type PlanId } from '~/utils/plans'
import { isSupplementPlanId, type ChatMessage, type SupplementPlanId } from '~/utils/first-order'

const chipKeys = ['hasReport', 'noReport', 'plans', 'next', 'upload'] as const
const POLL_INTERVAL_MS = 2000
const POLL_MAX_ATTEMPTS = 30

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()
const journey = useJourneyStore()
const ordersApi = useFirstOrderApi()
const candor = useCandorApi()

const input = ref('')
const pending = ref(false)
const escalated = ref(false)
const quizActive = ref(false)
const activeQuestion = ref<ProfileNextQuestion | null>(null)
const pendingUserContent = ref<string | null>(null)
const reportRetryId = ref<string | null>(null)
const retryMessageId = ref<string | null>(null)
const transcriptEl = useTemplateRef<HTMLElement>('transcriptEl')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const viewMessages = ref<ChatMessage[]>([])

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

function queryOrderId(value: unknown) {
  return queryValue(value)
}

const orderId = computed(() => queryOrderId(route.query.orderId))
const readonly = computed(() => Boolean(orderId.value))
const canUpload = computed(() => !readonly.value && !escalated.value && !pending.value)
const canSendText = computed(() => !readonly.value && !escalated.value && !pending.value && !quizActive.value)
const canType = computed(() => {
  if (readonly.value || escalated.value || pending.value) {
    return false
  }
  if (quizActive.value) {
    const type = activeQuestion.value?.answer_type
    return type === 'text' || type === 'int'
  }
  return true
})

const selectedPlan = computed<PlanId | SupplementPlanId | undefined>(() => {
  return queryShopPlan(route.query.plan) ?? queryPlan(route.query.plan)
})

const messages = computed(() => readonly.value ? viewMessages.value : journey.messages)

const enumOptions = computed(() => {
  const question = activeQuestion.value
  if (!question || (question.answer_type !== 'enum' && question.answer_type !== 'multi_enum')) {
    return [] as string[]
  }
  return question.options ?? []
})

function applyShopPlanFromQuery() {
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
  const created = await candor.createConversation({})
  journey.conversationId = created.id
  if (journey.messages.length === 0) {
    journey.messages.push(makeMessage(
      'assistant',
      created.greeting.content,
      created.greeting.message_id || 'greet'
    ))
  }

  return created.id
}

async function streamPending() {
  const content = pendingUserContent.value
  pendingUserContent.value = null
  quizActive.value = false
  activeQuestion.value = null

  if (!content) {
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

async function runProfileThenStream() {
  pending.value = true
  try {
    const next = await candor.nextProfileQuestion(journey.reportId)
    if (next.done) {
      await streamPending()
      return
    }

    appendMessage('assistant', next.prompt)
    activeQuestion.value = next
    quizActive.value = true
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
  if (!content || !canSendText.value) {
    return
  }

  appendMessage('user', content)
  pendingUserContent.value = content
  await runProfileThenStream()
}

async function submitQuizAnswer(payload: {
  value?: string | number | boolean | null
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

    if (!result.saved && result.needs_clarification) {
      appendMessage('assistant', result.prompt)
      pending.value = false
      return
    }

    const next = await candor.nextProfileQuestion(journey.reportId)
    if (next.done) {
      await streamPending()
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

function answerEnum(option: string) {
  return submitQuizAnswer({ value: option, display: option })
}

function onChip(key: typeof chipKeys[number]) {
  if (key === 'upload') {
    pickFile()
    return
  }

  if (!canSendText.value) {
    return
  }

  return sendText(t(`chat.chips.${key}`))
}

function pickFile() {
  if (!canUpload.value) {
    return
  }

  fileInput.value?.click()
}

async function pollReport(reportId: string) {
  let lastStatus: string | null = null
  let statusMessageId: string | null = null

  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    const report = await candor.getHealthReport(reportId)
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

    if (report.status === 'ready') {
      return report
    }

    if (report.status === 'failed' || report.status === 'needs_review') {
      return report
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
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

  journey.reportId = reportId
  journey.hasAnalysis = true
  reportRetryId.value = null
  retryMessageId.value = null
  appendMessage('assistant', t('chat.reportReady'))

  const interpret = t('chat.askInterpret')
  appendMessage('user', interpret)
  pendingUserContent.value = interpret
  await runProfileThenStream()
}

async function onFile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file || !canUpload.value) {
    return
  }

  appendMessage('user', t('chat.uploaded', { name: file.name }), file.name)
  pending.value = true
  reportRetryId.value = null
  retryMessageId.value = null

  try {
    await ensureConversation()
    const uploaded = await candor.uploadHealthReport(file)
    journey.reportId = uploaded.id
    appendMessage('assistant', t('chat.reportStatus', { status: uploaded.status }))

    const report = await pollReport(uploaded.id)
    if (!report) {
      appendMessage('assistant', t('chat.reportPollTimeout'))
      return
    }

    if (report.status === 'ready') {
      await bindAndInterpret(report.id)
      return
    }

    const msg = report.status === 'needs_review'
      ? t('chat.reportNeedsReview')
      : t('chat.reportFailed')
    const id = crypto.randomUUID()
    journey.messages.push(makeMessage('assistant', msg, id))
    reportRetryId.value = report.id
    retryMessageId.value = id
  } catch {
    appendMessage('assistant', t('chat.streamError'))
  } finally {
    pending.value = false
  }
}

async function retryReport() {
  const id = reportRetryId.value
  if (!id || pending.value) {
    return
  }

  pending.value = true
  reportRetryId.value = null
  retryMessageId.value = null

  try {
    const ack = await candor.retryHealthReport(id)
    appendMessage('assistant', t('chat.reportStatus', { status: ack.status }))
    const report = await pollReport(id)
    if (!report) {
      appendMessage('assistant', t('chat.reportPollTimeout'))
      return
    }
    if (report.status === 'ready') {
      await bindAndInterpret(report.id)
      return
    }
    const msg = report.status === 'needs_review'
      ? t('chat.reportNeedsReview')
      : t('chat.reportFailed')
    const messageId = crypto.randomUUID()
    journey.messages.push(makeMessage('assistant', msg, messageId))
    reportRetryId.value = report.id
    retryMessageId.value = messageId
  } catch {
    appendMessage('assistant', t('chat.streamError'))
  } finally {
    pending.value = false
  }
}

function onSubmit() {
  const content = input.value.trim()
  input.value = ''
  if (!content) {
    return
  }

  if (quizActive.value && activeQuestion.value) {
    const type = activeQuestion.value.answer_type
    if (type === 'text') {
      return submitQuizAnswer({ raw_text: content, display: content })
    }
    if (type === 'int') {
      const n = Number(content)
      return submitQuizAnswer({
        value: Number.isFinite(n) ? n : content,
        raw_text: content,
        display: content
      })
    }
    return
  }

  return sendText(content)
}

function escalate() {
  if (readonly.value) {
    return
  }

  if (!auth.hasSession) {
    const chatPath = selectedPlan.value
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
</script>
