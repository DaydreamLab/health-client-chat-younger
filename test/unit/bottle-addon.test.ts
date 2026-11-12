import { describe, expect, it } from 'vitest'
import {
  addonCodesQueryValue,
  addonRowDisplayAmount,
  bottleAddonsFromOrderLines,
  catalogFromRecommendationAddons,
  catalogToSnapshots,
  droppedAddonCodes,
  intersectAddonCodes,
  normalizeAddonCodes,
  orderBottleAddonsFromSnapshots,
  parseBottleAddonCatalog,
  parseBottleAddonSnapshots,
  parseRecommendationAddons,
  resolveCheckoutAddonState,
  resolveCheckoutKind,
  retainAddonSelection
} from '../../app/utils/bottle-addon'

describe('parseRecommendationAddons', () => {
  it('parses RecommendationBottleAddon fields (sellable_item_*)', () => {
    expect(parseRecommendationAddons([
      {
        sellable_item_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        sellable_item_code: 'omega3',
        sellable_item_name: 'Omega-3',
        bottle_price: 890,
        qty: 1,
        reason: '相關加購'
      },
      // Legacy/wrong shape without sellable_item_* must be dropped
      { code: 'omega3', name: 'Omega-3', bottle_price: 890, qty: 1 }
    ])).toEqual([
      {
        sellable_item_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        sellable_item_code: 'omega3',
        sellable_item_name: 'Omega-3',
        bottle_price: 890,
        qty: 1,
        reason: '相關加購'
      }
    ])
  })

  it('returns empty for missing／null addons', () => {
    expect(parseRecommendationAddons(null)).toEqual([])
    expect(parseRecommendationAddons(undefined)).toEqual([])
  })
})

describe('parseBottleAddonSnapshots', () => {
  it('reads BottleAddonSnapshot amount (not line_total)', () => {
    expect(parseBottleAddonSnapshots([
      {
        sellable_item_code: 'omega3',
        sellable_item_name: 'Omega-3',
        bottle_price: 890,
        qty: 1,
        amount: 890
      },
      // Missing amount → drop
      {
        sellable_item_code: 'iron',
        sellable_item_name: '鐵',
        bottle_price: 100,
        qty: 1
      }
    ])).toEqual([
      {
        sellable_item_code: 'omega3',
        sellable_item_name: 'Omega-3',
        bottle_price: 890,
        qty: 1,
        amount: 890
      }
    ])
  })
})

describe('orderBottleAddonsFromSnapshots', () => {
  it('maps snapshots for order detail display', () => {
    expect(orderBottleAddonsFromSnapshots([
      {
        sellable_item_code: 'omega3',
        sellable_item_name: 'Omega-3',
        qty: 1,
        bottle_price: 890,
        amount: 890
      }
    ])).toEqual([
      {
        code: 'omega3',
        name: 'Omega-3',
        qty: 1,
        bottlePrice: 890,
        lineTotal: 890
      }
    ])
  })
})

describe('bottleAddonsFromOrderLines', () => {
  it('extracts bottle_addon lines only as fallback', () => {
    expect(bottleAddonsFromOrderLines([
      { kind: 'package', package_plan_code: 'basic' },
      {
        kind: 'bottle_addon',
        sellable_item_code: 'omega3',
        sellable_item_name: 'Omega-3',
        qty: 1,
        bottle_price: 890,
        amount: 890
      }
    ])).toEqual([
      {
        code: 'omega3',
        name: 'Omega-3',
        qty: 1,
        bottlePrice: 890,
        lineTotal: 890
      }
    ])
  })
})

describe('addon code helpers', () => {
  it('normalizes and intersects selected codes', () => {
    expect(normalizeAddonCodes([' omega3 ', 'omega3', '', 'iron'])).toEqual([
      'omega3',
      'iron'
    ])
    expect(intersectAddonCodes(
      ['omega3', 'gone'],
      [{ sellable_item_code: 'omega3' }]
    )).toEqual(['omega3'])
  })

  it('lists codes dropped after intersect／re-recommend', () => {
    expect(droppedAddonCodes(['omega3', 'iron'], ['omega3'])).toEqual(['iron'])
    expect(droppedAddonCodes(['omega3'], ['omega3', 'iron'])).toEqual([])
  })

  it('builds addon_codes query value or omits when empty', () => {
    expect(addonCodesQueryValue(['omega3', ' iron '])).toBe('omega3,iron')
    expect(addonCodesQueryValue([])).toBeUndefined()
  })
})

describe('resolveCheckoutKind', () => {
  it('treats missing kind + package_plan_code as AI package', () => {
    expect(resolveCheckoutKind({ package_plan_code: 'basic' })).toBe('package')
    expect(resolveCheckoutKind({ kind: 'package', package_plan_code: 'basic' })).toBe('package')
    expect(resolveCheckoutKind({ kind: 'expert_plan' })).toBe('expert_plan')
    expect(resolveCheckoutKind({})).toBe('expert_plan')
    // bare `code` alone must not force package (expert uses code=)
    expect(resolveCheckoutKind({ kind: undefined })).toBe('expert_plan')
  })
})

describe('addonRowDisplayAmount', () => {
  it('uses preview amount when selected, bottle_price when cancelled', () => {
    const row = { amount: 999, bottle_price: 890 }
    expect(addonRowDisplayAmount(row, true)).toBe(999)
    expect(addonRowDisplayAmount(row, false)).toBe(890)
  })
})

describe('bottle addon catalog', () => {
  const recoAddons = [{
    sellable_item_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    sellable_item_code: 'omega3',
    sellable_item_name: 'Omega-3',
    bottle_price: 890,
    qty: 1,
    reason: '相關'
  }, {
    sellable_item_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    sellable_item_code: 'd3k',
    sellable_item_name: 'D3+K',
    bottle_price: 650,
    qty: 1,
    reason: '相關'
  }]

  it('builds catalog from first-selected recommendation addons', () => {
    expect(catalogFromRecommendationAddons(recoAddons, ['d3k'])).toEqual([{
      sellable_item_code: 'd3k',
      sellable_item_name: 'D3+K',
      bottle_price: 650,
      qty: 1
    }])
    expect(parseBottleAddonCatalog([{ sellable_item_code: 'x' }])).toEqual([])
  })

  it('maps catalog to snapshots for cancelled-row display', () => {
    expect(catalogToSnapshots([{
      sellable_item_code: 'omega3',
      sellable_item_name: 'Omega-3',
      bottle_price: 890,
      qty: 1
    }])).toEqual([{
      sellable_item_code: 'omega3',
      sellable_item_name: 'Omega-3',
      qty: 1,
      bottle_price: 890,
      amount: 890
    }])
  })

  it('checkout state keeps catalog eligible when URL has no addon_codes', () => {
    const catalog = catalogFromRecommendationAddons(recoAddons, ['omega3', 'd3k'])
    expect(resolveCheckoutAddonState({
      catalog,
      routeCodes: [],
      journeySelected: []
    })).toEqual({
      eligibleCodes: ['omega3', 'd3k'],
      selectedCodes: [],
      rows: catalogToSnapshots(catalog)
    })
    expect(resolveCheckoutAddonState({
      catalog,
      routeCodes: null,
      journeySelected: ['omega3']
    }).selectedCodes).toEqual(['omega3'])
  })
})

describe('retainAddonSelection', () => {
  it('keeps checks when addon still recommended; drops only when gone', () => {
    expect(retainAddonSelection(
      ['omega3', 'd3k'],
      [{ sellable_item_code: 'omega3' }, { sellable_item_code: 'd3k' }]
    )).toEqual({ selected: ['omega3', 'd3k'], dropped: [] })
    expect(retainAddonSelection(
      ['omega3', 'd3k'],
      [{ sellable_item_code: 'omega3' }]
    )).toEqual({ selected: ['omega3'], dropped: ['d3k'] })
    expect(retainAddonSelection(
      [],
      [{ sellable_item_code: 'omega3' }]
    )).toEqual({ selected: [], dropped: [] })
  })
})
