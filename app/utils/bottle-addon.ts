/**
 * Bottle addon (整瓶加購) helpers — shapes from candor-core OpenAPI
 * (schemas.RecommendationBottleAddon / BottleAddonSnapshot).
 */
import type {
  BottleAddonSnapshot,
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

/** Parse POST /recommendations `addons[]` (RecommendationBottleAddon). */
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
    const sellable_item_code = asNonEmptyString(row.sellable_item_code)
    const sellable_item_name = asNonEmptyString(row.sellable_item_name)
    const bottle_price = asNonNegativeInt(row.bottle_price)
    const reason = asNonEmptyString(row.reason) ?? ''
    if (!sellable_item_id || !sellable_item_code || !sellable_item_name || bottle_price == null) {
      continue
    }
    const qty = asNonNegativeInt(row.qty) ?? 1
    rows.push({
      sellable_item_id,
      sellable_item_code,
      sellable_item_name,
      bottle_price,
      qty: qty > 0 ? qty : 1,
      reason
    })
  }
  return rows
}

/** Parse checkout preview `ai.bottle_addons` / order `bottle_addons`. */
export function parseBottleAddonSnapshots(raw: unknown): BottleAddonSnapshot[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const rows: BottleAddonSnapshot[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue
    }
    const row = entry as Record<string, unknown>
    const sellable_item_code = asNonEmptyString(row.sellable_item_code)
    const sellable_item_name = asNonEmptyString(row.sellable_item_name)
    const bottle_price = asNonNegativeInt(row.bottle_price)
    const amount = asNonNegativeInt(row.amount)
    if (!sellable_item_code || !sellable_item_name || bottle_price == null || amount == null) {
      continue
    }
    const qty = asNonNegativeInt(row.qty) ?? 1
    rows.push({
      sellable_item_code,
      sellable_item_name,
      qty: qty > 0 ? qty : 1,
      bottle_price,
      amount
    })
  }
  return rows
}

/** @deprecated Prefer parseBottleAddonSnapshots. */
export function parseCheckoutBottleAddons(raw: unknown): BottleAddonSnapshot[] {
  return parseBottleAddonSnapshots(raw)
}

/** Map BottleAddonSnapshot rows into order-detail display records. */
export function orderBottleAddonsFromSnapshots(
  raw: unknown
): OrderBottleAddonLine[] {
  return parseBottleAddonSnapshots(raw).map(row => ({
    code: row.sellable_item_code,
    name: row.sellable_item_name,
    qty: row.qty,
    bottlePrice: row.bottle_price,
    lineTotal: row.amount
  }))
}

/**
 * Fallback: extract bottle_addon from order `lines[]` when `bottle_addons` absent.
 * Prefer OrderDetail.bottle_addons from core.
 */
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
    const name = asNonEmptyString(line.sellable_item_name)
      ?? asNonEmptyString(line.name)
      ?? code
    const bottlePrice = asNonNegativeInt(line.bottle_price) ?? 0
    const qty = asNonNegativeInt(line.qty) ?? 1
    const lineTotal = asNonNegativeInt(line.amount)
      ?? asNonNegativeInt(line.line_total)
      ?? bottlePrice
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
  available: Array<{ sellable_item_code: string }>
): string[] {
  const allowed = new Set(
    available.map(item => item.sellable_item_code).filter(Boolean)
  )
  return normalizeAddonCodes(selected).filter(code => allowed.has(code))
}

/** Codes present in `previous` but missing from `next` (after intersect／re-recommend). */
export function droppedAddonCodes(
  previous: string[] | null | undefined,
  next: string[] | null | undefined
): string[] {
  const nextSet = new Set(normalizeAddonCodes(next))
  return normalizeAddonCodes(previous).filter(code => !nextSet.has(code))
}

export type CheckoutKind = 'expert_plan' | 'package'

/**
 * Resolve checkout mode from URL.
 * Missing `kind` + present `package_plan_code` → AI package (not expert_plan).
 */
export function resolveCheckoutKind(query: {
  kind?: unknown
  package_plan_code?: unknown
}): CheckoutKind {
  const rawKind = query.kind
  const kind = Array.isArray(rawKind) ? rawKind[0] : rawKind
  if (kind === 'package') {
    return 'package'
  }
  if (kind === 'expert_plan') {
    return 'expert_plan'
  }
  const rawPlan = query.package_plan_code
  const plan = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan
  if (typeof plan === 'string' && plan.trim()) {
    return 'package'
  }
  return 'expert_plan'
}

/**
 * Selected rows use preview `amount`; cancelled rows use recommendation／list
 * `bottle_price` (do not keep the first preview amount after uncheck).
 */
export function addonRowDisplayAmount(
  addon: Pick<BottleAddonSnapshot, 'amount' | 'bottle_price'>,
  selected: boolean
): number {
  return selected ? addon.amount : addon.bottle_price
}

/** `addon_codes` query value, or undefined when empty (omit from URL). */
export function addonCodesQueryValue(
  codes: string[] | null | undefined
): string | undefined {
  const normalized = normalizeAddonCodes(codes)
  return normalized.length > 0 ? normalized.join(',') : undefined
}
