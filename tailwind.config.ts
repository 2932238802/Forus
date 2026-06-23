import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        // 晴空 · 薄荷 配色（蓝 / 白 / 青）
        ink: '#0F172A',      // 墨蓝 - 主要文字
        sky: {
          DEFAULT: '#2563EB', // 主蓝
          soft: '#3B82F6',
          deep: '#1D4ED8',
        },
        cyan: {
          DEFAULT: '#06B6D4', // 青
          soft: '#22D3EE',
        },
        mist: '#ECFEFF',     // 浅青背景柔光
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(37, 99, 235, 0.25)',
        glow: '0 0 60px -10px rgba(6, 182, 212, 0.35)',
      },
      backgroundImage: {
        'sky-cyan': 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
}
