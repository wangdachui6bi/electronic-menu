import { fetchHowToCookIndex, fetchHowToCookRecipe } from './howtocook'

export type OnlineRecipe = {
  id: string
  name: string
  thumb?: string
  category?: string
  area?: string
  /** 原始/纯文本说明（用于展示/兜底） */
  instructions?: string
  /** 结构化步骤（用于导入到“我的菜单”时生成 steps） */
  steps?: string[]
  tags?: string[]
  youtube?: string
  source?: string
  ingredients?: Array<{ name: string; measure: string }>
  provider?: 'howtocook' | 'mealdb'
}

// Provider 1: 《程序员在家做饭指南》 (HowToCook) —— 中文菜谱为主，公开仓库，适合国内口味
// Provider 2: TheMealDB（英文/海外库，仅在英文搜索时使用）
const API_BASE = 'https://www.themealdb.com/api/json/v1/1'

type MealDbMeal = Record<string, string | null>

function normalizeMeal(m: MealDbMeal): OnlineRecipe {
  const ingredients: Array<{ name: string; measure: string }> = []
  for (let i = 1; i <= 20; i++) {
    const name = (m[`strIngredient${i}`] ?? '')?.toString().trim()
    const measure = (m[`strMeasure${i}`] ?? '')?.toString().trim()
    if (name) ingredients.push({ name, measure })
  }
  const tags = (m.strTags ?? '')
    ?.toString()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return {
    id: (m.idMeal ?? '').toString(),
    name: (m.strMeal ?? '').toString(),
    thumb: (m.strMealThumb ?? undefined)?.toString() || undefined,
    category: (m.strCategory ?? undefined)?.toString() || undefined,
    area: (m.strArea ?? undefined)?.toString() || undefined,
    instructions: (m.strInstructions ?? undefined)?.toString() || undefined,
    tags,
    youtube: (m.strYoutube ?? undefined)?.toString() || undefined,
    source: (m.strSource ?? undefined)?.toString() || undefined,
    ingredients,
    provider: 'mealdb',
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

function hasChinese(text: string) {
  return /[\u4e00-\u9fa5]/.test(text)
}

export async function fetchLatestRecipes(): Promise<OnlineRecipe[]> {
  // HowToCook 没有“最新列表 API”，我们做一个“推荐”：
  // 1) 拉取 README 中的全量索引（会随仓库更新而更新）
  // 2) 做每日稳定随机，给用户一种“每天推荐不一样”的感觉
  const index = await fetchHowToCookIndex()
  const seed = new Date().toISOString().slice(0, 10)
  const hash = Array.from(seed).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const shuffled = [...index].sort((a, b) => {
    const ah = Array.from(a.id).reduce((acc, c) => acc + c.charCodeAt(0), hash)
    const bh = Array.from(b.id).reduce((acc, c) => acc + c.charCodeAt(0), hash)
    return bh - ah
  })

  return shuffled.slice(0, 60).map((it) => ({
    id: it.id,
    name: it.name,
    category: it.category,
    area: '中式',
    provider: 'howtocook',
  }))
}

export async function searchRecipes(q: string): Promise<OnlineRecipe[]> {
  const query = q.trim()
  if (!query) return []

  // 中文搜索：HowToCook 索引（菜名 + 分类）
  if (hasChinese(query)) {
    const index = await fetchHowToCookIndex()
    const k = query.toLowerCase()
    const matched = index.filter((it) => `${it.name} ${it.category}`.toLowerCase().includes(k))

    return matched.slice(0, 80).map((it) => ({
      id: it.id,
      name: it.name,
      category: it.category,
      area: '中式',
      provider: 'howtocook',
    }))
  }

  // 英文搜索：走 TheMealDB
  const data = await getJson<{ meals: MealDbMeal[] | null }>(`${API_BASE}/search.php?s=${encodeURIComponent(query)}`)
  return (data.meals ?? []).map(normalizeMeal)
}

export async function fetchRecipeDetail(id: string): Promise<OnlineRecipe | null> {
  if (id.startsWith('howtocook:')) {
    const path = id.replace(/^howtocook:/, '')
    return await fetchHowToCookRecipe(path)
  }

  const data = await getJson<{ meals: MealDbMeal[] | null }>(`${API_BASE}/lookup.php?i=${encodeURIComponent(id)}`)
  const meal = data.meals?.[0]
  return meal ? normalizeMeal(meal) : null
}
