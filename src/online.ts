export type OnlineRecipe = {
  id: string
  name: string
  thumb?: string
  category?: string
  area?: string
  instructions?: string
  tags?: string[]
  youtube?: string
  source?: string
  ingredients?: Array<{ name: string; measure: string }>
}

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
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

export async function fetchLatestRecipes(): Promise<OnlineRecipe[]> {
  const data = await getJson<{ meals: MealDbMeal[] | null }>(`${API_BASE}/latest.php`)
  return (data.meals ?? []).map(normalizeMeal)
}

export async function searchRecipes(q: string): Promise<OnlineRecipe[]> {
  const query = q.trim()
  if (!query) return []
  const data = await getJson<{ meals: MealDbMeal[] | null }>(`${API_BASE}/search.php?s=${encodeURIComponent(query)}`)
  return (data.meals ?? []).map(normalizeMeal)
}

export async function fetchRecipeDetail(id: string): Promise<OnlineRecipe | null> {
  const data = await getJson<{ meals: MealDbMeal[] | null }>(`${API_BASE}/lookup.php?i=${encodeURIComponent(id)}`)
  const meal = data.meals?.[0]
  return meal ? normalizeMeal(meal) : null
}
