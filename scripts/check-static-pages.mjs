#!/usr/bin/env node
/**
 * After `pnpm generate`, assert every app/pages route has a static HTML file
 * under `.output/public` (incl. `/en` i18n prefix).
 *
 * Dynamic `[param].vue` routes expect a framework shell at `<prefix>/_/index.html`
 * (see app/utils/static-route-shells.ts + docs/cloudfront-www-index-rewrite.md).
 *
 * Exit 1 if any required page is missing. Prints a route → file table.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertLocalesConsistent } from './check-i18n-locales.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const pagesDir = join(root, 'app/pages')
const publicDir = join(root, '.output/public')
const SHELL = '_'
const EN = 'en'

/**
 * Visible CJK on `/en` static HTML that is intentional FE chrome.
 * Matched as whole substrings after stripping script/style/SVG.
 * Keep in sync with PR description whitelist.
 */
const EN_HTML_CJK_WHITELIST = [
  '中文',
  '語言：繁中',
  '繁中'
]

const CJK_RE = /[\u4e00-\u9fff]/u

/** Sibling .vue / dirs next to a dynamic segment that keep their own HTML. */
function reservedSiblings(dir) {
  const reserved = new Set()
  for (const name of readdirSync(dir)) {
    if (name.startsWith('[')) {
      continue
    }
    if (name.endsWith('.vue')) {
      reserved.add(name.replace(/\.vue$/, ''))
      continue
    }
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      reserved.add(name)
    }
  }
  return reserved
}

/**
 * @returns {{ route: string, kind: 'static' | 'dynamic-shell', page: string, file: string }[]}
 */
function discoverRoutes() {
  /** @type {{ route: string, kind: 'static' | 'dynamic-shell', page: string, file: string }[]} */
  const entries = []

  function walk(dir, urlParts) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      const pageRel = relative(pagesDir, full).replace(/\\/g, '/')

      if (statSync(full).isDirectory()) {
        if (name.startsWith('[') && name.endsWith(']')) {
          // Dynamic segment directory (unusual); treat as shell at parent/_
          const prefix = '/' + urlParts.join('/')
          const route = `${prefix}/${SHELL}`.replace(/\/+/g, '/')
          entries.push({
            route: route === '/_' ? `/${SHELL}` : route,
            kind: 'dynamic-shell',
            page: pageRel,
            file: `${route.slice(1)}/index.html`
          })
          continue
        }
        walk(full, [...urlParts, name])
        continue
      }

      if (!name.endsWith('.vue')) {
        continue
      }

      const base = name.replace(/\.vue$/, '')
      if (base.startsWith('[') && base.endsWith(']')) {
        const prefix = urlParts.length ? `/${urlParts.join('/')}` : ''
        const route = `${prefix}/${SHELL}`
        entries.push({
          route,
          kind: 'dynamic-shell',
          page: pageRel,
          file: `${route.slice(1)}/index.html`
        })
        // Note reserved siblings for docs/CI clarity (not separate rows).
        void reservedSiblings(dir)
        continue
      }

      if (base === 'index') {
        const route = urlParts.length ? `/${urlParts.join('/')}` : '/'
        const file = route === '/' ? 'index.html' : `${route.slice(1)}/index.html`
        entries.push({ route, kind: 'static', page: pageRel, file })
        continue
      }

      const route = `/${[...urlParts, base].join('/')}`
      entries.push({
        route,
        kind: 'static',
        page: pageRel,
        file: `${route.slice(1)}/index.html`
      })
    }
  }

  walk(pagesDir, [])

  // i18n prefix_except_default: duplicate every route under /en
  const withEn = []
  for (const entry of entries) {
    withEn.push(entry)
    const enRoute = entry.route === '/' ? `/${EN}` : `/${EN}${entry.route}`
    const enFile = `${enRoute.slice(1)}/index.html`
    withEn.push({
      ...entry,
      route: enRoute,
      file: enFile
    })
  }

  // Stable unique by route
  const byRoute = new Map()
  for (const e of withEn) {
    byRoute.set(e.route, e)
  }
  return [...byRoute.values()].sort((a, b) => a.route.localeCompare(b.route))
}

function isUsableHtml(filePath) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return { ok: false, reason: 'missing' }
  }
  const raw = readFileSync(filePath, 'utf8')
  const size = Buffer.byteLength(raw)
  // Reject generate-time meta-refresh stubs (handoff used to be ~91 bytes).
  if (/http-equiv\s*=\s*["']?refresh/i.test(raw) && size < 512) {
    return { ok: false, reason: `meta-refresh stub (${size} bytes)` }
  }
  if (size < 64) {
    return { ok: false, reason: `too small (${size} bytes)` }
  }
  if (!/__nuxt|#__nuxt|ssr|module/i.test(raw)) {
    return { ok: false, reason: 'not a Nuxt HTML shell' }
  }
  return { ok: true, size }
}

/** Hardcoded support inboxes that must not live in app / i18n source. */
const BANNED_SUPPORT_EMAILS = [
  'service@candor.example',
  'candor-ai@daydream-lab.com'
]

/** Footer / about routes that surface the support inbox when configured. */
const SUPPORT_EMAIL_ROUTES = [
  '/',
  '/en',
  '/index2',
  '/en/index2',
  '/about',
  '/en/about'
]

function walkFiles(dir, pred, out = []) {
  if (!existsSync(dir)) {
    return out
  }
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      walkFiles(full, pred, out)
      continue
    }
    if (pred(full)) {
      out.push(full)
    }
  }
  return out
}

function assertNoHardcodedSupportEmailsInSource() {
  const roots = [join(root, 'app'), join(root, 'i18n')]
  const files = roots.flatMap(dir =>
    walkFiles(dir, p => /\.(vue|ts|js|json|md)$/.test(p))
  )
  const hits = []
  for (const file of files) {
    const raw = readFileSync(file, 'utf8')
    for (const email of BANNED_SUPPORT_EMAILS) {
      if (raw.includes(email)) {
        hits.push(`${relative(root, file)}: ${email}`)
      }
    }
  }
  if (hits.length) {
    console.error('Hardcoded support email in app/i18n source:')
    for (const h of hits) {
      console.error(`  ${h}`)
    }
    process.exit(1)
  }
  console.log('OK: no hardcoded support email in app/ or i18n/.')
}

function assertSupportEmailInGeneratedHtml() {
  const expected = (process.env.NUXT_PUBLIC_SUPPORT_EMAIL || '').trim()
  const failures = []

  for (const route of SUPPORT_EMAIL_ROUTES) {
    const file = route === '/' ? 'index.html' : `${route.slice(1)}/index.html`
    const abs = join(publicDir, file)
    if (!existsSync(abs)) {
      failures.push(`${route}: missing ${file}`)
      continue
    }
    const raw = readFileSync(abs, 'utf8')
    if (expected) {
      if (!raw.includes(expected)) {
        failures.push(`${route}: missing configured support email ${expected}`)
      }
      if (!raw.includes(`mailto:${expected}`)) {
        failures.push(`${route}: missing mailto:${expected}`)
      }
    } else {
      for (const email of BANNED_SUPPORT_EMAILS) {
        if (raw.includes(email)) {
          failures.push(`${route}: unexpected support email ${email}`)
        }
      }
      // Any leftover fake / lab support inbox string.
      if (/service@candor\.example|candor-ai@daydream-lab\.com/i.test(raw)) {
        failures.push(`${route}: unexpected support email string`)
      }
    }
  }

  if (failures.length) {
    console.error('Support email static check failed:')
    for (const f of failures) {
      console.error(`  ${f}`)
    }
    process.exit(1)
  }

  if (expected) {
    console.log(
      `OK: support email ${expected} present on footer/about static pages.`
    )
  } else {
    console.log('OK: no support email strings on footer/about static pages (env unset).')
  }
}

/**
 * Strip non-visible / bundled payload so we only flag FE-owned SSR text.
 * Nuxt may embed both locale JSONs inside `<script>` — those are not page copy.
 */
function visibleHtmlText(raw) {
  return raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
}

function applyCjkWhitelist(text) {
  let out = text
  for (const token of EN_HTML_CJK_WHITELIST) {
    out = out.split(token).join(' ')
  }
  return out
}

function assertNoCjkInEnStaticHtml(routes) {
  const failures = []
  for (const entry of routes) {
    if (!entry.route.startsWith(`/${EN}`)) {
      continue
    }
    const abs = join(publicDir, entry.file)
    if (!existsSync(abs)) {
      continue
    }
    const raw = readFileSync(abs, 'utf8')
    const visible = applyCjkWhitelist(visibleHtmlText(raw))
    const match = visible.match(CJK_RE)
    if (match) {
      const idx = visible.indexOf(match[0])
      const snippet = visible.slice(Math.max(0, idx - 24), idx + 48).trim()
      failures.push(`${entry.route}: CJK ${JSON.stringify(match[0])} near ${JSON.stringify(snippet)}`)
    }
  }

  if (failures.length) {
    console.error('CJK found in /en static HTML (frontend-owned visible text):')
    for (const f of failures) {
      console.error(`  ${f}`)
    }
    console.error(
      'Whitelist intentional switcher copy in EN_HTML_CJK_WHITELIST; core API Chinese must not appear in generate HTML.'
    )
    process.exit(1)
  }
  console.log('OK: no unexpected CJK in /en static HTML visible text.')
}

function assertNoSpaFallbackOnly(routes) {
  const spa = join(publicDir, '200.html')
  if (!existsSync(spa)) {
    return
  }
  const spaRaw = readFileSync(spa, 'utf8')
  const failures = []
  for (const entry of routes) {
    const abs = join(publicDir, entry.file)
    if (!existsSync(abs)) {
      failures.push(`${entry.route}: missing (would rely on 200.html)`)
      continue
    }
    const raw = readFileSync(abs, 'utf8')
    // Identical tiny stub pointing at SPA fallback is not a real page.
    if (raw === spaRaw && entry.kind === 'static') {
      failures.push(`${entry.route}: identical to 200.html SPA fallback`)
    }
  }
  if (failures.length) {
    console.error('Routes must have real generated HTML, not 200.html fallback:')
    for (const f of failures) {
      console.error(`  ${f}`)
    }
    process.exit(1)
  }
}

function main() {
  assertLocalesConsistent()

  if (!existsSync(publicDir)) {
    console.error(`Missing ${publicDir}. Run \`pnpm generate\` first.`)
    process.exit(1)
  }

  const routes = discoverRoutes()
  const rows = []
  const missing = []

  for (const entry of routes) {
    const abs = join(publicDir, entry.file)
    const check = isUsableHtml(abs)
    const status = check.ok ? `ok (${check.size} B)` : `FAIL: ${check.reason}`
    rows.push({
      route: entry.route,
      kind: entry.kind,
      file: entry.file,
      status
    })
    if (!check.ok) {
      missing.push({ ...entry, reason: check.reason })
    }
  }

  console.log('Route → static file mapping (.output/public)\n')
  console.log(
    `${'route'.padEnd(36)} ${'kind'.padEnd(16)} ${'file'.padEnd(44)} status`
  )
  console.log('-'.repeat(120))
  for (const row of rows) {
    console.log(
      `${row.route.padEnd(36)} ${row.kind.padEnd(16)} ${row.file.padEnd(44)} ${row.status}`
    )
  }
  console.log('')

  if (missing.length) {
    console.error(`Missing or unusable static pages: ${missing.length}`)
    for (const m of missing) {
      console.error(`  ${m.route} → ${m.file} (${m.reason}) [${m.page}]`)
    }
    process.exit(1)
  }

  console.log(`OK: ${rows.length} routes have static HTML (incl. dynamic shells + /en).`)
  assertNoSpaFallbackOnly(routes)
  assertNoCjkInEnStaticHtml(routes)
  assertNoHardcodedSupportEmailsInSource()
  assertSupportEmailInGeneratedHtml()
}

main()
