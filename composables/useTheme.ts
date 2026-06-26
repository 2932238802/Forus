import { ref, onMounted } from 'vue'

export interface Theme {
  id: string
  name: string
  swatch: string // 预览色块
}

// 两个主题：星空流星 / 樱花飘落
export const THEMES: Theme[] = [
  { id: 'star', name: '星空流星', swatch: '#38bdf8' },
  { id: 'sakura', name: '樱花飘落', swatch: '#fb7faf' },
]

const STORAGE_KEY = 'forus_theme'
const current = ref<string>('star')

export function useTheme() {
  function apply(id: string) {
    current.value = id
    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', id)
      try {
        localStorage.setItem(STORAGE_KEY, id)
      } catch {
        /* ignore */
      }
    }
  }

  onMounted(() => {
    let saved = 'star'
    try {
      saved = localStorage.getItem(STORAGE_KEY) || 'star'
      // 兼容旧的主题 id（night/aurora 等都归到 star）
      if (saved !== 'star' && saved !== 'sakura') saved = 'star'
    } catch {
      /* ignore */
    }
    apply(saved)
  })

  return { current, themes: THEMES, apply }
}
