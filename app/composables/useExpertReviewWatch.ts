import type { ExpertCaseReviewListItem } from '~/utils/candor-api'
import type { ExpertReviewUiStatus } from '~/utils/chat-turn-actions'

export const EXPERT_REVIEW_AUTO_NAV_KEY = 'candor.expertReview.autoNavChat'
const POLL_MS = 8000

function readAutoNavDone(): Set<string> {
  if (!import.meta.client) {
    return new Set()
  }
  try {
    const raw = sessionStorage.getItem(EXPERT_REVIEW_AUTO_NAV_KEY)
    if (!raw) {
      return new Set()
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return new Set()
    }
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

function writeAutoNavDone(ids: Set<string>) {
  if (!import.meta.client) {
    return
  }
  sessionStorage.setItem(EXPERT_REVIEW_AUTO_NAV_KEY, JSON.stringify([...ids]))
}

function statusFromList(
  rows: ExpertCaseReviewListItem[],
  conversationId: string | null
): ExpertReviewUiStatus {
  if (!conversationId) {
    const latest = rows[0]
    if (!latest) {
      return 'none'
    }
    return latest.status === 'reviewed' ? 'reviewed' : 'awaiting_review'
  }
  const match = rows.find(row => row.conversation_id === conversationId)
  if (!match) {
    return 'none'
  }
  return match.status === 'reviewed' ? 'reviewed' : 'awaiting_review'
}

/**
 * Poll member expert-case-reviews; sync journey status; auto-navigate to /chat
 * once per session when a case flips awaiting_review → reviewed.
 */
export function useExpertReviewWatch() {
  const auth = useAuthStore()
  const journey = useJourneyStore()
  const candor = useCandorApi()
  const localePath = useLocalePath()
  const route = useRoute()

  const reviews = ref<ExpertCaseReviewListItem[]>([])
  const loading = ref(false)
  const error = ref('')
  let pollTimer: ReturnType<typeof setInterval> | null = null
  const previousStatusById = new Map<string, ExpertCaseReviewListItem['status']>()

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function shouldSkipAutoNav(): boolean {
    const path = route.path
    if (path.includes('/recommendations')) {
      return true
    }
    if (path.includes('/orders')) {
      return true
    }
    if (path.includes('/chat')) {
      return true
    }
    return false
  }

  function maybeAutoNavToChat(rows: ExpertCaseReviewListItem[]) {
    if (shouldSkipAutoNav()) {
      return
    }
    const done = readAutoNavDone()
    for (const row of rows) {
      const prev = previousStatusById.get(row.id)
      if (prev === undefined) {
        // First observation — seed only; do not treat as a transition.
        previousStatusById.set(row.id, row.status)
        continue
      }
      previousStatusById.set(row.id, row.status)
      if (prev !== 'awaiting_review' || row.status !== 'reviewed') {
        continue
      }
      if (done.has(row.id)) {
        continue
      }
      done.add(row.id)
      writeAutoNavDone(done)
      if (row.conversation_id) {
        journey.conversationId = row.conversation_id
      }
      if (row.health_report_id) {
        journey.reportId = row.health_report_id
      }
      journey.expertReviewStatus = 'reviewed'
      void navigateTo(localePath('/chat'))
      return
    }
  }

  async function refresh(options: { silent?: boolean } = {}) {
    if (!auth.isMember) {
      reviews.value = []
      journey.expertReviewStatus = 'none'
      stopPoll()
      return
    }
    if (!options.silent) {
      loading.value = true
    }
    error.value = ''
    try {
      const list = await candor.listExpertCaseReviews({ limit: 50 })
      const rows = list.expert_case_reviews ?? []
      reviews.value = rows
      journey.expertReviewStatus = statusFromList(rows, journey.conversationId)
      maybeAutoNavToChat(rows)
    } catch {
      error.value = 'load_failed'
    } finally {
      loading.value = false
    }
  }

  function startPoll() {
    if (!import.meta.client || pollTimer || !auth.isMember) {
      return
    }
    pollTimer = setInterval(() => {
      void refresh({ silent: true })
    }, POLL_MS)
  }

  onMounted(() => {
    if (!import.meta.client) {
      return
    }
    void refresh().then(() => startPoll())
  })

  onUnmounted(() => {
    stopPoll()
  })

  watch(() => auth.isMember, (member) => {
    if (member) {
      void refresh().then(() => startPoll())
    } else {
      stopPoll()
      reviews.value = []
      journey.expertReviewStatus = 'none'
    }
  })

  return {
    reviews,
    loading,
    error,
    refresh,
    stopPoll
  }
}
