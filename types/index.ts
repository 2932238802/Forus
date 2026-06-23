export interface Milestone {
  id: string
  title: string
  description: string
  date: string // YYYY-MM-DD
  location?: string
  type: 'anniversary' | 'travel' | 'daily' | 'special'
  emoji?: string
}

export interface MediaItem {
  id: string
  /** 媒体类型：图片 或 视频 */
  kind: 'image' | 'video'
  /** 资源地址：可以是外链 URL，也可以是 base64 dataURL（本地导入） */
  url: string
  title?: string
  description?: string
  date?: string
}
