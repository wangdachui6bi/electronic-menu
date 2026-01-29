import { useState, useEffect, useCallback } from 'react'
import {
  listDishes,
  putDish,
  removeDish,
  createDish,
  updateDishTimestamp,
  listCategories,
  putCategory,
  removeCategory,
  exportBundle,
  importBundle,
  type Dish,
  type Category,
  type ExportBundleV1,
} from './storage'
import DishCard from './components/DishCard'
import DishForm, { type FormValues } from './components/DishForm'
import DishDetail from './components/DishDetail'
import OnlineRecipesModal from './components/OnlineRecipesModal'
import CategoryModal from './components/CategoryModal'
import DataTransferModal from './components/DataTransferModal'
import { fetchRecipeDetail, type OnlineRecipe } from './online'
import './App.css'

export default function App() {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingDish, setEditingDish] = useState<Dish | null>(null)
  const [detailDish, setDetailDish] = useState<Dish | null>(null)
  const [filterFav, setFilterFav] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('')

  const [onlineOpen, setOnlineOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [dishList, catList] = await Promise.all([listDishes(), listCategories()])
      setDishes(dishList)
      setCategories(catList)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

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
    loadAll()
  }

  const handleDelete = async (dish: Dish) => {
    if (!confirm(`确定要删除「${dish.name}」吗？`)) return
    await removeDish(dish.id)
    if (detailDish?.id === dish.id) setDetailDish(null)
    loadAll()
  }

  const handleToggleFavorite = async (dish: Dish) => {
    const updated: Dish = updateDishTimestamp({
      ...dish,
      favorite: !dish.favorite,
    })
    await putDish(updated)
    loadAll()
    if (detailDish?.id === dish.id) setDetailDish(updated)
  }

  const ensureCategory = async (name: string) => {
    const v = name.trim()
    if (!v) return
    const exists = categories.some((c) => c.name.toLowerCase() === v.toLowerCase())
    if (exists) return
    await putCategory({
      id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: v,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  }

  const handleImportOnline = async (recipe: OnlineRecipe) => {
    // 尽量用更完整的详情（有 instructions/ingredients）
    const full = recipe.instructions || (recipe.ingredients?.length ?? 0) > 0 ? recipe : await fetchRecipeDetail(recipe.id)
    const use = full ?? recipe

    const title = use.name
    const category = use.category ?? ''
    const ingredientsText = use.ingredients?.length
      ? `食材：\n${use.ingredients
          .map((x) => `- ${x.name}${x.measure ? `：${x.measure}` : ''}`)
          .join('\n')}`
      : ''

    const steps = (use.instructions ?? '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)

    const dish = createDish({
      name: title,
      category,
      description: ingredientsText,
      steps: steps.length ? steps : [''],
      cookTime: '',
      servings: '',
      imageDataUrl: undefined,
      favorite: false,
    })

    if (category) await ensureCategory(category)
    await putDish(dish)
    await loadAll()
    alert(`已导入「${title}」到我的菜单`)
  }

  const handleRandom = () => {
    if (displayDishes.length === 0) {
      alert('当前筛选条件下没有菜品可随机')
      return
    }
    const idx = Math.floor(Math.random() * displayDishes.length)
    setDetailDish(displayDishes[idx])
  }

  const categoryNames = categories.map((c) => c.name).sort((a, b) => a.localeCompare(b))

  const displayDishes = dishes.filter((d) => {
    if (filterFav && !d.favorite) return false
    if (filterCategory && d.category !== filterCategory) return false
    return true
  })

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">我的菜单</h1>
        <div className="app__actions">
          <button type="button" className="app__btn" onClick={() => setOnlineOpen(true)}>
            在线菜谱
          </button>
          <button type="button" className="app__btn" onClick={() => setTransferOpen(true)}>
            导入/导出
          </button>
          <button type="button" className="app__btn" onClick={handleRandom}>
            随机
          </button>

          <select
            className="app__select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            title="按分类筛选"
          >
            <option value="">全部分类</option>
            {categoryNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

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
          categories={categoryNames}
          onManageCategories={() => setCategoryOpen(true)}
          onSubmit={async (values) => {
            // 如果填了新分类，自动加入分类列表
            if (values.category?.trim()) {
              await ensureCategory(values.category)
            }
            await handleFormSubmit(values)
          }}
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

      {onlineOpen && (
        <OnlineRecipesModal
          onClose={() => setOnlineOpen(false)}
          onImport={async (r) => {
            await handleImportOnline(r)
          }}
        />
      )}

      {categoryOpen && (
        <CategoryModal
          categories={categories}
          onClose={() => setCategoryOpen(false)}
          onAdd={async (c) => {
            await putCategory(c)
            await loadAll()
          }}
          onRemove={async (id) => {
            await removeCategory(id)
            await loadAll()
          }}
        />
      )}

      {transferOpen && (
        <DataTransferModal
          onClose={() => setTransferOpen(false)}
          onExport={exportBundle}
          onImport={async (bundle: ExportBundleV1, opts) => {
            await importBundle(bundle, opts)
            await loadAll()
          }}
        />
      )}
    </div>
  )
}
