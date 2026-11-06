import {
  emptyExpertBookingDraft,
  type ExpertBookingDraft,
  type ExpertBookingProduct
} from '~/utils/expert-booking'

const DRAFT_STORAGE_KEY = 'candor.expert-booking.draft'

export type ExpertBookingProductState
  = 'idle'
    | 'loading'
    | 'ready'
    | 'unavailable'
    | 'error'

export const useExpertBookingStore = defineStore('expert-booking', () => {
  const draft = ref<ExpertBookingDraft>(emptyExpertBookingDraft())
  const hydrated = ref(false)
  /** 目前上架商品快照（給確認頁顯示名稱／價格；訂單頁改用訂單 amount）。 */
  const product = ref<ExpertBookingProduct | null>(null)
  const productState = ref<ExpertBookingProductState>('idle')

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

  function setProduct(next: ExpertBookingProduct) {
    product.value = next
    productState.value = 'ready'
  }

  function setProductUnavailable() {
    product.value = null
    productState.value = 'unavailable'
  }

  function setProductError() {
    product.value = null
    productState.value = 'error'
  }

  function setProductLoading() {
    productState.value = 'loading'
  }

  return {
    draft,
    hydrated,
    product,
    productState,
    hydrate,
    persist,
    setDraft,
    patchDraft,
    reset,
    clearStorage,
    setProduct,
    setProductUnavailable,
    setProductError,
    setProductLoading
  }
})
