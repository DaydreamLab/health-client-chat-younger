<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      data-testid="order-chat-modal"
      @click.self="emit('close')"
    >
      <article
        class="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-default bg-elevated shadow-xl"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <div class="flex items-start justify-between gap-3 border-b border-default px-5 py-4">
          <div>
            <h2
              :id="titleId"
              class="text-lg font-semibold text-highlighted"
            >
              {{ $t('orders.viewChat') }}
            </h2>
            <p
              v-if="orderNumber"
              class="mt-1 text-xs tabular-nums text-muted"
            >
              {{ orderNumber }}
            </p>
          </div>
          <AppButton
            variant="outline"
            data-testid="order-chat-modal-close"
            @click="emit('close')"
          >
            {{ $t('orders.closeChat') }}
          </AppButton>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p
            v-if="pending"
            class="text-sm text-muted"
            data-testid="order-chat-loading"
          >
            {{ $t('orders.chatLoading') }}
          </p>
          <p
            v-else-if="error"
            class="text-sm text-muted"
            data-testid="order-chat-error"
          >
            {{ error }}
          </p>
          <p
            v-else-if="!messages.length"
            class="text-sm text-muted"
            data-testid="order-chat-empty"
          >
            {{ $t('orders.chatEmpty') }}
          </p>
          <ul
            v-else
            class="space-y-3"
            data-testid="order-chat-messages"
          >
            <li
              v-for="message in messages"
              :key="message.id"
              class="flex"
              :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                :class="message.role === 'user'
                  ? 'bg-primary text-white'
                  : 'border border-default bg-default text-highlighted'"
              >
                <p class="mb-1 text-[11px] font-medium opacity-70">
                  {{ message.role === 'user' ? $t('orders.chatRoleUser') : $t('orders.chatRoleAssistant') }}
                </p>
                <p class="whitespace-pre-wrap break-words">
                  {{ messageText(message) }}
                </p>
              </div>
            </li>
          </ul>
        </div>
      </article>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ChatMessage } from '~/utils/first-order'

const props = defineProps<{
  open: boolean
  orderId: string | null
  orderNumber?: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

const api = useFirstOrderApi()
const { t } = useI18n()
const titleId = 'order-chat-modal-title'
const pending = ref(false)
const error = ref('')
const messages = ref<ChatMessage[]>([])

function messageText(message: ChatMessage) {
  return message.parts
    .filter(part => part.type === 'text' && part.text)
    .map(part => part.text)
    .join('\n')
    .trim()
}

async function loadMessages() {
  if (!props.orderId) {
    messages.value = []
    return
  }
  pending.value = true
  error.value = ''
  try {
    messages.value = await api.getOrderChat(props.orderId)
  } catch {
    messages.value = []
    error.value = t('orders.chatError')
  } finally {
    pending.value = false
  }
}

watch(
  () => [props.open, props.orderId] as const,
  ([open]) => {
    if (open) {
      void loadMessages()
    }
  }
)

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})
</script>
