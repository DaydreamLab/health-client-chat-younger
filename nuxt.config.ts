// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxtjs/i18n',
    '@nuxt/test-utils/module',
    'nuxt-charts'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'light',
    fallback: 'light',
    classSuffix: '',
    storageKey: 'younger-color-mode'
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8080/api/v1',
      feSha: process.env.NUXT_PUBLIC_FE_SHA || '',
      individualTestsUrl: process.env.NUXT_PUBLIC_INDIVIDUAL_TESTS_URL
        || 'https://www.younger.tw/collections/individual-tests',
      /**
       * Conversation path contract (A／B／C). When true: entry three-choice,
       * completion CTA gates, upload→C, A turn guides. Set
       * NUXT_PUBLIC_PATH_CONTRACT=0 to disable without rebuild of defaults.
       */
      pathContract: process.env.NUXT_PUBLIC_PATH_CONTRACT !== '0'
    }
  },

  // Playwright sets this so its dev server does not share .nuxt with `nuxt dev`.
  buildDir: process.env.NUXT_TEST_BUILD_DIR || '.nuxt',

  routeRules: {
    // Chat is interactive / auth-heavy; keep out of the static crawl.
    '/chat': { prerender: false },
    '/en/chat': { prerender: false },
    '/chat-ai': { prerender: false },
    '/en/chat-ai': { prerender: false }
    // Do NOT set `/app/**` or `/en/app/**` to prerender:false.
    // crawlLinks already emits their index.html with data-src → `_payload.json`;
    // prerender:false skipped only the payload file and caused console 404s on
    // GitHub Pages while direct URL / refresh still need the static HTML (200).
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/en'],
      ignore: ['/chat', '/en/chat', '/chat-ai', '/en/chat-ai']
    }
  },

  vite: {
    optimizeDeps: {
      include: ['decimal.js-light', 'eventemitter3', 'vccs', 'motion-v']
    },
    resolve: {
      alias: {
        'decimal.js-light': fileURLToPath(new URL('./node_modules/decimal.js-light/decimal.mjs', import.meta.url))
      },
      dedupe: ['vue']
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  i18n: {
    defaultLocale: 'zh-TW',
    strategy: 'prefix_except_default',
    langDir: 'locales',
    locales: [
      { code: 'zh-TW', language: 'zh-TW', name: '繁體中文', file: 'zh-TW.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' }
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root'
    }
  },

  // Static GitHub Pages: bundle icons at build time (no Iconify API at runtime).
  icon: {
    provider: 'none',
    clientBundle: {
      scan: true,
      sizeLimitKb: 512,
      // Explicit: scan can miss icons only referenced in NavigationMenu item maps.
      icons: [
        'lucide:watch',
        'lucide:users',
        'lucide:lock',
        'lucide:stethoscope',
        'lucide:list',
        'lucide:layout-grid',
        'lucide:camera',
        'lucide:x',
        'lucide:bot'
      ]
    }
  }
})
