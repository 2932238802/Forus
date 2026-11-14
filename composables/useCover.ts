import { ref } from 'vue'

// 模块级单例：封面是否正在显示。封面显示时布局层暂停背景 Canvas。
const coverVisible = ref(false)

export function useCover() {
  return {
    coverVisible,
    showCover: () => (coverVisible.value = true),
    hideCover: () => (coverVisible.value = false),
  }
}
