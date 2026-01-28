import { useState, useEffect, useCallback } from 'react'
import {
  listDishes,
  putDish,
  removeDish,
  createDish,
  updateDishTimestamp,
  type Dish,
} from './storage'
import DishCard from './components/DishCard'
import DishForm, { type FormValues } from './components/DishForm'
import DishDetail from './components/DishDetail'
import './App.css'

export default function App() {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingDish, setEditingDish] = useState<Dish | null>(null)
  const [detailDish, setDetailDish] = useState<Dish | null>(null)
  const [filterFav, setFilterFav] = useState(false)

  const loadDishes = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listDishes()
      setDishes(list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDishes()
  }, [loadDishes])

  const handleAdd = () => {
    setEditingDish(null)
    setFormOpen(true)
  }

  const handleEdit = (dish: Dish) => {
    setEditingDish(dish)
    setDetailDish(null)
    setFormOpen(true)
  }

  const handleFormSubmit = async (values: FormValues) => {
    if (editingDish) {
      const updated: Dish = updateDishTimestamp({
        ...editingDish,
        name: values.name,
        category: values.category,
        description: values.description,
        steps: values.steps,
        cookTime: values.cookTime,
        servings: values.servings,
        imageDataUrl: values.imageDataUrl || undefined,
        favorite: values.favorite,
      })
      await putDish(updated)
    } else {
      const newDish = createDish({
        name: values.name,
        category: values.category,
        description: values.description,
        steps: values.steps,
        cookTime: values.cookTime,
        servings: values.servings,
        imageDataUrl: values.imageDataUrl || undefined,
        favorite: values.favorite,
      })
      await putDish(newDish)
    }
    setFormOpen(false)
    setEditingDish(null)
    loadDishes()
  }

  const handleDelete = async (dish: Dish) => {
    if (!confirm(`确定要删除「${dish.name}」吗？`)) return
    await removeDish(dish.id)
    if (detailDish?.id === dish.id) setDetailDish(null)
    loadDishes()
  }

  const handleToggleFavorite = async (dish: Dish) => {
    const updated: Dish = updateDishTimestamp({
      ...dish,
      favorite: !dish.favorite,
    })
    await putDish(updated)
    loadDishes()
    if (detailDish?.id === dish.id) setDetailDish(updated)
  }

  const displayDishes = filterFav ? dishes.filter((d) => d.favorite) : dishes

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">我的菜单</h1>
        <div className="app__actions">
          <button
            type="button"
            className={`app__filter ${filterFav ? 'is-active' : ''}`}
            onClick={() => setFilterFav((v) => !v)}
          >
            收藏
          </button>
          <button type="button" className="app__add" onClick={handleAdd}>
            + 添加菜品
          </button>
        </div>
      </header>
      <main className="app__main">
        {loading ? (
          <p className="app__loading">加载中…</p>
        ) : displayDishes.length === 0 ? (
          <div className="app__empty">
            <p>{filterFav ? '暂无收藏的菜品' : '还没有菜品，点击「添加菜品」开始记录'}</p>
          </div>
        ) : (
          <ul className="app__grid">
            {displayDishes.map((dish) => (
              <li key={dish.id}>
                <DishCard
                  dish={dish}
                  onEdit={() => handleEdit(dish)}
                  onDelete={() => handleDelete(dish)}
                  onToggleFavorite={() => handleToggleFavorite(dish)}
                  onOpenDetail={() => setDetailDish(dish)}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
      {formOpen && (
        <DishForm
          initial={editingDish}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setFormOpen(false)
            setEditingDish(null)
          }}
        />
      )}
      {detailDish && (
        <DishDetail
          dish={detailDish}
          onClose={() => setDetailDish(null)}
          onEdit={() => handleEdit(detailDish)}
        />
      )}
    </div>
  )
}
