<template>
  <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-default">
    <header class="flex shrink-0 flex-wrap items-center gap-3 border-b border-default bg-elevated px-4 py-4 sm:px-6">
      <div class="min-w-0 flex-1">
        <h1 class="text-lg font-semibold text-highlighted">
          {{ $t('chat.title') }}
        </h1>
        <p
          v-if="escalated"
          class="mt-1 text-sm text-muted"
        >
          {{ $t('chat.escalatedBody') }}
        </p>
      </div>
      <AppButton
        v-if="!escalated"
        variant="outline"
        data-testid="chat-escalate"
        @click="escalate"
      >
        {{ $t('chat.escalate') }}
      </AppButton>
    </header>

    <div
      v-if="escalated"
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
        <p
          class="max-w-[min(40rem,85%)] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
          :class="message.role === 'user' ? 'bg-elevated text-highlighted' : 'bg-muted text-default'"
          :data-testid="message.id === lastAssistantId ? 'chat-last-reply' : undefined"
        >
          {{ messageText(message) }}
        </p>
      </article>
      <p
        v-if="pending"
        class="text-sm text-muted"
      >
        {{ $t('chat.thinking') }}
      </p>
    </div>

    <div class="shrink-0 border-t border-default bg-elevated px-4 py-4 sm:px-6">
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
          @click="sendText($t(`chat.chips.${key}`))"
        >
          {{ $t(`chat.chips.${key}`) }}
        </button>
      </div>
      <form
        v-if="!escalated"
        class="flex items-end gap-2 rounded-xl border border-default bg-default p-2"
        @submit.prevent="onSubmit"
      >
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

interface ChatUIMessage {
  id: string
  role: 'user' | 'assistant'
  parts: Array<{ type: 'text', text: string }>
}

const chipKeys = ['hasReport', 'noReport', 'plans', 'next'] as const

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()

const input = ref('')
const pending = ref(false)
const escalated = ref(false)
const transcriptEl = useTemplateRef<HTMLElement>('transcriptEl')

function queryPlan(value: unknown): PlanId | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  return isPlanId(raw) ? raw : undefined
}

const selectedPlan = computed<PlanId | undefined>(() => queryPlan(route.query.plan))

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

function makeMessage(role: ChatUIMessage['role'], text: string, id?: string): ChatUIMessage {
  return {
    id: id ?? crypto.randomUUID(),
    role,
    parts: [{ type: 'text', text }]
  }
}

const messages = ref<ChatUIMessage[]>([
  makeMessage('assistant', t(greetingKey(queryPlan(route.query.plan))), 'greet')
])

const lastAssistantId = computed(() => {
  const last = [...messages.value].reverse().find(message => message.role === 'assistant')
  return last?.id
})

function messageText(message: ChatUIMessage) {
  return message.parts.map(part => part.text).join('\n')
}

function appendMessage(role: ChatUIMessage['role'], text: string) {
  messages.value.push(makeMessage(role, text))
}

function scrollToLatest(behavior: ScrollBehavior = 'smooth') {
  const scroller = transcriptEl.value
  if (!scroller) {
    return
  }

  scroller.scrollTo({ top: scroller.scrollHeight, behavior })
}

watch(
  () => [messages.value.length, pending.value, lastAssistantId.value],
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
  if (!content || pending.value || escalated.value) {
    return
  }

  appendMessage('user', content)
  pending.value = true

  try {
    const reply = await $fetch<ChatUIMessage>('/api/chat', {
      method: 'POST',
      body: {
        messages: messages.value,
        plan: selectedPlan.value,
        locale: locale.value
      }
    })
    messages.value.push({
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

onMounted(() => {
  if (route.query.handoff === '1' && auth.isLoggedIn) {
    escalated.value = true
  }

  scrollToLatest('auto')
})
</script>
