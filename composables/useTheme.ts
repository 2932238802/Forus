import { ref, onMounted } from 'vue'

export interface Theme {
  id: string
  name: string
  // 用于预览的小色块
  swatch: string
}

// 可选主题（配色通过 body 上的 data-theme 切换，具体色值在 main.css 定义）
export const THEMES: Theme[] = [
  { id: 'night', name: '夜空蓝', swatch: '#38bdf8' },
  { id: 'aurora', name: '极光紫', swatch: '#a78bfa' },
  { id: 'forest', name: '深林绿', swatch: '#34d399' },
  { id: 'rose', name: '玫瑰金', swatch: '#fb7185' },
  { id: 'amber', name: '暖阳橙', swatch: '#fbbf24' },
  { id: 'mono', name: '极简灰', swatch: '#94a3b8' },
]

const STORAGE_KEY = 'forus_theme'
const current = ref<string>('night')

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
    let saved = 'night'
    try {
      saved = localStorage.getItem(STORAGE_KEY) || 'night'
    } catch {
      /* ignore */
    }
    apply(saved)
  })

  return { current, themes: THEMES, apply }
}
