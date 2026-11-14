import { defineConfig, devices } from '@playwright/test'

/**
 * Runs against `pnpm generate` + scripts/cf-static-server.mjs (CloudFront rules).
 * Keep separate from the Nuxt-dev e2e project.
 */
export default defineConfig({
  testDir: './test/e2e',
  testMatch: /spa-(fallback|auth-session)\.spec\.ts/,
  workers: 1,
  timeout: 120_000,
  use: {
    colorScheme: 'light',
    locale: 'zh-TW',
    ...devices['Desktop Chrome']
  },
  projects: [
    {
      name: 'chromium-spa',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})
