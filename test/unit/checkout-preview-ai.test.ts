import { describe, expect, it } from 'vitest'
import type {
  CheckoutPreview,
  CheckoutPreviewAiPackage,
  RecommendationPackageItem
} from '~/utils/candor-api'

/** Mirrors checkout.vue aiPackageFromPreview — keep in sync with Spec 33 preview.ai. */
function aiPackageFromPreview(ai: CheckoutPreviewAiPackage) {
  return {
    package_plan_code: ai.package_plan_code,
    package_plan_name: ai.package_plan_name,
    price: ai.price,
    period_days: ai.period_days ?? 30,
    items: Array.isArray(ai.items) ? ai.items : [],
    used_amount: ai.used_amount ?? 0,
    remaining: ai.remaining ?? 0,
    composition_hash: ai.composition_hash ?? ''
  }
}

describe('checkout preview ai.items (spec 33 / core #143)', () => {
  const items: RecommendationPackageItem[] = [
    {
      rank: 1,
      sellable_item_id: 'dddddddd-dddd-dddd-dddd-dddddddddd01',
      code: 'vitamin_d',
      name: '維生素 D',
      daily_dose: 1,
      daily_servings_max: 2,
      score_raw: 1,
      is_core: true,
      image_url: null
    }
  ]

  it('maps CheckoutPreviewAiPackage items into RecommendationPackage shape', () => {
    const ai: CheckoutPreviewAiPackage = {
      package_plan_code: 'basic',
      package_plan_name: '基礎保養方案',
      name_zh: '基礎保養方案',
      price: 1980,
      period_days: 30,
      item_count: 1,
      used_amount: 280,
      remaining: 1700,
      composition_hash: 'sha256:basic',
      items
    }
    const pkg = aiPackageFromPreview(ai)
    expect(pkg.package_plan_code).toBe('basic')
    expect(pkg.package_plan_name).toBe('基礎保養方案')
    expect(pkg.price).toBe(1980)
    expect(pkg.items).toEqual(items)
    expect(pkg.items[0]?.code).toBe('vitamin_d')
    expect(pkg.items[0]?.score_raw).toBe(1)
    expect(pkg.composition_hash).toBe('sha256:basic')
  })

  it('does not invent items when preview returns an empty list', () => {
    const ai: CheckoutPreviewAiPackage = {
      package_plan_code: 'basic',
      package_plan_name: '基礎保養方案',
      name_zh: '基礎保養方案',
      price: 1980,
      period_days: 30,
      item_count: 0,
      items: []
    }
    expect(aiPackageFromPreview(ai).items).toEqual([])
  })

  it('carries package／addon totals on ai.* (not top-level)', () => {
    const preview: CheckoutPreview = {
      conversation_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      mode: 'ai',
      block: null,
      checkout_locked: false,
      shipping: { fee: 0, free: true },
      payment_methods: [],
      expert_plans: [],
      ai: {
        package_plan_code: 'basic',
        package_plan_name: '基礎保養',
        name_zh: '基礎保養',
        price: 1980,
        period_days: 30,
        item_count: 1,
        composition_hash: 'sha256:basic',
        items,
        bottle_addons: [{
          sellable_item_code: 'omega3',
          sellable_item_name: 'Omega-3',
          bottle_price: 890,
          qty: 1,
          amount: 890
        }],
        addon_subtotal: 890,
        amount_total: 2870
      }
    }
    expect(preview.ai?.price).toBe(1980)
    expect(preview.ai?.addon_subtotal).toBe(890)
    expect(preview.ai?.amount_total).toBe(2870)
    expect(preview.ai?.bottle_addons?.[0]?.sellable_item_code).toBe('omega3')
    expect(preview.ai?.bottle_addons?.[0]?.amount).toBe(890)
    // Top-level amount fields must not exist on CheckoutPreview
    expect('package_subtotal' in preview).toBe(false)
    expect('addon_subtotal' in preview).toBe(false)
    expect('amount_total' in preview).toBe(false)
  })

  it('tolerates core #146 existing_order object or null on CheckoutPreview', () => {
    const withOrder: CheckoutPreview = {
      conversation_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      mode: 'expert',
      block: null,
      checkout_locked: false,
      shipping: { fee: 0, free: true },
      payment_methods: [],
      expert_plans: [],
      ai: null,
      existing_order: {
        order_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        order_no: 'ORD-260101-000001',
        expert_plan_code: 'basic',
        payment_status: 'pending',
        extra: true
      }
    }
    expect(withOrder.existing_order?.order_id).toBe('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')
    const aiNull: CheckoutPreview = {
      conversation_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      mode: 'ai',
      block: null,
      checkout_locked: false,
      shipping: { fee: 0, free: true },
      payment_methods: [],
      expert_plans: [],
      ai: null,
      existing_order: null
    }
    expect(aiNull.existing_order).toBeNull()
  })
})
