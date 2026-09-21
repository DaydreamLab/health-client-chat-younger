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
        </div>
      </article>
      <p
        v-if="pending"
        class="text-sm text-muted"
      >
        {{ $t('chat.thinking') }}
      </p>
      <div
        v-if="journey.hasAnalysis && !readonly && !escalated"
        class="pt-2"
      >
        <AppButton
          data-testid="chat-view-recommend"
          @click="goRecommend"
        >
          {{ $t('chat.viewRecommend') }}
        </AppButton>
      </div>
    </div>

    <div
      v-if="!readonly"
      class="shrink-0 border-t border-default bg-elevated px-4 py-4 sm:px-6"
    >
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
          @click="onChip(key)"
        >
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
          :disabled="escalated || pending"
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
          :disabled="escalated || pending"
          data-testid="chat-input"
          @keydown.enter.exact.prevent="onSubmit"
        />
        <AppButton
          type="submit"
          :disabled="escalated || pending"
          data-testid="chat-send"
        >
          {{ $t('chat.send') }}
        </AppButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { demoAssistantReply } from '~/utils/chat-demo'
import { isPlanId, type PlanId } from '~/utils/plans'
import type { ChatMessage } from '~/utils/first-order'

const chipKeys = ['hasReport', 'noReport', 'plans', 'next', 'upload'] as const

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()
const journey = useJourneyStore()
const api = useFirstOrderApi()

const input = ref('')
const pending = ref(false)
const escalated = ref(false)
const transcriptEl = useTemplateRef<HTMLElement>('transcriptEl')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const viewMessages = ref<ChatMessage[]>([])

const orderId = computed(() => {
  const raw = route.query.orderId
  return typeof raw === 'string' ? raw : ''
})

const readonly = computed(() => Boolean(orderId.value))

function queryPlan(value: unknown): PlanId | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  return isPlanId(raw) ? raw : undefined
}

const selectedPlan = computed<PlanId | undefined>(() => queryPlan(route.query.plan))

const messages = computed(() => readonly.value ? viewMessages.value : journey.messages)

function greetingKey(plan?: PlanId) {
  if (plan === 'basic') {
    return 'chat.greetBasic'
  }

  if (plan === 'mid') {
    return 'chat.greetMid'
  }

  if (plan === 'premium') {
    return 'chat.greetPremium'
  }

  return 'chat.greet'
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

function ensureGreeting() {
  if (readonly.value || journey.messages.length > 0) {
    return
  }

  journey.messages.push(makeMessage('assistant', t(greetingKey(queryPlan(route.query.plan))), 'greet'))
}

ensureGreeting()

const lastAssistantId = computed(() => {
  const last = [...messages.value].reverse().find(message => message.role === 'assistant')
  return last?.id
})

function messageText(message: ChatMessage) {
  return message.parts.filter(part => part.type === 'text').map(part => part.text).join('\n')
}

function fileName(message: ChatMessage) {
  return message.parts.find(part => part.type === 'file')?.name
}

function appendMessage(role: ChatMessage['role'], text: string, file?: string) {
  journey.messages.push(makeMessage(role, text, undefined, file))
}

function scrollToLatest(behavior: ScrollBehavior = 'smooth') {
  const scroller = transcriptEl.value
  if (!scroller) {
    return
  }

  scroller.scrollTo({ top: scroller.scrollHeight, behavior })
}

watch(
  () => [messages.value.length, pending.value, lastAssistantId.value, journey.hasAnalysis],
  async () => {
    await nextTick()
    requestAnimationFrame(() => {
      scrollToLatest()
    })
  },
  { flush: 'post' }
)

async function sendText(text: string) {
  const content = text.trim()
  if (!content || pending.value || escalated.value || readonly.value) {
    return
  }

  appendMessage('user', content)
  pending.value = true

  try {
    const reply = await $fetch<ChatMessage>('/api/chat', {
      method: 'POST',
      body: {
        messages: journey.messages,
        plan: selectedPlan.value,
        locale: locale.value
      }
    })
    journey.messages.push({
      id: reply.id || crypto.randomUUID(),
      role: 'assistant',
      parts: reply.parts?.length ? reply.parts : [{ type: 'text', text: t('chat.greet') }]
    })
  } catch {
    appendMessage('assistant', demoAssistantReply({
      question: content,
      locale: locale.value,
      plan: selectedPlan.value
    }))
  } finally {
    pending.value = false
  }
}

function onChip(key: typeof chipKeys[number]) {
  if (key === 'upload') {
    pickFile()
    return
  }

  return sendText(t(`chat.chips.${key}`))
}

function pickFile() {
  fileInput.value?.click()
}

async function onFile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file || pending.value || escalated.value || readonly.value) {
    return
  }

  appendMessage('user', t('chat.uploaded', { name: file.name }), file.name)
  pending.value = true

  try {
    const analysis = await api.analyzeReport({
      locale: locale.value,
      fileName: file.name
    })
    appendMessage('assistant', analysis.summary)
    journey.hasAnalysis = true
  } catch {
    appendMessage('assistant', demoAssistantReply({
      question: '上傳血檢報告',
      locale: locale.value,
      plan: selectedPlan.value
    }))
    journey.hasAnalysis = true
  } finally {
    pending.value = false
  }
}

function onSubmit() {
  const content = input.value.trim()
  input.value = ''
  return sendText(content)
}

function escalate() {
  if (!auth.isLoggedIn) {
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
  const path = localePath('/app/recommend')
  if (!auth.isLoggedIn) {
    return navigateTo({
      path: localePath('/login'),
      query: { redirect: path }
    })
  }

  return navigateTo(path)
}

watch(orderId, async (id) => {
  if (id) {
    viewMessages.value = await api.getOrderChat(id)
    await nextTick()
    scrollToLatest('auto')
    return
  }

  ensureGreeting()
})

onMounted(async () => {
  if (orderId.value) {
    viewMessages.value = await api.getOrderChat(orderId.value)
    await nextTick()
    scrollToLatest('auto')
    return
  }

  if (route.query.handoff === '1' && auth.isLoggedIn) {
    escalated.value = true
  }

  ensureGreeting()
  scrollToLatest('auto')
})
</script>
