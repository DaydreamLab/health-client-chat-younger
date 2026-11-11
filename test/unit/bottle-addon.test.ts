import { describe, expect, it } from 'vitest'
import {
  bottleAddonsFromOrderLines,
  intersectAddonCodes,
  normalizeAddonCodes,
  orderBottleAddonsFromSnapshots,
  parseBottleAddonSnapshots,
  parseRecommendationAddons
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
})
