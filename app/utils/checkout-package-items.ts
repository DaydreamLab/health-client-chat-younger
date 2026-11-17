import type { RecommendationPackageItem } from './candor-api'
import {
  packageItemDisplayName,
  visiblePackageItems
} from './recommendation-package-item'

/**
 * Labels for checkout package summary (kind=package).
 * Prefer `name` from GET /checkout/preview `ai.items[]` (RecommendationPackageItem);
 * fall back to `code` when name is missing. Skip rows with neither.
 *
 * Prefer rendering RecommendationPackageItemRow with visiblePackageItems.
 */
export function packageItemDisplayLabels(
  items: Array<{
    sellable_item_id?: string | null
    code?: string | null
    name?: string | null
  }> | null | undefined
): Array<{ key: string, label: string }> {
  const visible = visiblePackageItems(items as RecommendationPackageItem[] | null | undefined)
  return visible.map((item) => {
    const label = packageItemDisplayName(item, { preferCodeFallback: true })
    const id = typeof item.sellable_item_id === 'string' ? item.sellable_item_id.trim() : ''
    const code = typeof item.code === 'string' ? item.code.trim() : ''
    return {
      key: id || code || label,
      label
    }
  })
}
