import { useState, useRef } from 'react'
import type { Dish } from '../storage'
import './DishForm.css'

export type FormValues = {
  name: string
  category: string
  description: string
  steps: string[]
  cookTime: string
  servings: string
  imageDataUrl: string
  favorite: boolean
}

const emptyForm: FormValues = {
  name: '',
  category: '',
  description: '',
  steps: [''],
  cookTime: '',
  servings: '',
  imageDataUrl: '',
  favorite: false,
}

type Props = {
  initial?: Dish | null
  categories: string[]
  onManageCategories: () => void
  onSubmit: (values: FormValues) => void
  onCancel: () => void
}

export default function DishForm({ initial, categories, onManageCategories, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<FormValues>(() =>
    initial
      ? {
          name: initial.name,
          category: initial.category,
          description: initial.description,
          steps: initial.steps.length ? initial.steps : [''],
          cookTime: initial.cookTime,
          servings: initial.servings,
          imageDataUrl: initial.imageDataUrl ?? '',
          favorite: initial.favorite,
        }
      : { ...emptyForm }
  )
  const fileRef = useRef<HTMLInputElement>(null)

  const handleChange = (field: keyof FormValues, value: string | string[] | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleStepChange = (index: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.steps]
      next[index] = value
      return { ...prev, steps: next }
    })
  }

  const addStep = () => {
    setForm((prev) => ({ ...prev, steps: [...prev.steps, ''] }))
  }

  const removeStep = (index: number) => {
    if (form.steps.length <= 1) return
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }))
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      handleChange('imageDataUrl', dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const steps = form.steps.filter((s) => s.trim())
    onSubmit({ ...form, steps: steps.length ? steps : [''] })
  }

  return (
    <div className="dish-form-overlay" onClick={onCancel}>
      <div className="dish-form" onClick={(e) => e.stopPropagation()}>
        <div className="dish-form__header">
          <h2>{initial ? '编辑菜品' : '添加菜品'}</h2>
          <button type="button" className="dish-form__close" onClick={onCancel} aria-label="关闭">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="dish-form__body">
          <div className="dish-form__field">
            <label>菜品名称 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="如：番茄炒蛋"
              required
            />
          </div>
          <div className="dish-form__row">
            <div className="dish-form__field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <label>分类</label>
                <button type="button" className="dish-form__mini" onClick={onManageCategories}>
                  管理分类
                </button>
              </div>
              <input
                type="text"
                value={form.category}
                onChange={(e) => handleChange('category', e.target.value)}
                placeholder="如：家常菜"
                list="dish-category-list"
              />
              <datalist id="dish-category-list">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="dish-form__field">
              <label>烹饪时间</label>
              <input
                type="text"
                value={form.cookTime}
                onChange={(e) => handleChange('cookTime', e.target.value)}
                placeholder="如：15分钟"
              />
            </div>
            <div className="dish-form__field">
              <label>份量</label>
              <input
                type="text"
                value={form.servings}
                onChange={(e) => handleChange('servings', e.target.value)}
                placeholder="如：2人份"
              />
            </div>
          </div>
          <div className="dish-form__field">
            <label>简介</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="简单描述这道菜"
              rows={2}
            />
          </div>
          <div className="dish-form__field">
            <label>菜品图片</label>
            <div className="dish-form__image">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="dish-form__file"
              />
              {form.imageDataUrl ? (
                <div className="dish-form__preview">
                  <img src={form.imageDataUrl} alt="预览" />
                  <button
                    type="button"
                    className="dish-form__remove-img"
                    onClick={() => handleChange('imageDataUrl', '')}
                  >
                    移除图片
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="dish-form__upload"
                  onClick={() => fileRef.current?.click()}
                >
                  点击上传图片
                </button>
              )}
            </div>
          </div>
          <div className="dish-form__field">
            <div className="dish-form__steps-head">
              <label>做菜步骤</label>
              <button type="button" className="dish-form__add-step" onClick={addStep}>
                + 添加步骤
              </button>
            </div>
            <div className="dish-form__steps">
              {form.steps.map((step, i) => (
                <div key={i} className="dish-form__step">
                  <span className="dish-form__step-num">{i + 1}</span>
                  <textarea
                    value={step}
                    onChange={(e) => handleStepChange(i, e.target.value)}
                    placeholder={`步骤 ${i + 1}`}
                    rows={2}
                  />
                  <button
                    type="button"
                    className="dish-form__remove-step"
                    onClick={() => removeStep(i)}
                    disabled={form.steps.length <= 1}
                    title="删除步骤"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="dish-form__field dish-form__field--row">
            <label className="dish-form__checkbox-wrap">
              <input
                type="checkbox"
                checked={form.favorite}
                onChange={(e) => handleChange('favorite', e.target.checked)}
              />
              <span>收藏</span>
            </label>
          </div>
          <div className="dish-form__footer">
            <button type="button" className="dish-form__btn dish-form__btn--secondary" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="dish-form__btn dish-form__btn--primary">
              {initial ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
