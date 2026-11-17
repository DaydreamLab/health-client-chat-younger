import { describe, expect, it } from 'vitest'
import { packageItemDisplayLabels } from '../../app/utils/checkout-package-items'

describe('packageItemDisplayLabels (checkout package summary)', () => {
  it('lists names from preview.ai.items when present', () => {
    expect(packageItemDisplayLabels([
      {
        rank: 1,
        sellable_item_id: 'dddddddd-dddd-dddd-dddd-dddddddddd01',
        code: 'vitamin_d',
        name: '維生素 D'
      },
      {
        rank: 2,
        sellable_item_id: 'dddddddd-dddd-dddd-dddd-dddddddddd02',
        code: 'iron',
        name: '鐵蛋白調理'
      }
    ] as Array<{ sellable_item_id: string, code: string, name: string }>)).toEqual([
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
