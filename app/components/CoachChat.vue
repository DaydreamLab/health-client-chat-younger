<template>
  <div class="flex flex-col gap-4 rounded-xl border border-default bg-elevated p-4 min-h-80">
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

    <UChatPrompt
      v-model="input"
      :placeholder="$t('chat.placeholder')"
      :status="pending ? 'streaming' : 'ready'"
      variant="subtle"
      @submit="onSubmit"
    >
      <UChatPromptSubmit color="primary" />
    </UChatPrompt>
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
