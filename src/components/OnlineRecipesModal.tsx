import { useEffect, useMemo, useState } from 'react'
import type { OnlineRecipe } from '../online'
import { fetchLatestRecipes, fetchRecipeDetail, searchRecipes } from '../online'
import './OnlineRecipesModal.css'

type Props = {
  onClose: () => void
  onImport: (recipe: OnlineRecipe) => void
}

export default function OnlineRecipesModal({ onClose, onImport }: Props) {
  const [tab, setTab] = useState<'latest' | 'search'>('latest')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [items, setItems] = useState<OnlineRecipe[]>([])
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<OnlineRecipe | null>(null)
  const [filterCat, setFilterCat] = useState('')

  const title = useMemo(() => (tab === 'latest' ? '中文菜谱推荐' : '搜索菜谱'), [tab])

  const loadLatest = async () => {
    setLoading(true)
    setError('')
    try {
      const list = await fetchLatestRecipes()
      console.log('list', list)
      setItems(list)
    } catch (e) {
      // 避免直接把技术错误怼给用户
      setError('加载失败，请检查网络或稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLatest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doSearch = async () => {
    setLoading(true)
    setError('')
    try {
      const list = await searchRecipes(query)
      setItems(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : '搜索失败')
    } finally {
      setLoading(false)
    }
  }

  const openDetail = async (r: OnlineRecipe) => {
    setLoading(true)
    setError('')
    try {
      const full = await fetchRecipeDetail(r.id)
      setDetail(full ?? r)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载详情失败')
    } finally {
      setLoading(false)
    }
  }

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const it of items) {
      if (it.category) set.add(it.category)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [items])

  const filteredItems = useMemo(() => {
    if (!filterCat) return items
    return items.filter((it) => it.category === filterCat)
  }, [items, filterCat])

  const renderList = () => {
    if (loading && items.length === 0) return <p className="online__hint">加载中…</p>
    if (error) return <p className="online__error">{error}</p>
    if (filteredItems.length === 0) return <p className="online__hint">暂无结果</p>

    return (
      <ul className="online__grid">
        {filteredItems.map((r) => (
          <li key={r.id} className="online__card">
            <button type="button" className="online__card-main" onClick={() => openDetail(r)}>
              {r.thumb ? <img className="online__thumb" src={r.thumb} alt={r.name} /> : <div className="online__thumb online__thumb--empty" />}
              <div className="online__card-info">
                <div className="online__name">{r.name}</div>
                <div className="online__meta">
                  {r.category && <span className="online__tag">{r.category}</span>}
                  {r.area && <span className="online__tag">{r.area}</span>}
                </div>
              </div>
            </button>
            <button type="button" className="online__import" onClick={() => onImport(r)}>
              导入
            </button>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="online-overlay" onClick={onClose}>
      <div className="online" onClick={(e) => e.stopPropagation()}>
        <div className="online__header">
          <h2>{detail ? detail.name : title}</h2>
          <button type="button" className="online__close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        {!detail ? (
          <div className="online__body">
            <div className="online__tabs">
              <button
                type="button"
                className={`online__tab ${tab === 'latest' ? 'is-active' : ''}`}
                onClick={() => {
                  setDetail(null)
                  setTab('latest')
                  setFilterCat('')
                  loadLatest()
                }}
              >
                推荐
              </button>
              <button
                type="button"
                className={`online__tab ${tab === 'search' ? 'is-active' : ''}`}
                onClick={() => {
                  setDetail(null)
                  setTab('search')
                  setItems([])
                  setFilterCat('')
                }}
              >
                搜索
              </button>

              {categories.length > 0 && (
                <select
                  className="online__select"
                  value={filterCat}
                  onChange={(e) => setFilterCat(e.target.value)}
                  title="按分类筛选"
                >
                  <option value="">全部分类</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              {tab === 'search' && (
                <form
                  className="online__search"
                  onSubmit={(e) => {
                    e.preventDefault()
                    doSearch()
                  }}
                >
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="输入菜名关键词（中文或英文）"
                  />
                  <button type="submit">搜索</button>
                </form>
              )}
            </div>

            {renderList()}
          </div>
        ) : (
          <div className="online__body online__detail">
            {detail.thumb && (
              <div className="online__detail-img">
                <img src={detail.thumb} alt={detail.name} />
              </div>
            )}
            <div className="online__detail-actions">
              <button type="button" className="online__btn" onClick={() => setDetail(null)}>
                返回列表
              </button>
              <button type="button" className="online__btn online__btn--primary" onClick={() => onImport(detail)}>
                导入到我的菜单
              </button>
            </div>

            <div className="online__detail-meta">
              {detail.category && <span className="online__tag">{detail.category}</span>}
              {detail.area && <span className="online__tag">{detail.area}</span>}
              {(detail.source || detail.youtube) && (
                <span className="online__links">
                  {detail.source && (
                    <a href={detail.source} target="_blank" rel="noreferrer">
                      来源
                    </a>
                  )}
                  {detail.youtube && (
                    <a href={detail.youtube} target="_blank" rel="noreferrer">
                      视频
                    </a>
                  )}
                </span>
              )}
            </div>

            {detail.ingredients?.length ? (
              <section className="online__section">
                <h3>食材</h3>
                <ul className="online__ingredients">
                  {detail.ingredients.map((it, idx) => (
                    <li key={idx}>
                      {it.name}
                      {it.measure ? `（${it.measure}）` : ''}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {detail.steps?.length ? (
              <section className="online__section">
                <h3>做法</h3>
                <ol className="online__steps">
                  {detail.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </section>
            ) : detail.instructions ? (
              <section className="online__section">
                <h3>做法</h3>
                <pre className="online__instructions">{detail.instructions}</pre>
              </section>
            ) : null}
          </div>
        )}

        {loading && items.length > 0 && !detail && <div className="online__loading">加载中…</div>}
      </div>
    </div>
  )
}
