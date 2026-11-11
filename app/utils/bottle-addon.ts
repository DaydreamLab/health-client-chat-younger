/**
 * Bottle addon (整瓶加購) helpers — shapes from candor-core OpenAPI
 * (PR① order/preview lines; PR② recommendations.addons[]).
 */
import type {
  CheckoutPreviewBottleAddon,
  RecommendationBottleAddon
} from '~/utils/candor-api'

export interface OrderBottleAddonLine {
  code: string
  name: string
  qty: number
  bottlePrice: number
  lineTotal: number
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed || null
}

function asNonNegativeInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }
  const n = Math.trunc(value)
  return n >= 0 ? n : null
}

/** Parse POST /recommendations `addons[]` rows; skip malformed entries. */
export function parseRecommendationAddons(raw: unknown): RecommendationBottleAddon[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const rows: RecommendationBottleAddon[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue
    }
    const row = entry as Record<string, unknown>
    const sellable_item_id = asNonEmptyString(row.sellable_item_id)
    const code = asNonEmptyString(row.code)
    const name = asNonEmptyString(row.name)
    const bottle_price = asNonNegativeInt(row.bottle_price)
    if (!sellable_item_id || !code || !name || bottle_price == null) {
      continue
    }
    const qty = asNonNegativeInt(row.qty) ?? 1
    rows.push({
      sellable_item_id,
      code,
      name,
      bottle_price,
      qty: qty > 0 ? qty : 1,
      reason: asNonEmptyString(row.reason)
    })
  }
  return rows
}

/** Parse checkout preview confirmed addon lines (mode=ai). */
export function parseCheckoutBottleAddons(raw: unknown): CheckoutPreviewBottleAddon[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const rows: CheckoutPreviewBottleAddon[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue
    }
    const row = entry as Record<string, unknown>
    const code = asNonEmptyString(row.code) ?? asNonEmptyString(row.sellable_item_code)
    const name = asNonEmptyString(row.name) ?? asNonEmptyString(row.sellable_item_name) ?? code
    const bottle_price = asNonNegativeInt(row.bottle_price)
      ?? asNonNegativeInt(row.unit_price)
    if (!code || !name || bottle_price == null) {
      continue
    }
    const qty = asNonNegativeInt(row.qty) ?? 1
    const line_total = asNonNegativeInt(row.line_total)
      ?? asNonNegativeInt(row.amount)
      ?? undefined
    rows.push({
      sellable_item_id: asNonEmptyString(row.sellable_item_id) ?? undefined,
      code,
      name,
      bottle_price,
      qty: qty > 0 ? qty : 1,
      ...(line_total != null ? { line_total } : {})
    })
  }
  return rows
}

/** Extract bottle_addon lines from order detail `lines[]`. */
export function bottleAddonsFromOrderLines(
  lines: Array<Record<string, unknown>> | null | undefined
): OrderBottleAddonLine[] {
  if (!Array.isArray(lines)) {
    return []
  }
  const rows: OrderBottleAddonLine[] = []
  for (const line of lines) {
    if (!line || typeof line !== 'object' || line.kind !== 'bottle_addon') {
      continue
    }
    const code = asNonEmptyString(line.sellable_item_code)
      ?? asNonEmptyString(line.code)
    const name = asNonEmptyString(line.sellable_item_name)
      ?? asNonEmptyString(line.name)
      ?? code
    const bottlePrice = asNonNegativeInt(line.bottle_price)
      ?? asNonNegativeInt(line.unit_price)
      ?? 0
    const qty = asNonNegativeInt(line.qty) ?? 1
    const lineTotal = asNonNegativeInt(line.line_total)
      ?? asNonNegativeInt(line.amount)
      ?? bottlePrice * (qty > 0 ? qty : 1)
    if (!code || !name) {
      continue
    }
    rows.push({
      code,
      name,
      qty: qty > 0 ? qty : 1,
      bottlePrice,
      lineTotal
    })
  }
  return rows
}

export function normalizeAddonCodes(codes: string[] | null | undefined): string[] {
  if (!Array.isArray(codes)) {
    return []
  }
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of codes) {
    const code = typeof raw === 'string' ? raw.trim() : ''
    if (!code || seen.has(code)) {
      continue
    }
    seen.add(code)
    out.push(code)
  }
  return out
}

/** Keep only codes still present in the latest recommendations addons list. */
export function intersectAddonCodes(
  selected: string[] | null | undefined,
  available: Array<{ code: string }>
): string[] {
  const allowed = new Set(available.map(item => item.code).filter(Boolean))
  return normalizeAddonCodes(selected).filter(code => allowed.has(code))
}

export function addonLineTotal(line: {
  bottle_price: number
  qty: number
  line_total?: number
}): number {
  if (typeof line.line_total === 'number' && Number.isFinite(line.line_total)) {
    return Math.trunc(line.line_total)
  }
  return Math.trunc(line.bottle_price) * Math.max(1, Math.trunc(line.qty) || 1)
}
