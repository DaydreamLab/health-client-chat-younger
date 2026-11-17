/**
 * Labels for checkout package summary (kind=package).
 * Prefer `name` from GET /checkout/preview `ai.items[]` (RecommendationPackageItem);
 * fall back to `code` when name is missing. Skip rows with neither.
 */
export function packageItemDisplayLabels(
  items: Array<{
    sellable_item_id?: string | null
    code?: string | null
    name?: string | null
  }> | null | undefined
): Array<{ key: string, label: string }> {
  if (!Array.isArray(items) || items.length === 0) {
    return []
  }
  const out: Array<{ key: string, label: string }> = []
  for (const item of items) {
    const name = typeof item.name === 'string' ? item.name.trim() : ''
    const code = typeof item.code === 'string' ? item.code.trim() : ''
    const label = name || code
    if (!label) {
      continue
    }
    const id = typeof item.sellable_item_id === 'string' ? item.sellable_item_id.trim() : ''
    out.push({
      key: id || code || label,
      label
    })
  }
  return out
}
