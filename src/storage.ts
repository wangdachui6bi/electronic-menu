import { openDB, type DBSchema } from 'idb'

export type Dish = {
  id: string
  name: string
  /** 分类名（字符串）。分类本身存在 categories 表里，便于管理/下拉选择 */
  category: string
  description: string
  steps: string[]
  cookTime: string
  servings: string
  imageDataUrl?: string
  favorite: boolean
  createdAt: number
  updatedAt: number
}

export type Category = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

export type ExportBundleV1 = {
  version: 1
  exportedAt: number
  dishes: Dish[]
  categories: Category[]
}

interface MenuDB extends DBSchema {
  dishes: {
    key: string
    value: Dish
    indexes: { 'by-updatedAt': number }
  }
  categories: {
    key: string
    value: Category
    indexes: { 'by-updatedAt': number; 'by-name': string }
  }
}

const DB_NAME = 'menu-app'
const DISH_STORE = 'dishes'
const CATEGORY_STORE = 'categories'

const dbPromise = openDB<MenuDB>(DB_NAME, 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      const store = db.createObjectStore(DISH_STORE, { keyPath: 'id' })
      store.createIndex('by-updatedAt', 'updatedAt')
    }
    if (oldVersion < 2) {
      const cat = db.createObjectStore(CATEGORY_STORE, { keyPath: 'id' })
      cat.createIndex('by-updatedAt', 'updatedAt')
      cat.createIndex('by-name', 'name')
    }
  },
})

export async function listDishes(): Promise<Dish[]> {
  const db = await dbPromise
  const results = await db.getAll(DISH_STORE)
  return results.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function putDish(dish: Dish): Promise<void> {
  const db = await dbPromise
  await db.put(DISH_STORE, dish)
}

export async function removeDish(id: string): Promise<void> {
  const db = await dbPromise
  await db.delete(DISH_STORE, id)
}

export function createDish(partial: Omit<Dish, 'id' | 'createdAt' | 'updatedAt'>): Dish {
  const now = Date.now()
  return {
    ...partial,
    id: `dish-${now}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: now,
    updatedAt: now,
  }
}

export function updateDishTimestamp(dish: Dish): Dish {
  return { ...dish, updatedAt: Date.now() }
}

export function createCategory(name: string): Category {
  const now = Date.now()
  return {
    id: `cat-${now}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    createdAt: now,
    updatedAt: now,
  }
}

export async function listCategories(): Promise<Category[]> {
  const db = await dbPromise
  const results = await db.getAll(CATEGORY_STORE)
  return results.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function putCategory(category: Category): Promise<void> {
  const db = await dbPromise
  await db.put(CATEGORY_STORE, { ...category, updatedAt: Date.now() })
}

export async function removeCategory(id: string): Promise<void> {
  const db = await dbPromise
  await db.delete(CATEGORY_STORE, id)
}

export async function exportBundle(): Promise<ExportBundleV1> {
  const [dishes, categories] = await Promise.all([listDishes(), listCategories()])
  return {
    version: 1,
    exportedAt: Date.now(),
    dishes,
    categories,
  }
}

/**
 * 导入数据：
 * - replace=true：清空现有数据后导入
 * - replace=false：合并导入（id 冲突则覆盖）
 */
export async function importBundle(bundle: ExportBundleV1, opts: { replace: boolean }) {
  const db = await dbPromise
  const tx = db.transaction([DISH_STORE, CATEGORY_STORE], 'readwrite')

  if (opts.replace) {
    await Promise.all([tx.objectStore(DISH_STORE).clear(), tx.objectStore(CATEGORY_STORE).clear()])
  }

  for (const c of bundle.categories ?? []) {
    await tx.objectStore(CATEGORY_STORE).put(c)
  }
  for (const d of bundle.dishes ?? []) {
    await tx.objectStore(DISH_STORE).put(d)
  }

  await tx.done
}
