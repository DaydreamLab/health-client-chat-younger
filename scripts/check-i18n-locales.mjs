#!/usr/bin/env node
/**
 * Fail when en.json and zh-TW.json leaf keys diverge, or when en values still
 * contain CJK outside an explicit whitelist (locale switcher labels).
 *
 * Used by `pnpm check:i18n` and `scripts/check-static-pages.mjs`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const enPath = join(root, 'i18n/locales/en.json')
const zhPath = join(root, 'i18n/locales/zh-TW.json')

/** EN values that intentionally keep CJK (language switcher target labels). */
export const EN_CJK_VALUE_WHITELIST = new Set([
  'localeSwitch.labelZh',
  'localeSwitch.ariaZh'
])

const CJK_RE = /[\u4e00-\u9fff]/u

/**
 * @param {unknown} obj
 * @param {string} [prefix]
 * @returns {string[]}
 */
export function flattenLocaleKeys(obj, prefix = '') {
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) {
    return prefix ? [prefix] : []
  }
  /** @type {string[]} */
  const keys = []
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenLocaleKeys(v, p))
    } else {
      keys.push(p)
    }
  }
  return keys
}

/**
 * @param {Record<string, unknown>} obj
 * @param {string} path
 */
function getAt(obj, path) {
  return path.split('.').reduce((acc, key) => {
    if (acc && typeof acc === 'object' && !Array.isArray(acc)) {
      return /** @type {Record<string, unknown>} */ (acc)[key]
    }
    return undefined
  }, /** @type {unknown} */ (obj))
}

/**
 * @returns {{
 *   ok: boolean,
 *   missingInEn: string[],
 *   missingInZh: string[],
 *   enCjkKeys: { key: string, value: string }[],
 *   todoKeys: string[]
 * }}
 */
export function compareLocales() {
  const en = JSON.parse(readFileSync(enPath, 'utf8'))
  const zh = JSON.parse(readFileSync(zhPath, 'utf8'))
  const enKeys = new Set(flattenLocaleKeys(en))
  const zhKeys = new Set(flattenLocaleKeys(zh))
  const missingInEn = [...zhKeys].filter(k => !enKeys.has(k)).sort()
  const missingInZh = [...enKeys].filter(k => !zhKeys.has(k)).sort()

  /** @type {{ key: string, value: string }[]} */
  const enCjkKeys = []
  /** @type {string[]} */
  const todoKeys = []
  for (const key of [...enKeys].sort()) {
    const value = getAt(en, key)
    if (typeof value !== 'string') {
      continue
    }
    if (value.startsWith('TODO:')) {
      todoKeys.push(key)
    }
    if (CJK_RE.test(value) && !EN_CJK_VALUE_WHITELIST.has(key)) {
      enCjkKeys.push({ key, value })
    }
  }

  return {
    ok: missingInEn.length === 0
      && missingInZh.length === 0
      && enCjkKeys.length === 0
      && todoKeys.length === 0,
    missingInEn,
    missingInZh,
    enCjkKeys,
    todoKeys
  }
}

export function assertLocalesConsistent() {
  const result = compareLocales()
  if (result.missingInEn.length) {
    console.error('Locale keys missing in en.json:')
    for (const k of result.missingInEn) {
      console.error(`  - ${k}`)
    }
  }
  if (result.missingInZh.length) {
    console.error('Locale keys missing in zh-TW.json:')
    for (const k of result.missingInZh) {
      console.error(`  - ${k}`)
    }
  }
  if (result.todoKeys.length) {
    console.error('en.json still has TODO placeholders:')
    for (const k of result.todoKeys) {
      console.error(`  - ${k}`)
    }
  }
  if (result.enCjkKeys.length) {
    console.error('en.json values still contain CJK (add to EN_CJK_VALUE_WHITELIST if intentional):')
    for (const { key, value } of result.enCjkKeys) {
      console.error(`  - ${key}: ${JSON.stringify(value)}`)
    }
  }
  if (!result.ok) {
    process.exit(1)
  }
  console.log(
    `OK: en/zh-TW locale keys match (${flattenLocaleKeys(JSON.parse(readFileSync(enPath, 'utf8'))).length} leaves); no stray EN CJK/TODO.`
  )
}

const isDirect = process.argv[1]
  && fileURLToPath(import.meta.url) === process.argv[1]

if (isDirect) {
  assertLocalesConsistent()
}
