import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'

export default defineConfig<ConfigOptions>({
  testDir: './test/e2e',
  use: {
    colorScheme: 'light',
    locale: 'zh-TW',
    nuxt: {
      rootDir: fileURLToPath(new URL('.', import.meta.url))
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
