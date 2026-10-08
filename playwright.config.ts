import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const buildDir = fileURLToPath(new URL('./.nuxt/test/e2e', import.meta.url))
mkdirSync(buildDir, { recursive: true })

export default defineConfig<ConfigOptions>({
  testDir: './test/e2e',
  workers: 1,
  timeout: 120_000,
  use: {
    colorScheme: 'light',
    locale: 'zh-TW',
    nuxt: {
      rootDir,
      dev: true,
      env: {
        NUXT_TEST_BUILD_DIR: buildDir
      },
      nuxtConfig: {
        buildDir
      },
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
