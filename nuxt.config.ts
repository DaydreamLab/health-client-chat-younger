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

  // Static GitHub Pages: bundle icons at build time (no Iconify API at runtime).
  icon: {
    provider: 'none',
    clientBundle: {
      scan: true,
      sizeLimitKb: 512
    }
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8080/api/v1'
    }
  },

  routeRules: {
    '/chat': { prerender: false },
    '/en/chat': { prerender: false },
    '/app/**': { prerender: false },
    '/en/app/**': { prerender: false }
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/en'],
      ignore: ['/chat', '/en/chat']
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
  }
})
