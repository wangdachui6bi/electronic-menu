export async function readFileAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

export async function extractMediaMeta(file: File) {
  const takenAt = file.lastModified ? new Date(file.lastModified).toISOString() : null

  if (file.type.startsWith('image/')) {
    const imageUrl = URL.createObjectURL(file)

    try {
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
        image.onerror = () => reject(new Error('图片元数据读取失败'))
        image.src = imageUrl
      })

      return {
        caption: '',
        width: dimensions.width,
        height: dimensions.height,
        durationSeconds: null,
        takenAt,
      }
    } finally {
      URL.revokeObjectURL(imageUrl)
    }
  }

  if (file.type.startsWith('video/')) {
    const videoUrl = URL.createObjectURL(file)

    try {
      const meta = await new Promise<{ width: number; height: number; durationSeconds: number | null }>(
        (resolve, reject) => {
          const video = document.createElement('video')
          video.preload = 'metadata'
          video.onloadedmetadata = () =>
            resolve({
              width: video.videoWidth,
              height: video.videoHeight,
              durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
            })
          video.onerror = () => reject(new Error('视频元数据读取失败'))
          video.src = videoUrl
        },
      )

      return {
        caption: '',
        width: meta.width,
        height: meta.height,
        durationSeconds: meta.durationSeconds,
        takenAt,
      }
    } finally {
      URL.revokeObjectURL(videoUrl)
    }
  }

  return {
    caption: '',
    width: null,
    height: null,
    durationSeconds: null,
    takenAt,
  }
}
