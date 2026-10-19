import type { PublicPackage } from '~/utils/candor-api'

const descriptionI18nKeyByCode: Record<string, string> = {
  basic: 'basicDescription',
  advance: 'advanceDescription'
}

/** Strikethrough list price when original_price is strictly greater than price. */
export function resolveListPrice(pkg: PublicPackage): number | null {
  const original = pkg.original_price
  if (original == null || original <= pkg.price) {
    return null
  }
  return original
}

export function resolvePlanDescription(
  pkg: PublicPackage,
  locale: string,
  t: (key: string) => string
): string | undefined {
  const i18nKey = descriptionI18nKeyByCode[pkg.code]

  if (locale === 'en') {
    const fromApi = pkg.description_en?.trim()
    if (fromApi) {
      return fromApi
    }
    if (i18nKey) {
      const fromI18n = t(`plans.${i18nKey}`).trim()
      if (fromI18n) {
        return fromI18n
      }
    }
    return undefined
  }

  const fromApi = pkg.description?.trim()
  if (fromApi) {
    return fromApi
  }
  if (i18nKey) {
    const fromI18n = t(`plans.${i18nKey}`).trim()
    if (fromI18n) {
      return fromI18n
    }
  }
  return undefined
}
