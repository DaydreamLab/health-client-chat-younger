export type PlanId = 'basic' | 'mid' | 'premium'

export const planIds: PlanId[] = ['basic', 'mid', 'premium']

export const planMeta: Record<PlanId, {
  icon: string
  recommended?: boolean
}> = {
  basic: { icon: 'i-lucide-file-text' },
  mid: { icon: 'i-lucide-flask-conical' },
  premium: { icon: 'i-lucide-sparkles', recommended: true }
}

export function isPlanId(value: unknown): value is PlanId {
  return value === 'basic' || value === 'mid' || value === 'premium'
}

export function availablePlans(input: { hasReport: boolean }): PlanId[] {
  return input.hasReport ? ['basic', 'premium'] : ['mid', 'premium']
}
