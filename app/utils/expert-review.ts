import type {
  ExpertCaseReviewListItem,
  ExpertCaseReviewStatus,
  RecommendationPackage,
  RecommendationResponse
} from '~/utils/candor-api'
import type { ExpertReviewUiStatus } from '~/utils/chat-turn-actions'

/** Map a member list (or per-conversation) status into journey UI status. */
export function expertReviewUiStatusFromRow(
  status: ExpertCaseReviewListItem['status'] | ExpertCaseReviewStatus['status'] | null | undefined
): ExpertReviewUiStatus {
  if (status === 'reviewed') {
    return 'reviewed'
  }
  if (status === 'awaiting_review') {
    return 'awaiting_review'
  }
  return 'none'
}

/**
 * Pick UI status for the active conversation from GET /expert-case-reviews.
 * No match and empty list → none; no match but other cases exist → leave caller to keep prior.
 */
export function expertReviewUiStatusFromList(
  rows: Array<Pick<ExpertCaseReviewListItem, 'conversation_id' | 'status'>>,
  conversationId: string | null
): ExpertReviewUiStatus | null {
  if (!rows.length) {
    return 'none'
  }
  if (!conversationId) {
    return expertReviewUiStatusFromRow(rows[0]?.status)
  }
  const match = rows.find(row => row.conversation_id === conversationId)
  if (!match) {
    return null
  }
  return expertReviewUiStatusFromRow(match.status)
}

/** Active (non-removed) items for display and checkout. */
export function activePackageItems<T extends { removed?: boolean }>(items: T[]): T[] {
  return items.filter(item => item.removed !== true)
}

export function packagesForCheckout(packages: RecommendationPackage[]): RecommendationPackage[] {
  return packages.map(pkg => ({
    ...pkg,
    items: activePackageItems(pkg.items ?? [])
  }))
}

/**
 * Map GET/POST expert-review reviewed payload into the shape recommendations.vue expects.
 */
export function recommendationFromExpertReview(
  review: ExpertCaseReviewStatus
): RecommendationResponse | null {
  if (review.status !== 'reviewed') {
    return null
  }
  const packages = packagesForCheckout(review.packages ?? [])
  const weightSet = review.weight_set
  return {
    run_id: review.recommendation_run_id,
    report_id: null,
    weight_set: {
      id: typeof weightSet?.id === 'string' ? weightSet.id : '',
      version: typeof weightSet?.version === 'string' ? weightSet.version : ''
    },
    generated_at: review.reviewed_at ?? review.created_at,
    copy_mode: 'template',
    summary: review.summary ?? {
      top_domains: [],
      data_gaps: [],
      profile_gaps: [],
      strategy_code: '',
      message: null
    },
    items: [],
    packages
  }
}
