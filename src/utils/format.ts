export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '刚刚'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatFileSize(value: number) {
  if (!value) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let current = value
  let index = 0

  while (current >= 1024 && index < units.length - 1) {
    current /= 1024
    index += 1
  }

  return `${current.toFixed(current >= 100 || index === 0 ? 0 : 1)} ${units[index]}`
}

export function parseTagInput(value: string) {
  return value
    .split(/[、,/，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12)
}

export function parseImportText(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [categoryMaybe, nameMaybe] = line.includes('/') ? line.split('/') : ['', line]
      return {
        name: (nameMaybe || line).trim(),
        category: (categoryMaybe || '').trim(),
        sourceType: 'import',
      }
    })
    .filter((item) => item.name)
}
