import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Guard: `/app/**` and `/en/app/**` must stay prerenderable so crawlLinks HTML
 * and `_payload.json` are emitted together. `prerender: false` previously
 * skipped only the payload → console 404 on GitHub Pages.
 *
 * Chat routes must be CSR shells (`ssr: false`) that are still generated so
 * CloudFront `<path>/index.html` rewrites hit a real object instead of /200.html.
 */
describe('nuxt prerender allows /app HTML + payload', () => {
  it('does not set prerender:false or ignore for /app or /en/app', () => {
    const source = readFileSync(resolve('nuxt.config.ts'), 'utf8')
    expect(source).not.toMatch(/['"]\/app\/\*\*['"]\s*:\s*\{\s*prerender:\s*false/)
    expect(source).not.toMatch(/['"]\/en\/app\/\*\*['"]\s*:\s*\{\s*prerender:\s*false/)
    expect(source).not.toMatch(/ignore:\s*\[[\s\S]*?['"]\/app\/\*\*['"]/)
    expect(source).not.toMatch(/ignore:\s*\[[\s\S]*?['"]\/en\/app\/\*\*['"]/)
  })

  it('emits CSR shells for chat instead of prerender:false + ignore', () => {
    const source = readFileSync(resolve('nuxt.config.ts'), 'utf8')
    expect(source).toMatch(/['"]\/chat['"]\s*:\s*\{\s*ssr:\s*false\s*\}/)
    expect(source).toMatch(/['"]\/en\/chat['"]\s*:\s*\{\s*ssr:\s*false\s*\}/)
    expect(source).toMatch(/['"]\/chat-ai['"]\s*:\s*\{\s*ssr:\s*false\s*\}/)
    expect(source).toMatch(/['"]\/en\/chat-ai['"]\s*:\s*\{\s*ssr:\s*false\s*\}/)
    expect(source).not.toMatch(/['"]\/chat['"]\s*:\s*\{\s*prerender:\s*false/)
    expect(source).not.toMatch(/ignore:\s*\[[\s\S]*?['"]\/chat['"]/)
    expect(source).toMatch(/routes:\s*\[[\s\S]*?['"]\/chat['"]/)
  })

  it('seeds dynamic path-param CSR shells via static-route-shells', () => {
    const source = readFileSync(resolve('nuxt.config.ts'), 'utf8')
    expect(source).toMatch(/dynamicShellPrerenderRoutes/)
    expect(source).toMatch(/dynamicShellRouteRules/)
    const shells = readFileSync(
      resolve('app/utils/static-route-shells.ts'),
      'utf8'
    )
    expect(shells).toMatch(/\/app\/orders/)
    expect(shells).toMatch(/\/app\/expert-cases/)
    expect(shells).toMatch(/\/app\/wearables/)
    expect(shells).toMatch(/STATIC_ROUTE_SHELL_PARAM\s*=\s*['_"]_['_"]/)
  })
})
