import { openDB, type DBSchema } from 'idb'

export type Dish = {
  id: string
  name: string
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

interface MenuDB extends DBSchema {
  dishes: {
    key: string
    value: Dish
    indexes: { 'by-updatedAt': number }
  }
}

const DB_NAME = 'menu-app'
const STORE_NAME = 'dishes'

const dbPromise = openDB<MenuDB>(DB_NAME, 1, {
  upgrade(db) {
    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    store.createIndex('by-updatedAt', 'updatedAt')
  },
})

export async function listDishes(): Promise<Dish[]> {
  const db = await dbPromise
  const results = await db.getAll(STORE_NAME)
  return results.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function putDish(dish: Dish): Promise<void> {
  const db = await dbPromise
  await db.put(STORE_NAME, dish)
}

export async function removeDish(id: string): Promise<void> {
  const db = await dbPromise
  await db.delete(STORE_NAME, id)
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
