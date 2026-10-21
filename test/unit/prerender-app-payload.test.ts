import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Guard: `/app/**` and `/en/app/**` must stay prerenderable so crawlLinks HTML
 * and `_payload.json` are emitted together. `prerender: false` previously
 * skipped only the payload → console 404 on GitHub Pages.
 */
describe('nuxt prerender allows /app HTML + payload', () => {
  it('does not set prerender:false or ignore for /app or /en/app', () => {
    const source = readFileSync(resolve('nuxt.config.ts'), 'utf8')
    expect(source).not.toMatch(/['"]\/app\/\*\*['"]\s*:\s*\{\s*prerender:\s*false/)
    expect(source).not.toMatch(/['"]\/en\/app\/\*\*['"]\s*:\s*\{\s*prerender:\s*false/)
    expect(source).not.toMatch(/ignore:\s*\[[\s\S]*?['"]\/app\/\*\*['"]/)
    expect(source).not.toMatch(/ignore:\s*\[[\s\S]*?['"]\/en\/app\/\*\*['"]/)
    // Chat remains excluded.
    expect(source).toMatch(/['"]\/chat['"]\s*:\s*\{\s*prerender:\s*false/)
    expect(source).toMatch(/ignore:\s*\[[\s\S]*?['"]\/chat['"]/)
  })
})
