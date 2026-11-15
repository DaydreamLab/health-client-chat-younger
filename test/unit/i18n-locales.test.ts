import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  compareLocales,
  flattenLocaleKeys
} from '../../scripts/check-i18n-locales.mjs'

const root = fileURLToPath(new URL('../..', import.meta.url))
const enPath = join(root, 'i18n/locales/en.json')

describe('i18n locale parity', () => {
  let originalEn: string | null = null

  afterEach(() => {
    if (originalEn != null) {
      writeFileSync(enPath, originalEn)
      originalEn = null
    }
  })

  it('en and zh-TW leaf keys match with no stray EN CJK/TODO', () => {
    const result = compareLocales()
    expect(result.missingInEn).toEqual([])
    expect(result.missingInZh).toEqual([])
    expect(result.todoKeys).toEqual([])
    expect(result.enCjkKeys).toEqual([])
    expect(result.ok).toBe(true)
    expect(flattenLocaleKeys(JSON.parse(readFileSync(enPath, 'utf8'))).length).toBeGreaterThan(100)
  })

  it('fails when en is missing a zh key', () => {
    originalEn = readFileSync(enPath, 'utf8')
    const en = JSON.parse(originalEn) as Record<string, unknown>
    delete (en as { brand?: string }).brand
    writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`)

    const result = compareLocales()
    expect(result.ok).toBe(false)
    expect(result.missingInEn).toContain('brand')
  })
})
