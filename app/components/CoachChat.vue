<template>
  <div class="flex min-h-80 flex-col gap-4 rounded-xl border border-default bg-elevated p-4">
    <div class="flex-1 space-y-3">
      <p
        v-if="!messages.length"
        class="text-sm text-dimmed"
      >
        {{ $t('chat.empty') }}
      </p>
      <div
        v-for="(message, index) in messages"
        :key="index"
        class="text-sm"
        :class="message.role === 'user' ? 'text-highlighted' : 'text-muted'"
      >
        <span class="font-medium">{{ message.role === 'user' ? 'You' : 'YOUNGER' }}:</span>
        {{ message.content }}
      </div>
    </div>

    <form
      class="flex gap-2"
      @submit.prevent="onSubmit"
    >
      <input
        v-model="input"
        type="text"
        :placeholder="$t('chat.placeholder')"
        class="h-10 min-w-0 flex-1 rounded-md border border-default bg-default px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
      <AppButton
        type="submit"
        variant="primary"
      >
        Send
      </AppButton>
    </form>
  </div>
</template>

<script setup lang="ts">
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const { t } = useI18n()
const input = ref('')
const pending = ref(false)
const messages = ref<ChatMessage[]>([])

async function onSubmit() {
  const content = input.value.trim()
  if (!content || pending.value) {
    return
  }

  messages.value.push({ role: 'user', content })
  input.value = ''
  pending.value = true

  try {
    const reply = await $fetch<{ role: 'assistant', content: string }>('/api/chat', {
      method: 'POST',
      body: { messages: messages.value }
    })
    messages.value.push(reply)
  } catch {
    messages.value.push({
      role: 'assistant',
      content: t('member.chatHint')
    })
  } finally {
    pending.value = false
  }
}
</script>
