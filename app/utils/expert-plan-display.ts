import type { ExpertPlan } from '~/utils/candor-api'

function trimOrEmpty(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

/** Expert plan card title: EN prefers name_en, then name_zh. */
export function resolveExpertPlanTitle(
  plan: Pick<ExpertPlan, 'name_zh' | 'name_en'>,
  locale: string
): string {
  if (locale === 'en') {
    return trimOrEmpty(plan.name_en) || plan.name_zh
  }
  return plan.name_zh
}

/**
 * Included package_plan label for expert plan cards.
 * EN: package_plan_name_en → package_plan_name_zh → package_plan_code.
 * ZH: package_plan_name_zh → package_plan_name_en → package_plan_code.
 * Returns null when all are missing (legacy API).
 */
export function resolveIncludedPackagePlanName(
  plan: Pick<ExpertPlan, 'package_plan_name_zh' | 'package_plan_name_en' | 'package_plan_code'>,
  locale: string
): string | null {
  const zh = trimOrEmpty(plan.package_plan_name_zh)
  const en = trimOrEmpty(plan.package_plan_name_en)
  const code = trimOrEmpty(plan.package_plan_code)
  if (locale === 'en') {
    return en || zh || code || null
  }
  return zh || en || code || null
}
