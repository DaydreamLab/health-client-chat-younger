<script setup lang="ts">
import { computed } from 'vue'
import { renderChatMarkdown } from '~/utils/chat-markdown'

const props = withDefaults(defineProps<{
  text: string
  /** Use on primary-filled bubbles so emphasis stays white. */
  tone?: 'default' | 'on-primary'
}>(), {
  tone: 'default'
})

const html = computed(() => renderChatMarkdown(props.text))
</script>

<template>
  <!-- HTML from renderChatMarkdown (marked; raw HTML stripped). -->
  <!-- eslint-disable vue/no-v-html -->
  <div
    class="chat-md break-words text-sm leading-relaxed"
    :class="tone === 'on-primary' ? 'chat-md--on-primary' : ''"
    v-html="html"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>

<style scoped>
.chat-md :deep(> :first-child) {
  margin-top: 0;
}

.chat-md :deep(> :last-child) {
  margin-bottom: 0;
}

.chat-md :deep(p) {
  margin: 0.35em 0;
}

.chat-md :deep(ul),
.chat-md :deep(ol) {
  margin: 0.35em 0;
  padding-left: 1.25em;
  /* Tailwind preflight sets list-style: none — restore markers for chat markdown. */
  list-style-position: outside;
}

.chat-md :deep(ul) {
  list-style-type: disc;
}

.chat-md :deep(ol) {
  list-style-type: decimal;
}

.chat-md :deep(ul ul) {
  list-style-type: circle;
}

.chat-md :deep(ul ul ul) {
  list-style-type: square;
}

.chat-md :deep(li) {
  margin: 0.15em 0;
  display: list-item;
}

.chat-md :deep(li + li) {
  margin-top: 0.15em;
}

.chat-md :deep(strong),
.chat-md :deep(b) {
  font-weight: 700;
  color: var(--ui-primary);
}

.chat-md--on-primary :deep(strong),
.chat-md--on-primary :deep(b) {
  color: inherit;
}

.chat-md :deep(a) {
  font-weight: 600;
  color: var(--ui-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.chat-md--on-primary :deep(a) {
  color: inherit;
}

.chat-md :deep(code) {
  border-radius: 0.25rem;
  background: color-mix(in oklab, var(--ui-bg-accented) 70%, transparent);
  padding: 0.1em 0.35em;
  font-size: 0.9em;
}

.chat-md--on-primary :deep(code) {
  background: color-mix(in oklab, white 18%, transparent);
}

.chat-md :deep(pre) {
  margin: 0.5em 0;
  overflow-x: auto;
  border-radius: 0.5rem;
  background: color-mix(in oklab, var(--ui-bg-accented) 70%, transparent);
  padding: 0.65em 0.75em;
}

.chat-md :deep(pre code) {
  background: transparent;
  padding: 0;
}

.chat-md :deep(blockquote) {
  margin: 0.5em 0;
  border-left: 3px solid color-mix(in oklab, var(--ui-primary) 45%, transparent);
  padding-left: 0.75em;
  color: var(--ui-text-muted);
}

.chat-md--on-primary :deep(blockquote) {
  border-left-color: color-mix(in oklab, white 45%, transparent);
  color: inherit;
  opacity: 0.9;
}

.chat-md :deep(h1),
.chat-md :deep(h2),
.chat-md :deep(h3),
.chat-md :deep(h4) {
  margin: 0.65em 0 0.3em;
  font-weight: 700;
  /* Light theme --ui-text-highlighted equals --ui-text; nudge headings darker for hierarchy. */
  color: color-mix(in oklab, var(--ui-text-highlighted) 72%, #0A2544 28%);
  line-height: 1.35;
}

.dark .chat-md :deep(h1),
.dark .chat-md :deep(h2),
.dark .chat-md :deep(h3),
.dark .chat-md :deep(h4) {
  color: var(--ui-text-highlighted);
}

.chat-md--on-primary :deep(h1),
.chat-md--on-primary :deep(h2),
.chat-md--on-primary :deep(h3),
.chat-md--on-primary :deep(h4) {
  color: inherit;
}

.chat-md :deep(h1) {
  font-size: 1.35em;
}

.chat-md :deep(h2) {
  font-size: 1.2em;
}

.chat-md :deep(h3) {
  font-size: 1.1em;
}

.chat-md :deep(h4) {
  font-size: 1.05em;
}

.chat-md :deep(hr) {
  display: block;
  width: 100%;
  height: 0;
  margin: 0.95em 0;
  border: 0;
  border-top: 2px solid color-mix(in oklab, var(--ui-border) 40%, var(--ui-text-muted) 60%);
  opacity: 1;
}

.chat-md :deep(hr + hr) {
  display: none;
}

.chat-md :deep(p + hr),
.chat-md :deep(ul + hr),
.chat-md :deep(ol + hr) {
  margin-top: 0.95em;
}

.chat-md :deep(hr + p),
.chat-md :deep(hr + ul),
.chat-md :deep(hr + ol) {
  margin-top: 0.95em;
}

.chat-md--on-primary :deep(hr) {
  border-top-color: color-mix(in oklab, white 42%, transparent);
}
</style>
