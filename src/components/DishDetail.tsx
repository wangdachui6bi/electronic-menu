import type { Dish } from '../storage'
import './DishDetail.css'

type Props = {
  dish: Dish
  onClose: () => void
  onEdit: () => void
}

export default function DishDetail({ dish, onClose, onEdit }: Props) {
  return (
    <div className="dish-detail-overlay" onClick={onClose}>
      <div className="dish-detail" onClick={(e) => e.stopPropagation()}>
        <div className="dish-detail__header">
          <h2>{dish.name}</h2>
          <button type="button" className="dish-detail__close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="dish-detail__body">
          {dish.imageDataUrl && (
            <div className="dish-detail__img-wrap">
              <img src={dish.imageDataUrl} alt={dish.name} />
            </div>
          )}
          <div className="dish-detail__meta">
            {dish.category && <span className="dish-detail__tag">{dish.category}</span>}
            {dish.cookTime && <span>⏱ {dish.cookTime}</span>}
            {dish.servings && <span>🍽 {dish.servings}</span>}
          </div>
          {dish.description && (
            <p className="dish-detail__desc">{dish.description}</p>
          )}
          <section className="dish-detail__steps">
            <h3>做菜步骤</h3>
            <ol>
              {dish.steps.filter(Boolean).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>
        </div>
        <div className="dish-detail__footer">
          <button type="button" className="dish-detail__btn dish-detail__btn--secondary" onClick={onClose}>
            关闭
          </button>
          <button type="button" className="dish-detail__btn dish-detail__btn--primary" onClick={onEdit}>
            编辑
          </button>
        </div>
      </div>
    </div>
  )
}
