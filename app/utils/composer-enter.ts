/**
 * How long to treat Enter as IME candidate confirmation after compositionend.
 * macOS queues that Enter in a later task, after a 0ms timer has already cleared
 * the composing flag. Vue's v-model still holds only the committed prefix then,
 * so the Enter sends the first half and the uncommitted remainder is sent next.
 */
export const IME_CONFIRM_ENTER_MS = 100

export function shouldIgnoreComposerEnter(
  event: { isComposing: boolean, keyCode: number, timeStamp?: number },
  composing: boolean,
  compositionEndedAt = 0
) {
  if (composing || event.isComposing || event.keyCode === 229) {
    return true
  }
  const stamp = event.timeStamp
  if (stamp === undefined || compositionEndedAt <= 0 || stamp < compositionEndedAt) {
    return false
  }
  return stamp - compositionEndedAt < IME_CONFIRM_ENTER_MS
}
