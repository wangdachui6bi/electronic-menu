import type { OnlineRecipe } from './online'

const OWNER = 'Anduin2017'
const REPO = 'HowToCook'
const BRANCH = 'master'
const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`

type RecipeIndexItem = {
  id: string
  name: string
  category: string
  path: string
}

const CACHE_KEY = 'howtocook:index:v1'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

function now() {
  return Date.now()
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export async function fetchHowToCookIndex(): Promise<RecipeIndexItem[]> {
  // localStorage cache (best-effort)
  try {
    const cachedText = localStorage.getItem(CACHE_KEY)
    if (cachedText) {
      const cached = safeJsonParse<{ ts: number; items: RecipeIndexItem[] }>(cachedText)
      if (cached?.ts && Array.isArray(cached.items) && now() - cached.ts < CACHE_TTL_MS) {
        return cached.items
      }
    }
  } catch {
    // ignore
  }

  const readmeUrl = `${RAW_BASE}/README.md`
  const res = await fetch(readmeUrl)
  if (!res.ok) throw new Error('无法加载中文菜谱索引（网络异常）')
  const md = await res.text()

  // Parse markdown links like: - [拔丝土豆](dishes/vegetable_dish/拔丝土豆/拔丝土豆.md)
  const lines = md.split(/\r?\n/)
  const items: RecipeIndexItem[] = []
  let currentSection = ''

  for (const line of lines) {
    const sec = line.match(/^##\s+(.+)\s*$/)
    if (sec) {
      currentSection = sec[1].trim()
      continue
    }

    const m = line.match(/^\s*-\s*\[([^\]]+)\]\((dishes\/[^)]+\.md)\)\s*$/)
    if (!m) continue

    const name = m[1].trim()
    const path = m[2].trim()
    const id = `howtocook:${path}`
    const category = currentSection || '菜谱'

    items.push({ id, name, category, path })
  }

  // cache
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: now(), items }))
  } catch {
    // ignore
  }

  return items
}

export async function fetchHowToCookRecipe(path: string): Promise<OnlineRecipe> {
  const url = `${RAW_BASE}/${encodeURI(path)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('无法加载菜谱详情（网络异常）')
  const md = await res.text()

  // best-effort parse ingredients + steps
  const ingredients: Array<{ name: string; measure: string }> = []
  const steps: string[] = []

  const lines = md.split(/\r?\n/)
  let mode: 'none' | 'ingredients' | 'steps' = 'none'

  for (const raw of lines) {
    const line = raw.trim()
    if (/^##\s+/.test(line)) {
      if (line.includes('必备原料')) mode = 'ingredients'
      else if (line.includes('操作')) mode = 'steps'
      else mode = 'none'
      continue
    }

    if (mode === 'ingredients') {
      // table row: | 原料 | 用量 |
      const t = raw.match(/^\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*$/)
      if (t) {
        const a = t[1].trim()
        const b = t[2].trim()
        if (a && b && a !== '原料' && a !== '---') ingredients.push({ name: a, measure: b })
      }
    }

    if (mode === 'steps') {
      const li = line.match(/^\d+\.?\s*(.+)$/)
      if (li) steps.push(li[1].trim())
      else if (line.startsWith('- ')) steps.push(line.slice(2).trim())
    }
  }

  // derive name from filename
  const nameFromPath = decodeURIComponent(path.split('/').pop() || '').replace(/\.md$/, '')

  return {
    id: `howtocook:${path}`,
    name: nameFromPath,
    category: '',
    area: '中式',
    provider: 'howtocook',
    instructions: md,
    ingredients: ingredients.length ? ingredients : undefined,
    tags: undefined,
  }
}
