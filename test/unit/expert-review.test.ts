import { describe, expect, it } from 'vitest'
import {
  activePackageItems,
  packagesForCheckout,
  recommendationFromExpertReview
} from '../../app/utils/expert-review'
import type { ExpertCaseReviewStatus, RecommendationPackage } from '../../app/utils/candor-api'

describe('expert-review helpers', () => {
  it('filters removed items for checkout', () => {
    expect(activePackageItems([
      { code: 'a', removed: false },
      { code: 'b', removed: true },
      { code: 'c' }
    ]).map(i => i.code)).toEqual(['a', 'c'])
  })

  it('maps reviewed expert review into recommendation packages', () => {
    const packages: RecommendationPackage[] = [{
      package_plan_code: 'basic',
      package_plan_name: '基礎',
      price: 1000,
      period_days: 30,
      used_amount: 1000,
      remaining: 0,
      composition_hash: 'sha256:rev',
      items: [
        {
          rank: 1,
          sellable_item_id: 's1',
          code: 'keep',
          unit_price: 10,
          daily_dose: 1,
          monthly_cost: 300,
          removed: false
        },
        {
          rank: 0,
          sellable_item_id: 's2',
          code: 'gone',
          unit_price: 10,
          daily_dose: 1,
          monthly_cost: 300,
          removed: true
        }
      ]
    }]
    const review: ExpertCaseReviewStatus = {
      id: 'r1',
      conversation_id: 'c1',
      status: 'reviewed',
      recommendation_run_id: 'run-1',
      created_at: '2026-01-01T00:00:00Z',
      reviewed_at: '2026-01-02T00:00:00Z',
      packages,
      weight_set: { id: 'ws', version: '1.0.0' }
    }
    const mapped = recommendationFromExpertReview(review)
    expect(mapped?.run_id).toBe('run-1')
    expect(packagesForCheckout(packages)[0]?.items.map(i => i.code)).toEqual(['keep'])
    expect(mapped?.packages[0]?.items).toHaveLength(1)
  })

  it('returns null while awaiting_review', () => {
    expect(recommendationFromExpertReview({
      id: 'r1',
      conversation_id: 'c1',
      status: 'awaiting_review',
      recommendation_run_id: 'run-1',
      created_at: '2026-01-01T00:00:00Z'
    })).toBeNull()
  })
})
