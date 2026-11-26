import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const buildDir = fileURLToPath(new URL('./.nuxt/test/e2e', import.meta.url))
mkdirSync(buildDir, { recursive: true })

export default defineConfig<ConfigOptions>({
  testDir: './test/e2e',
  testIgnore: ['**/spa-fallback.spec.ts'],
  workers: 1,
  timeout: 120_000,
  use: {
    colorScheme: 'light',
    locale: 'zh-TW',
    nuxt: {
      rootDir,
      dev: true,
      env: {
        NUXT_TEST_BUILD_DIR: buildDir,
        // Opt-in agent v2 route for e2e; production default remains off.
        NUXT_PUBLIC_AGENT_V2_ENABLED: '1'
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
