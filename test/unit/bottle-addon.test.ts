import { describe, expect, it } from 'vitest'
import {
  bottleAddonsFromOrderLines,
  intersectAddonCodes,
  normalizeAddonCodes,
  parseCheckoutBottleAddons,
  parseRecommendationAddons
} from '../../app/utils/bottle-addon'

describe('parseRecommendationAddons', () => {
  it('parses core PR② addons rows', () => {
    expect(parseRecommendationAddons([
      {
        sellable_item_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        code: 'omega3',
        name: 'Omega-3',
        bottle_price: 890,
        qty: 1,
        reason: '相關加購'
      },
      { code: 'broken' }
    ])).toEqual([
      {
        sellable_item_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        code: 'omega3',
        name: 'Omega-3',
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

describe('parseCheckoutBottleAddons', () => {
  it('reads preview addon lines with line_total', () => {
    expect(parseCheckoutBottleAddons([
      {
        code: 'omega3',
        name: 'Omega-3',
        bottle_price: 890,
        qty: 1,
        line_total: 890
      }
    ])).toEqual([
      {
        code: 'omega3',
        name: 'Omega-3',
        bottle_price: 890,
        qty: 1,
        line_total: 890
      }
    ])
  })
})

describe('bottleAddonsFromOrderLines', () => {
  it('extracts bottle_addon lines only', () => {
    expect(bottleAddonsFromOrderLines([
      { kind: 'package', package_plan_code: 'basic' },
      {
        kind: 'bottle_addon',
        sellable_item_code: 'omega3',
        sellable_item_name: 'Omega-3',
        qty: 1,
        bottle_price: 890,
        line_total: 890
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
    expect(intersectAddonCodes(['omega3', 'gone'], [{ code: 'omega3' }])).toEqual([
      'omega3'
    ])
  })
})
