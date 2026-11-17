import type { RecommendationPackageItem } from './candor-api'

/** Display label for a package item row. */
export function packageItemDisplayName(
  item: Pick<RecommendationPackageItem, 'name' | 'code'> | null | undefined,
  options: { preferCodeFallback?: boolean } = {}
): string {
  if (!item) {
    return ''
  }
  // Recommendations: keep raw `name` (including empty／null → blank).
  if (!options.preferCodeFallback) {
    return typeof item.name === 'string' ? item.name : ''
  }
  const name = typeof item.name === 'string' ? item.name.trim() : ''
  if (name) {
    return name
  }
  const code = typeof item.code === 'string' ? item.code.trim() : ''
  return code
}

/** Rows that can be shown in checkout package summary (name or code). */
export function visiblePackageItems(
  items: RecommendationPackageItem[] | null | undefined
): RecommendationPackageItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    return []
  }
  return items.filter((item) => {
    const name = typeof item.name === 'string' ? item.name.trim() : ''
    const code = typeof item.code === 'string' ? item.code.trim() : ''
    return Boolean(name || code)
  })
}

export function packageItemDoseLabel(
  t: (key: string, values?: Record<string, unknown>) => string,
  dailyDose: number
): string {
  const count = Number.isFinite(dailyDose) ? String(dailyDose) : String(dailyDose)
  return t('recommendation.doseLocked', { count })
}
