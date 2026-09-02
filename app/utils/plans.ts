export type PlanId = 'basic' | 'mid' | 'premium'

export function availablePlans(input: { hasReport: boolean }): PlanId[] {
  return input.hasReport ? ['basic', 'premium'] : ['mid', 'premium']
}
