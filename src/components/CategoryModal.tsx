import { useMemo, useState } from 'react'
import type { Category } from '../storage'
import { createCategory } from '../storage'
import './CategoryModal.css'

type Props = {
  categories: Category[]
  onClose: () => void
  onAdd: (c: Category) => void
  onRemove: (id: string) => void
}

export default function CategoryModal({ categories, onClose, onAdd, onRemove }: Props) {
  const [name, setName] = useState('')

  const normalized = useMemo(() => name.trim(), [name])
  const exists = useMemo(
    () => categories.some((c) => c.name.toLowerCase() === normalized.toLowerCase()),
    [categories, normalized]
  )

  const handleAdd = () => {
    if (!normalized) return
    if (exists) return
    onAdd(createCategory(normalized))
    setName('')
  }

  return (
    <div className="cat-overlay" onClick={onClose}>
      <div className="cat" onClick={(e) => e.stopPropagation()}>
        <div className="cat__header">
          <h2>管理分类</h2>
          <button type="button" className="cat__close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="cat__body">
          <div className="cat__add">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入新分类名"
            />
            <button type="button" onClick={handleAdd} disabled={!normalized || exists}>
              添加
            </button>
          </div>
          {exists && normalized ? <div className="cat__hint">已存在同名分类</div> : null}

          {categories.length === 0 ? (
            <p className="cat__empty">还没有分类</p>
          ) : (
            <ul className="cat__list">
              {categories.map((c) => (
                <li key={c.id} className="cat__item">
                  <span className="cat__name">{c.name}</span>
                  <button
                    type="button"
                    className="cat__remove"
                    onClick={() => {
                      if (!confirm(`确定删除分类「${c.name}」吗？（不会删除菜品，只会影响下拉选项）`)) return
                      onRemove(c.id)
                    }}
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="cat__footer">
          <button type="button" className="cat__btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
