<template>
  <div
    class="flex min-h-0 flex-1 flex-col"
    data-testid="agent-v2-panel"
  >
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 pt-4">
      <AgentV2Progress :missing="missing" />
    </div>

    <div
      class="min-h-0 flex-1 overflow-y-auto px-4 py-4"
      data-testid="agent-v2-transcript"
    >
      <div class="mx-auto w-full max-w-3xl">
        <p
          v-if="bootError"
          class="text-sm text-muted"
          data-testid="agent-v2-boot-error"
        >
          {{ bootError }}
        </p>
        <AgentV2Messages
          v-else
          :messages="messages"
        />
        <p
          v-if="pending"
          class="mt-3 text-sm text-muted"
          data-testid="agent-v2-pending"
        >
          {{ $t('agentV2.pending') }}
        </p>
        <p
          v-if="turnError"
          class="mt-3 text-sm text-muted"
          data-testid="agent-v2-turn-error"
        >
          {{ turnError }}
        </p>
      </div>
    </div>

    <div class="border-t border-default px-4 py-3">
      <div class="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <AgentV2Actions
          :actions="actions"
          :disabled="pending || !conversationId"
          @select="onAction"
        />
        <form
          class="flex w-full items-end gap-2 rounded-xl border border-default bg-default p-2"
          data-testid="agent-v2-composer"
          @submit.prevent="onSend"
        >
          <textarea
            v-model="draft"
            rows="1"
            class="min-h-10 max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-highlighted outline-none"
            :placeholder="$t('agentV2.placeholder')"
            data-testid="agent-v2-input"
            :disabled="pending || !conversationId"
            @keydown.enter.exact.prevent="onSend"
          />
          <AppButton
            type="submit"
            variant="primary"
            data-testid="agent-v2-send"
            :disabled="pending || !conversationId || !draft.trim()"
          >
            {{ $t('agentV2.send') }}
          </AppButton>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  AGENT_V2_CONVERSATION_STORAGE_KEY,
  AGENT_V2_RECOMMENDATIONS_PATH,
  isOfferRecommendAction,
  type AgentV2Action,
  type AgentV2Message,
  type AgentV2Requirement,
  type AgentV2TurnResult
} from '~/utils/agent-v2'
import { CandorApiError } from '~/utils/candor-api'

const { t } = useI18n()
const localePath = useLocalePath()
const api = useAgentV2Api()

const conversationId = ref<string | null>(null)
const messages = ref<AgentV2Message[]>([])
const missing = ref<AgentV2Requirement[]>(['profile', 'report', 'goals'])
const actions = ref<AgentV2Action[]>([])
const state = ref('')
const draft = ref('')
const pending = ref(false)
const bootError = ref('')
const turnError = ref('')
let messageSeq = 0

function nextMessageId(prefix: string): string {
  messageSeq += 1
  return `${prefix}-${messageSeq}`
}

function readStoredConversationId(): string | null {
  if (!import.meta.client) {
    return null
  }
  return localStorage.getItem(AGENT_V2_CONVERSATION_STORAGE_KEY)
}

function writeStoredConversationId(id: string | null) {
  if (!import.meta.client) {
    return
  }
  if (id) {
    localStorage.setItem(AGENT_V2_CONVERSATION_STORAGE_KEY, id)
  } else {
    localStorage.removeItem(AGENT_V2_CONVERSATION_STORAGE_KEY)
  }
}

function applyTurn(turn: AgentV2TurnResult, opts: { appendUserText?: string } = {}) {
  conversationId.value = turn.conversation_id
  writeStoredConversationId(turn.conversation_id)
  state.value = turn.state
  missing.value = turn.missing
  actions.value = turn.actions

  if (opts.appendUserText) {
    messages.value = [
      ...messages.value,
      {
        id: nextMessageId('user'),
        role: 'user',
        text: opts.appendUserText
      }
    ]
  }

  if (turn.reply.text) {
    messages.value = [
      ...messages.value,
      {
        id: nextMessageId('assistant'),
        role: 'assistant',
        text: turn.reply.text
      }
    ]
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof CandorApiError) {
    return error.message || t('agentV2.errorGeneric')
  }
  return t('agentV2.errorGeneric')
}

async function boot() {
  pending.value = true
  bootError.value = ''
  turnError.value = ''
  try {
    const stored = readStoredConversationId()
    if (stored) {
      try {
        const bundle = await api.getConversation(stored)
        conversationId.value = bundle.conversation.id
        writeStoredConversationId(bundle.conversation.id)
        messages.value = bundle.messages ?? []
        missing.value = bundle.conversation.missing ?? ['profile', 'report', 'goals']
        state.value = bundle.conversation.state ?? ''
        actions.value = []
        return
      } catch {
        writeStoredConversationId(null)
      }
    }

    const created = await api.createConversation()
    conversationId.value = created.id
    writeStoredConversationId(created.id)
    messages.value = []
    missing.value = created.missing ?? ['profile', 'report', 'goals']
    state.value = created.state ?? ''
    actions.value = []

    // Optional greeting via empty state — if create returns nothing else, stay quiet.
  } catch (error) {
    bootError.value = errorMessage(error)
  } finally {
    pending.value = false
  }
}

async function onSend() {
  const text = draft.value.trim()
  if (!text || !conversationId.value || pending.value) {
    return
  }
  pending.value = true
  turnError.value = ''
  draft.value = ''
  try {
    const turn = await api.sendMessage(conversationId.value, text)
    applyTurn(turn, { appendUserText: text })
  } catch (error) {
    draft.value = text
    turnError.value = errorMessage(error)
  } finally {
    pending.value = false
  }
}

async function onAction(action: AgentV2Action) {
  if (!conversationId.value || pending.value) {
    return
  }
  pending.value = true
  turnError.value = ''
  try {
    const turn = await api.postAction(conversationId.value, action.key)
    applyTurn(turn)
    if (isOfferRecommendAction(action)) {
      // Existing recommendations entry (same path as /chat offer_recommend).
      // Do not write journey store — v2 conversation ids are not v1 journey ids.
      await navigateTo(localePath(AGENT_V2_RECOMMENDATIONS_PATH))
    }
  } catch (error) {
    turnError.value = errorMessage(error)
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  void boot()
})
</script>
