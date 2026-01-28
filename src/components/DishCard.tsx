import type { Dish } from '../storage'
import './DishCard.css'

type Props = {
  dish: Dish
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
  onOpenDetail: () => void
}

export default function DishCard({ dish, onEdit, onDelete, onToggleFavorite, onOpenDetail }: Props) {
  return (
    <article className="dish-card" onClick={onOpenDetail}>
      <div className="dish-card__cover">
        {dish.imageDataUrl ? (
          <img src={dish.imageDataUrl} alt={dish.name} className="dish-card__img" />
        ) : (
          <div className="dish-card__placeholder" aria-hidden />
        )}
        <button
          type="button"
          className={`dish-card__fav ${dish.favorite ? 'is-fav' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          aria-label={dish.favorite ? '取消收藏' : '收藏'}
        >
          ♥
        </button>
      </div>
      <div className="dish-card__body">
        <h3 className="dish-card__name">{dish.name}</h3>
        {dish.category && (
          <span className="dish-card__category">{dish.category}</span>
        )}
        {dish.cookTime && (
          <span className="dish-card__meta">⏱ {dish.cookTime}</span>
        )}
        {dish.description && (
          <p className="dish-card__desc">{dish.description}</p>
        )}
        <div className="dish-card__actions">
          <button type="button" className="dish-card__btn" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            编辑
          </button>
          <button type="button" className="dish-card__btn dish-card__btn--danger" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            删除
          </button>
        </div>
      </div>
    </article>
  )
}
