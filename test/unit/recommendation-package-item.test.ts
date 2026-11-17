import { describe, expect, it } from 'vitest'
import {
  packageItemDisplayName,
  packageItemDoseLabel,
  visiblePackageItems
} from '../../app/utils/recommendation-package-item'

describe('packageItemDisplayName', () => {
  it('keeps raw name for recommendations (no code fallback)', () => {
    expect(packageItemDisplayName({ name: '維生素 D', code: 'vitamin_d' })).toBe('維生素 D')
    expect(packageItemDisplayName({ name: null, code: 'vitamin_d' })).toBe('')
    expect(packageItemDisplayName({ name: undefined, code: 'vitamin_d' })).toBe('')
  })

  it('falls back to code for checkout when name is blank', () => {
    expect(packageItemDisplayName(
      { name: null, code: 'vitamin_d' },
      { preferCodeFallback: true }
    )).toBe('vitamin_d')
    expect(packageItemDisplayName(
      { name: '   ', code: 'iron' },
      { preferCodeFallback: true }
    )).toBe('iron')
  })
})

describe('packageItemDoseLabel', () => {
  it('formats daily dose with i18n key values', () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      key === 'recommendation.doseLocked' ? `每日 ${values?.count} 顆` : key
    expect(packageItemDoseLabel(t, 1)).toBe('每日 1 顆')
    expect(packageItemDoseLabel(t, 2)).toBe('每日 2 顆')
  })
})

describe('visiblePackageItems', () => {
  it('preserves image_url and is_core for row rendering', () => {
    const rows = visiblePackageItems([
      {
        rank: 1,
        sellable_item_id: 'a',
        code: 'vitamin_d',
        name: '維生素 D',
        daily_dose: 1,
        is_core: true,
        image_url: 'https://cdn.example/catalog/vitamin_d.png'
      },
      {
        rank: 2,
        sellable_item_id: 'b',
        code: 'iron',
        name: '鐵蛋白調理',
        daily_dose: 1,
        is_core: false,
        image_url: null
      }
    ])
    expect(rows[0]?.is_core).toBe(true)
    expect(rows[0]?.image_url).toContain('vitamin_d.png')
    expect(rows[1]?.is_core).toBe(false)
    expect(rows[1]?.image_url).toBeNull()
  })
})
