<script setup lang="ts">
/**
 * Read-only transcript list shared by order chat modal (and similar surfaces).
 * Bubble layout + ChatMarkdown + TurnActions match /chat historical paint.
 */
import { computed } from 'vue'
import type { ChatMessage } from '~/utils/first-order'
import { chatMessageText } from '~/utils/first-order'
import { selectedCodesFromReplyActions } from '~/utils/cta-interaction'
import {
  buildOrderTranscriptTurnActions,
  type TurnActionsVisibility
} from '~/utils/chat-turn-actions'

const props = defineProps<{
  messages: ChatMessage[]
  /** Optional test id for the message list wrapper. */
  listTestId?: string
}>()

interface TranscriptRow {
  message: ChatMessage
  text: string
  actions: TurnActionsVisibility
  selectedCodes: string[]
}

const rows = computed<TranscriptRow[]>(() =>
  props.messages.map((message) => {
    const actions = buildOrderTranscriptTurnActions(message, props.messages)
    return {
      message,
      text: chatMessageText(message),
      actions,
      selectedCodes: selectedCodesFromReplyActions(message.replyActions)
    }
  })
)
</script>

<template>
  <div
    class="mx-auto w-full max-w-3xl"
    :data-testid="listTestId"
  >
    <article
      v-for="row in rows"
      :key="row.message.id"
      class="flex gap-3 pb-8"
      :class="[
        row.message.role === 'user' ? 'justify-end items-end' : 'justify-start items-start'
      ]"
    >
      <ChatAssistantMark
        v-if="row.message.role === 'assistant'"
        state="speaking"
      />
      <div
        class="text-sm leading-relaxed"
        :class="row.message.role === 'user'
          ? 'max-w-[75%] overflow-hidden rounded-lg bg-elevated px-4 py-3 text-highlighted'
          : 'min-w-0 flex-1 text-default'"
      >
        <ChatMarkdown :text="row.text" />
        <TurnActions
          v-if="row.message.role === 'assistant'"
          :choices="row.actions.choices"
          :selected-codes="row.selectedCodes"
          :show-confirm="row.actions.showConfirm"
          :confirm-disabled="true"
          :show-upload="row.actions.showUpload"
          :upload-disabled="true"
          :show-checkup="row.actions.showCheckup"
          :checkup-url="row.actions.checkupUrlOverride ?? ''"
          :show-full-test="row.actions.showFullTest"
          :full-test-url="row.actions.fullTestUrlOverride ?? ''"
          :full-test-label="row.actions.fullTestLabelOverride"
          :full-test-copy="row.actions.fullTestCopyOverride"
          :full-test-marker-count="row.actions.fullTestMarkerCount"
          :show-expert-booking="row.actions.showExpertBooking"
          :expert-booking-label="row.actions.expertBookingLabelOverride"
          :show-want-more-tests="false"
          want-more-tests-url=""
          :show-view-recommend="row.actions.showViewRecommend"
          :view-recommend-status="row.actions.viewRecommendStatus"
          :show-retry="false"
          :pending="true"
          :vitals-fields="row.actions.vitalsFields"
          :vitals-disabled="true"
          :vitals-status="row.actions.vitalsStatus"
          :vitals-has-stored-value="row.actions.vitalsHasStoredValue"
          :vitals-stored-value="row.actions.vitalsStoredValue"
          :confirm-status="row.actions.confirmStatus"
          :round-status="row.actions.roundStatus"
        />
      </div>
    </article>
  </div>
</template>
