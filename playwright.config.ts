import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'

export default defineConfig<ConfigOptions>({
  testDir: './test/e2e',
  workers: 1,
  timeout: 120_000,
  use: {
    colorScheme: 'light',
    locale: 'zh-TW',
    nuxt: {
      rootDir: fileURLToPath(new URL('.', import.meta.url)),
      setupTimeout: 240_000
    }
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome']
      }
    }
  ]
})
