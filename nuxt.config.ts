// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  telemetry: false,

  // 服务端私有配置（绝不会打包进前端）
  runtimeConfig: {
    // 共用暗号：从环境变量读取，默认回退到 622（生产请在 .env 配置 NUXT_PASSPHRASE）
    passphrase: process.env.NUXT_PASSPHRASE || '622',
    // Cookie 签名密钥：从环境变量读取（生产务必在 .env 配置 NUXT_AUTH_SECRET）
    authSecret: process.env.NUXT_AUTH_SECRET || 'forus-dev-secret-change-me',
    // DeepSeek API Key（小猫 AI）
    deepseekKey: process.env.NUXT_DEEPSEEK_KEY || '',
  },

  // 关闭 appManifest，消除 dev 下 "#app-manifest" 预转换报错
  experimental: {
    appManifest: false,
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
    '@nuxtjs/supabase',
  ],

  supabase: {
    // 不使用 Supabase Auth 登录跳转，改用前端共用暗号；关闭自动重定向
    redirect: false,
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
