import type {
  ExpertCaseReviewStatus,
  RecommendationPackage,
  RecommendationResponse
} from '~/utils/candor-api'

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
