/**
 * Min positive TWD price for recommendations path-choice cards.
 * Public catalogs already omit inactive rows (GET /package-plans, GET /expert-plans).
 */

export function minPositivePrice(prices: readonly unknown[]): number | null {
  let min: number | null = null
  for (const raw of prices) {
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) {
      continue
    }
    if (min === null || raw < min) {
      min = raw
    }
  }
  return min
}

/** AI path: lowest price among public package_plans (active only from core). */
export function minAiPackagePlanPrice(
  plans: ReadonlyArray<{ price?: unknown }> | null | undefined
): number | null {
  if (!plans?.length) {
    return null
  }
  return minPositivePrice(plans.map(plan => plan.price))
}

/** Expert path: lowest price among public expert_plans (active only from core). */
export function minExpertPlanPrice(
  plans: ReadonlyArray<{ price?: unknown }> | null | undefined
): number | null {
  if (!plans?.length) {
    return null
  }
  return minPositivePrice(plans.map(plan => plan.price))
}
