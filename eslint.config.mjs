// @nuxt/eslint 会在 .nuxt/eslint.config.mjs 生成基础配置
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // 页面/组件命名沿用现有风格，不做强制多词组件名
    'vue/multi-word-component-names': 'off',
    // 项目尚未生成 Supabase 数据库类型，composable 内集中使用 any 过渡
    '@typescript-eslint/no-explicit-any': 'off',
  },
})
