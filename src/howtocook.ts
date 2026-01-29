import type { OnlineRecipe } from './online'
import { stripMarkdownBlock, stripMarkdownInline } from './markdown'

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

  // parse ingredients + steps（尽量结构化，导入更干净）
  const ingredients: Array<{ name: string; measure: string }> = []
  const steps: string[] = []

  const lines = md.split(/\r?\n/)
  let mode: 'none' | 'ingredients' | 'steps' = 'none'
  let inCode = false

  for (const raw of lines) {
    const trimmed = raw.trim()

    if (trimmed.startsWith('```')) {
      inCode = !inCode
      continue
    }
    if (inCode) continue

    if (/^##\s+/.test(trimmed)) {
      if (trimmed.includes('必备原料')) mode = 'ingredients'
      else if (trimmed.includes('操作')) mode = 'steps'
      else mode = 'none'
      continue
    }

    if (mode === 'ingredients') {
      // table row: | 原料 | 用量 |
      const t = raw.match(/^\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*$/)
      if (t) {
        const a = stripMarkdownInline(t[1].trim())
        const b = stripMarkdownInline(t[2].trim())
        if (a && b && a !== '原料' && a !== '---' && b !== '用量') {
          ingredients.push({ name: a, measure: b })
        }
      }
    }

    if (mode === 'steps') {
      // 支持：1. xxx / 1) xxx / - xxx / * xxx
      const li = trimmed.match(/^\d+\s*[.)、]?\s*(.+)$/)
      if (li) {
        const s = stripMarkdownInline(li[1])
        if (s) steps.push(s)
        continue
      }
      const bullet = trimmed.match(/^[-*+]\s+(.+)$/)
      if (bullet) {
        const s = stripMarkdownInline(bullet[1])
        if (s) steps.push(s)
        continue
      }
    }
  }

  // derive name from filename
  const nameFromPath = decodeURIComponent(path.split('/').pop() || '').replace(/\.md$/, '')

  // instructions: 用纯文本（去掉大部分 markdown 结构），避免导入时混入标记
  const plain = stripMarkdownBlock(md)

  return {
    id: `howtocook:${path}`,
    name: nameFromPath,
    category: '',
    area: '中式',
    provider: 'howtocook',
    instructions: plain,
    steps: steps.length ? steps : undefined,
    ingredients: ingredients.length ? ingredients : undefined,
    tags: undefined,
  }
}
