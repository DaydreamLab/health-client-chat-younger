<script setup lang="ts">
withDefaults(defineProps<{
  /** Inline trailing marker while text is streaming. */
  size?: 'md' | 'sm'
}>(), {
  size: 'md'
})
</script>

<template>
  <span
    class="chat-typing-ellipsis"
    :class="`is-${size}`"
    aria-hidden="true"
    data-testid="chat-typing-ellipsis"
  >
    <span class="chat-typing-ellipsis__static">…</span>
    <span class="chat-typing-ellipsis__dots">
      <span class="chat-typing-ellipsis__dot" />
      <span class="chat-typing-ellipsis__dot" />
      <span class="chat-typing-ellipsis__dot" />
    </span>
  </span>
</template>

<style scoped>
.chat-typing-ellipsis {
  display: inline-flex;
  align-items: center;
  min-height: 1.25rem;
  vertical-align: baseline;
}

.chat-typing-ellipsis.is-sm {
  min-height: 1em;
  margin-inline-start: 0.15em;
}

.chat-typing-ellipsis__static {
  display: none;
  font-size: 1.25rem;
  letter-spacing: 0.08em;
  line-height: 1;
}

.chat-typing-ellipsis.is-sm .chat-typing-ellipsis__static {
  font-size: 1em;
}

.chat-typing-ellipsis__dots {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.1rem;
}

.chat-typing-ellipsis.is-sm .chat-typing-ellipsis__dots {
  gap: 0.22rem;
  padding: 0;
}

.chat-typing-ellipsis__dot {
  display: block;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 9999px;
  background: currentColor;
  opacity: 0.35;
  transform: translateY(0) scale(0.85);
  animation: chat-typing-dot 1.05s ease-in-out infinite;
}

.chat-typing-ellipsis.is-sm .chat-typing-ellipsis__dot {
  width: 0.28rem;
  height: 0.28rem;
}

.chat-typing-ellipsis__dot:nth-child(2) {
  animation-delay: 0.15s;
}

.chat-typing-ellipsis__dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes chat-typing-dot {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0) scale(0.85);
  }

  40% {
    opacity: 1;
    transform: translateY(-0.2rem) scale(1.1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .chat-typing-ellipsis__dots {
    display: none;
  }

  .chat-typing-ellipsis__static {
    display: inline;
  }
}
</style>
