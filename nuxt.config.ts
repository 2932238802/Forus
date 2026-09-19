// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  telemetry: false,

  // Server-only configuration.
  runtimeConfig: {
    passphrase: process.env.NUXT_PASSPHRASE || '622',
    authSecret: process.env.NUXT_AUTH_SECRET || 'forus-dev-secret-change-me',
    // OpenAI-compatible API configuration for Cat Chat.
    catApiBase: process.env.NUXT_CAT_API_BASE || 'https://wawapii.com/v1',
    catApiKey: process.env.NUXT_CAT_API_KEY || '',
    catModel: process.env.NUXT_CAT_MODEL || 'deepseek-chat',
  },

  // Disable appManifest to avoid the dev pre-transform error.
  experimental: {
    appManifest: false,
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
    '@nuxtjs/supabase',
  ],

  supabase: {
    // The app uses the shared passphrase instead of Supabase Auth redirects.
    redirect: false,
    // Database types have not been generated yet.
    types: false,
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Forus',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '属于我们的时间。' },
        { name: 'robots', content: 'noindex, nofollow' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
})
