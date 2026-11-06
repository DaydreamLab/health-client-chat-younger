import {
  emptyExpertBookingDraft,
  type ExpertBookingDraft
} from '~/utils/expert-booking'

const DRAFT_STORAGE_KEY = 'candor.expert-booking.draft'

export const useExpertBookingStore = defineStore('expert-booking', () => {
  const draft = ref<ExpertBookingDraft>(emptyExpertBookingDraft())
  const hydrated = ref(false)

  function hydrate() {
    if (!import.meta.client || hydrated.value) {
      return
    }
    hydrated.value = true
    try {
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY)
      if (!raw) {
        return
      }
      const parsed = JSON.parse(raw) as ExpertBookingDraft
      if (parsed && typeof parsed === 'object') {
        draft.value = {
          ...emptyExpertBookingDraft(),
          ...parsed,
          slots: Array.isArray(parsed.slots) && parsed.slots.length
            ? parsed.slots.slice(0, 3)
            : emptyExpertBookingDraft().slots,
          attachments: Array.isArray(parsed.attachments)
            ? parsed.attachments.slice(0, 5)
            : []
        }
      }
    } catch {
      // ignore corrupt draft
    }
  }

  function persist() {
    if (!import.meta.client) {
      return
    }
    try {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft.value))
    } catch {
      // quota / private mode
    }
  }

  function setDraft(next: ExpertBookingDraft) {
    draft.value = next
    persist()
  }

  function patchDraft(partial: Partial<ExpertBookingDraft>) {
    draft.value = { ...draft.value, ...partial }
    persist()
  }

  function reset(email = '') {
    draft.value = emptyExpertBookingDraft(email)
    persist()
  }

  function clearStorage() {
    if (!import.meta.client) {
      return
    }
    sessionStorage.removeItem(DRAFT_STORAGE_KEY)
  }

  return {
    draft,
    hydrated,
    hydrate,
    persist,
    setDraft,
    patchDraft,
    reset,
    clearStorage
  }
})
