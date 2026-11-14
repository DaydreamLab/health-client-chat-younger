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

const root = fileURLToPath(new URL('..', import.meta.url))
const pagesDir = join(root, 'app/pages')
const publicDir = join(root, '.output/public')
const SHELL = '_'
const EN = 'en'

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

function main() {
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
}

main()
