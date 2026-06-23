// 图片压缩工具（浏览器端，高质量有损压缩）
// 策略：长边限制到 maxSize 像素，重新编码为 JPEG（质量 quality）
// 视频不处理，原样返回。

interface CompressOptions {
  maxSize?: number // 长边最大像素，默认 1920
  quality?: number // JPEG 质量 0~1，默认 0.85
}

/**
 * 压缩图片文件，返回压缩后的 Blob/File。
 * 若不是图片（如视频）或压缩失败，原样返回。
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const { maxSize = 1920, quality = 0.85 } = options

  // 非图片（视频等）不处理
  if (!file.type.startsWith('image/')) return file
  // GIF 压缩会丢动画，跳过
  if (file.type === 'image/gif') return file

  try {
    const dataUrl = await readAsDataURL(file)
    const img = await loadImage(dataUrl)

    let { width, height } = img
    // 等比缩放到长边不超过 maxSize
    if (Math.max(width, height) > maxSize) {
      if (width >= height) {
        height = Math.round((height * maxSize) / width)
        width = maxSize
      } else {
        width = Math.round((width * maxSize) / height)
        height = maxSize
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality),
    )
    if (!blob) return file

    // 如果压缩后反而更大（少见），用原图
    if (blob.size >= file.size) return file

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    // 任何异常都回退到原图
    return file
  }
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
