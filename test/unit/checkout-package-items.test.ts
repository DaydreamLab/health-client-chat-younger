import { describe, expect, it } from 'vitest'
import { packageItemDisplayLabels } from '../../app/utils/checkout-package-items'
import type { RecommendationPackageItem } from '../../app/utils/candor-api'
import { visiblePackageItems } from '../../app/utils/recommendation-package-item'

const sampleItems: RecommendationPackageItem[] = [
  {
    rank: 1,
    sellable_item_id: 'dddddddd-dddd-dddd-dddd-dddddddddd01',
    code: 'vitamin_d',
    name: '維生素 D',
    daily_dose: 1,
    is_core: true,
    image_url: 'https://cdn.example/catalog/vitamin_d.png'
  },
  {
    rank: 2,
    sellable_item_id: 'dddddddd-dddd-dddd-dddd-dddddddddd02',
    code: 'iron',
    name: '鐵蛋白調理',
    daily_dose: 1,
    is_core: false,
    image_url: null
  }
]

describe('visiblePackageItems (checkout package summary)', () => {
  it('keeps items that have name or code, including with／without image_url', () => {
    expect(visiblePackageItems(sampleItems)).toHaveLength(2)
    expect(visiblePackageItems(sampleItems)[0]?.image_url).toBe(
      'https://cdn.example/catalog/vitamin_d.png'
    )
    expect(visiblePackageItems(sampleItems)[1]?.image_url).toBeNull()
  })

  it('drops rows that have neither name nor code', () => {
    expect(visiblePackageItems([
      {
        rank: 1,
        sellable_item_id: 'x',
        code: '',
        name: null,
        daily_dose: 1
      },
      {
        rank: 2,
        sellable_item_id: '',
        code: '  ',
        name: '  ',
        daily_dose: 1
      }
    ])).toEqual([])
  })

  it('returns empty when items are empty or missing', () => {
    expect(visiblePackageItems([])).toEqual([])
    expect(visiblePackageItems(null)).toEqual([])
    expect(visiblePackageItems(undefined)).toEqual([])
  })
})

describe('packageItemDisplayLabels (checkout package summary)', () => {
  it('lists names from preview.ai.items when present', () => {
    expect(packageItemDisplayLabels(sampleItems)).toEqual([
      { key: 'dddddddd-dddd-dddd-dddd-dddddddddd01', label: '維生素 D' },
      { key: 'dddddddd-dddd-dddd-dddd-dddddddddd02', label: '鐵蛋白調理' }
    ])
  })

  it('falls back to code when name is missing (品項讀不到)', () => {
    expect(packageItemDisplayLabels([
      {
        sellable_item_id: 'dddddddd-dddd-dddd-dddd-dddddddddd01',
        code: 'vitamin_d',
        name: null
      },
      {
        sellable_item_id: 'dddddddd-dddd-dddd-dddd-dddddddddd02',
        code: 'iron',
        name: '   '
      }
    ])).toEqual([
      { key: 'dddddddd-dddd-dddd-dddd-dddddddddd01', label: 'vitamin_d' },
      { key: 'dddddddd-dddd-dddd-dddd-dddddddddd02', label: 'iron' }
    ])
  })

  it('returns empty when items are empty or labels cannot be resolved', () => {
    expect(packageItemDisplayLabels([])).toEqual([])
    expect(packageItemDisplayLabels(null)).toEqual([])
    expect(packageItemDisplayLabels(undefined)).toEqual([])
    expect(packageItemDisplayLabels([
      { sellable_item_id: 'x', code: '', name: null },
      { sellable_item_id: '', code: '  ', name: '  ' }
    ])).toEqual([])
  })
})
