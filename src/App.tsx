import { startTransition, useCallback, useDeferredValue, useEffect, useState, type ChangeEvent } from 'react'
import { fetchLatestRecipes, fetchRecipeDetail, searchRecipes, type OnlineRecipe } from './online'
import {
  addComment,
  createDish,
  createRequest,
  deleteDish,
  deleteRequest,
  fetchBootstrap,
  importDishes,
  subscribeMenuRefresh,
  updateDish,
  updateRequestStatus,
} from './menuApi'
import type {
  IdentityKey,
  MenuBootstrap,
  MenuComment,
  MenuDish,
  MenuRecommendation,
  MenuRequest,
} from './menuTypes'
import {
  Heart,
  UtensilsCrossed,
  Send,
  Plus,
  Search,
  Shuffle,
  MessageCircleHeart,
  ChefHat,
  BookOpen,
  Sparkles,
  Clock,
  Trash2,
  Pencil,
  X,
  Import,
  ClipboardList,
} from 'lucide-react'
import './App.css'

type TabKey = 'requests' | 'menu' | 'studio'

type DishDraft = {
  id?: string
  name: string
  category: string
  description: string
  tags: string
  imageData: string
  sourceType: string
}

const EMPTY_BOARD: MenuBootstrap = {
  serverTime: '',
  dishes: [],
  requests: [],
  comments: [],
  events: [],
  recommendations: [],
}

const IDENTITIES: Record<IdentityKey, { label: string; actor: string; hint: string }> = {
  me: {
    label: '我是我',
    actor: '我',
    hint: '偏主厨视角，适合处理点单和维护菜单。',
  },
  partner: {
    label: '我是女朋友',
    actor: '女朋友',
    hint: '偏点菜视角，适合直接说想吃什么。',
  },
}

const REQUEST_STATUSES = [
  { value: 'pending', label: '待安排' },
  { value: 'accepted', label: '准备做' },
  { value: 'cooking', label: '正在做' },
  { value: 'done', label: '已吃上' },
  { value: 'declined', label: '这次先不做' },
]

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function toDishDraft(dish?: MenuDish): DishDraft {
  if (!dish) {
    return {
      name: '',
      category: '',
      description: '',
      tags: '',
      imageData: '',
      sourceType: 'custom',
    }
  }

  return {
    id: dish.id,
    name: dish.name,
    category: dish.category,
    description: dish.description,
    tags: dish.tags.join(' / '),
    imageData: dish.imageData,
    sourceType: dish.sourceType || 'custom',
  }
}

function parseTagInput(value: string) {
  return value
    .split(/[、,/，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12)
}

function parseImportText(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [categoryMaybe, nameMaybe] = line.includes('/') ? line.split('/') : ['', line]
      return {
        name: (nameMaybe || line).trim(),
        category: (categoryMaybe || '').trim(),
        sourceType: 'import',
      }
    })
    .filter((item) => item.name)
}

function buildRecipeDescription(recipe: OnlineRecipe) {
  const parts: string[] = []

  if (recipe.ingredients?.length) {
    parts.push(
      `食材：\n${recipe.ingredients
        .slice(0, 16)
        .map((item) => `- ${item.name}${item.measure ? `：${item.measure}` : ''}`)
        .join('\n')}`
    )
  }

  const steps = recipe.steps?.length
    ? recipe.steps
    : (recipe.instructions || '')
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)

  if (steps.length) {
    parts.push(`做法：\n${steps.slice(0, 8).map((step, index) => `${index + 1}. ${step}`).join('\n')}`)
  }

  return parts.join('\n\n').trim()
}

function commentsFor(list: MenuComment[], targetType: 'dish' | 'request', targetId: string) {
  return list
    .filter((item) => item.targetType === targetType && item.targetId === targetId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

async function readFileAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

export default function App() {
  const [board, setBoard] = useState<MenuBootstrap>(EMPTY_BOARD)
  const [loading, setLoading] = useState(true)
  const [syncMessage, setSyncMessage] = useState('正在连接共享菜单...')
  const [liveStatus, setLiveStatus] = useState<'live' | 'closed' | 'error'>('closed')
  const [activeTab, setActiveTab] = useState<TabKey>('requests')
  const [identity, setIdentity] = useState<IdentityKey>(() => {
    const stored = localStorage.getItem('couple-menu-identity')
    return stored === 'partner' ? 'partner' : 'me'
  })

  const [requestText, setRequestText] = useState('')
  const [requestNote, setRequestNote] = useState('')
  const [menuSearch, setMenuSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dishEditorOpen, setDishEditorOpen] = useState(false)
  const [dishDraft, setDishDraft] = useState<DishDraft>(toDishDraft())
  const [selectedDishId, setSelectedDishId] = useState('')
  const [importText, setImportText] = useState('')
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [recipeQuery, setRecipeQuery] = useState('')
  const [onlineRecipes, setOnlineRecipes] = useState<OnlineRecipe[]>([])
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)

  const deferredMenuSearch = useDeferredValue(menuSearch)
  const actor = IDENTITIES[identity].actor
  const selectedDish = board.dishes.find((item) => item.id === selectedDishId) || null

  const loadBoard = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }

    try {
      const next = await fetchBootstrap()
      startTransition(() => setBoard(next))
      setSyncMessage('数据已和服务器保持同步')
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : '加载共享菜单失败')
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('couple-menu-identity', identity)
  }, [identity])

  useEffect(() => {
    loadBoard()
  }, [loadBoard])

  useEffect(() => {
    const unsubscribe = subscribeMenuRefresh(
      () => {
        void loadBoard(true)
        setSyncMessage('刚刚收到了另一端的新动作')
      },
      (status) => setLiveStatus(status)
    )

    return () => {
      unsubscribe()
    }
  }, [loadBoard])

  useEffect(() => {
    let cancelled = false

    async function loadRecipes() {
      setRecipeLoading(true)
      try {
        const latest = await fetchLatestRecipes()
        if (!cancelled) {
          setOnlineRecipes(latest.slice(0, 12))
        }
      } catch {
        if (!cancelled) {
          setOnlineRecipes([])
        }
      } finally {
        if (!cancelled) {
          setRecipeLoading(false)
        }
      }
    }

    void loadRecipes()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (recipeQuery.trim()) {
      return
    }

    let cancelled = false
    setRecipeLoading(true)

    fetchLatestRecipes()
      .then((latest) => {
        if (!cancelled) {
          setOnlineRecipes(latest.slice(0, 12))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOnlineRecipes([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRecipeLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [recipeQuery])

  const categories = Array.from(new Set(board.dishes.map((dish) => dish.category).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'zh-CN')
  )

  const filteredDishes = board.dishes.filter((dish) => {
    const keyword = `${dish.name} ${dish.category} ${dish.description} ${dish.tags.join(' ')}`.toLowerCase()
    if (categoryFilter && dish.category !== categoryFilter) {
      return false
    }
    if (deferredMenuSearch && !keyword.includes(deferredMenuSearch.toLowerCase())) {
      return false
    }
    return true
  })

  const featuredDishes = filteredDishes.slice(0, 8)
  const recentRequests = [...board.requests].sort((a, b) => {
    const pendingWeight = a.status === 'pending' ? -1 : 0
    const pendingWeightB = b.status === 'pending' ? -1 : 0
    if (pendingWeight !== pendingWeightB) {
      return pendingWeight - pendingWeightB
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  const pendingCount = board.requests.filter((item) => item.status === 'pending').length
  const menuCount = board.dishes.length
  const todayDoneCount = board.requests.filter((item) => item.status === 'done').length

  async function applyMutation(task: () => Promise<MenuBootstrap>, successMessage: string) {
    setActionBusy(true)
    try {
      const next = await task()
      startTransition(() => setBoard(next))
      setSyncMessage(successMessage)
      return true
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : '操作失败，请稍后再试')
      return false
    } finally {
      setActionBusy(false)
    }
  }

  function openCreateDish() {
    setDishDraft(toDishDraft())
    setDishEditorOpen(true)
  }

  function openEditDish(dish: MenuDish) {
    setDishDraft(toDishDraft(dish))
    setDishEditorOpen(true)
  }

  async function handleDishImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setDishDraft((current) => ({ ...current, imageData: dataUrl }))
      setSyncMessage('图片已准备好，保存后会同步到共享菜单')
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : '图片处理失败')
    }
  }

  async function submitDish() {
    if (!dishDraft.name.trim()) {
      setSyncMessage('先写一下菜名再保存')
      return
    }

    const payload = {
      actor,
      name: dishDraft.name.trim(),
      category: dishDraft.category.trim(),
      description: dishDraft.description.trim(),
      tags: parseTagInput(dishDraft.tags),
      imageData: dishDraft.imageData || undefined,
      sourceType: dishDraft.sourceType || 'custom',
    }

    const ok = await applyMutation(
      () => (dishDraft.id ? updateDish(dishDraft.id, payload) : createDish(payload)),
      dishDraft.id ? '菜品已经更新，另一端也会立刻看到' : '新菜已经加入共享菜单'
    )

    if (ok) {
      setDishEditorOpen(false)
      setDishDraft(toDishDraft())
    }
  }

  async function handleDeleteDish(dish: MenuDish) {
    if (!window.confirm(`确定删除「${dish.name}」吗？`)) {
      return
    }

    await applyMutation(() => deleteDish(dish.id, actor), `已从共享菜单移除「${dish.name}」`)
    if (selectedDishId === dish.id) {
      setSelectedDishId('')
    }
  }

  async function submitWishRequest() {
    if (!requestText.trim()) {
      setSyncMessage('可以直接写一句想吃什么，比如“今晚想吃番茄牛腩”')
      return
    }

    const ok = await applyMutation(
      () =>
        createRequest({
          actor,
          dishName: requestText.trim(),
          note: requestNote.trim(),
        }),
      '点单已经发出，并且会推送到飞书'
    )

    if (ok) {
      setRequestText('')
      setRequestNote('')
    }
  }

  async function quickOrderDish(dish: MenuDish) {
    const ok = await applyMutation(
      () =>
        createRequest({
          actor,
          dishId: dish.id,
          note: requestNote.trim(),
        }),
      `已经把「${dish.name}」加入待安排清单`
    )
    if (ok) {
      setRequestNote('')
    }
  }

  async function changeRequestStatus(item: MenuRequest, status: string) {
    await applyMutation(
      () =>
        updateRequestStatus(item.id, {
          actor,
          status,
          note: item.note,
        }),
      `「${item.dishName}」状态已更新`
    )
  }

  async function handleDeleteRequest(item: MenuRequest) {
    if (!window.confirm(`确定删除这条点单「${item.dishName}」吗？`)) {
      return
    }

    await applyMutation(
      () => deleteRequest(item.id, actor),
      `已删除点单「${item.dishName}」`
    )
  }

  async function submitComment(targetType: 'dish' | 'request', targetId: string) {
    const key = `${targetType}:${targetId}`
    const content = String(commentDrafts[key] || '').trim()
    if (!content) {
      return
    }

    const ok = await applyMutation(
      () =>
        addComment({
          actor,
          targetType,
          targetId,
          content,
        }),
      '评论已发出，对方会实时看到'
    )

    if (ok) {
      setCommentDrafts((current) => ({ ...current, [key]: '' }))
    }
  }

  async function submitImport() {
    const items = parseImportText(importText)
    if (!items.length) {
      setSyncMessage('导入格式可以写成“分类/菜名”，一行一个')
      return
    }

    const ok = await applyMutation(
      () =>
        importDishes({
          actor,
          items,
        }),
      `已尝试导入 ${items.length} 道菜`
    )

    if (ok) {
      setImportText('')
    }
  }

  async function addRecommendation(item: MenuRecommendation) {
    await applyMutation(
      () =>
        createDish({
          actor,
          name: item.name,
          category: item.category,
          description: item.reason,
          tags: item.tags,
          sourceType: 'recommendation',
        }),
      `推荐菜「${item.name}」已加入菜单`
    )
  }

  async function importOnlineRecipe(recipe: OnlineRecipe) {
    setActionBusy(true)
    try {
      const full = recipe.instructions || recipe.ingredients?.length ? recipe : await fetchRecipeDetail(recipe.id)
      const use = full || recipe
      const payload = {
        actor,
        name: use.name,
        category: use.category || '',
        description: buildRecipeDescription(use),
        tags: [use.area || '', ...(use.tags || [])].filter(Boolean).slice(0, 8),
        sourceType: 'online',
      }
      const next = await createDish(payload)
      startTransition(() => setBoard(next))
      setSyncMessage(`已把「${use.name}」加入共享菜单`)
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : '导入在线菜谱失败')
    } finally {
      setActionBusy(false)
    }
  }

  async function runRecipeSearch() {
    if (!recipeQuery.trim()) {
      const latest = await fetchLatestRecipes()
      setOnlineRecipes(latest.slice(0, 12))
      return
    }

    setRecipeLoading(true)
    try {
      const results = await searchRecipes(recipeQuery.trim())
      setOnlineRecipes(results.slice(0, 20))
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : '搜索在线菜谱失败')
    } finally {
      setRecipeLoading(false)
    }
  }

  function pickRandomTonight() {
    if (!filteredDishes.length) {
      setSyncMessage('当前筛选下没有可选菜品')
      return
    }

    const next = filteredDishes[Math.floor(Math.random() * filteredDishes.length)]
    setSelectedDishId(next.id)
    setActiveTab('menu')
    setSyncMessage(`今晚候选：${next.name}`)
  }

  return (
    <div className="shell">
      <section className="hero">
        <div className="hero__content">
          <div className="hero__icon"><Heart size={20} /></div>
          <h1>今晚吃什么，不用来回问</h1>
          <p>直接点菜、说想吃什么、补一句口味备注，另一端会立刻看到。</p>
          <div className="hero__chips">
            <span className={`hero__status hero__status--${liveStatus}`}>
              {liveStatus === 'live' && <span className="status-dot" />}
              {liveStatus === 'live' ? '实时在线' : liveStatus === 'error' ? '连接波动' : '连接中断'}
            </span>
            <span className="hero__status">{syncMessage}</span>
          </div>
        </div>
        <div className="hero__stats">
          <div>
            <strong>{pendingCount}</strong>
            <span>待安排</span>
          </div>
          <div>
            <strong>{menuCount}</strong>
            <span>菜单总数</span>
          </div>
          <div>
            <strong>{todayDoneCount}</strong>
            <span>已吃上</span>
          </div>
        </div>
      </section>

      <section className="identity-bar">
        <div className="identity-bar__info">
          <div className={`identity-bar__avatar identity-bar__avatar--${identity}`}>
            {identity === 'me' ? '👨‍🍳' : '💕'}
          </div>
          <div>
            <div className="section-title">{IDENTITIES[identity].label}</div>
            <div className="identity-bar__hint">{IDENTITIES[identity].hint}</div>
          </div>
        </div>
        <div className="identity-bar__switch">
          {(Object.keys(IDENTITIES) as IdentityKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`chip ${identity === key ? 'is-active' : ''}`}
              onClick={() => setIdentity(key)}
            >
              {IDENTITIES[key].label}
            </button>
          ))}
        </div>
      </section>

      <nav className="tabs">
        <button type="button" className={activeTab === 'requests' ? 'is-active' : ''} onClick={() => setActiveTab('requests')}>
          <ClipboardList /> 点菜台
        </button>
        <button type="button" className={activeTab === 'menu' ? 'is-active' : ''} onClick={() => setActiveTab('menu')}>
          <BookOpen /> 菜单
        </button>
        <button type="button" className={activeTab === 'studio' ? 'is-active' : ''} onClick={() => setActiveTab('studio')}>
          <Sparkles /> 发现
        </button>
      </nav>

      <main className="workspace">
        {loading ? (
          <div className="empty-state"><Heart /> 正在加载共享菜单…</div>
        ) : (
          <>
            {activeTab === 'requests' && (
              <section className="panel-grid">
                <section className="panel panel--highlight">
                  <div className="section-title"><MessageCircleHeart /> 一句话点菜</div>
                  <textarea
                    className="field field--textarea"
                    value={requestText}
                    onChange={(event) => setRequestText(event.target.value)}
                    placeholder="比如：今晚想吃酸汤肥牛，别太辣。"
                  />
                  <input
                    className="field"
                    value={requestNote}
                    onChange={(event) => setRequestNote(event.target.value)}
                    placeholder="补充一句备注：比如少辣、加蛋、想配米饭"
                  />
                  <div className="inline-actions">
                    <button type="button" className="primary-btn" onClick={() => void submitWishRequest()} disabled={actionBusy}>
                      <Send /> 发送点单
                    </button>
                    <button type="button" className="ghost-btn" onClick={pickRandomTonight}>
                      <Shuffle /> 随机挑一道
                    </button>
                  </div>
                </section>

                <section className="panel">
                  <div className="section-title"><UtensilsCrossed /> 菜单里直接点</div>
                  <div className="quick-dish-list">
                    {featuredDishes.length === 0 ? (
                      <div className="subtle-copy">先去“共享菜单”加几道常做的菜，这里就会出现快捷点单入口。</div>
                    ) : (
                      featuredDishes.map((dish) => (
                        <button key={dish.id} type="button" className="quick-dish" onClick={() => void quickOrderDish(dish)}>
                          <strong>{dish.name}</strong>
                          <span>{dish.category || '未分类'}</span>
                        </button>
                      ))
                    )}
                  </div>
                </section>

                <section className="panel panel--full">
                  <div className="section-head">
                    <div>
                      <div className="section-title"><Clock /> 待处理点单</div>
                      <div className="subtle-copy">状态变化和评论都会实时同步</div>
                    </div>
                  </div>
                  <div className="request-list">
                    {recentRequests.length === 0 ? (
                      <div className="empty-state"><Heart /> 还没有点菜记录，今晚的第一道菜从这里开始</div>
                    ) : (
                      recentRequests.map((item) => {
                        const requestComments = commentsFor(board.comments, 'request', item.id)
                        const commentKey = `request:${item.id}`
                        return (
                          <article key={item.id} className={`request-card request-card--${item.status}`}>
                            <div className="request-card__head">
                              <div>
                                <div className="request-card__title">{item.dishName}</div>
                                <div className="request-card__meta">
                                  {item.requestedBy} · {formatTime(item.createdAt)}
                                </div>
                              </div>
                              <div className="request-card__head-actions">
                                <span className="status-pill">{REQUEST_STATUSES.find((status) => status.value === item.status)?.label || item.status}</span>
                                <button
                                  type="button"
                                  className="request-delete-btn"
                                  onClick={() => void handleDeleteRequest(item)}
                                  disabled={actionBusy}
                                  aria-label={`删除点单 ${item.dishName}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            {item.note && <div className="request-card__note">{item.note}</div>}
                            <div className="status-row">
                              {REQUEST_STATUSES.map((status) => (
                                <button
                                  key={status.value}
                                  type="button"
                                  className={`status-btn ${item.status === status.value ? 'is-active' : ''}`}
                                  onClick={() => void changeRequestStatus(item, status.value)}
                                  disabled={actionBusy}
                                >
                                  {status.label}
                                </button>
                              ))}
                            </div>
                            <div className="comment-stream">
                              {requestComments.map((comment) => (
                                <div key={comment.id} className="comment-item">
                                  <strong>{comment.author}</strong>
                                  <span>{comment.content}</span>
                                </div>
                              ))}
                            </div>
                            <div className="comment-editor">
                              <input
                                className="field"
                                value={commentDrafts[commentKey] || ''}
                                onChange={(event) =>
                                  setCommentDrafts((current) => ({ ...current, [commentKey]: event.target.value }))
                                }
                                placeholder="给这条点单补一句评论"
                              />
                              <button type="button" className="ghost-btn" onClick={() => void submitComment('request', item.id)}>
                                <Send /> 发送
                              </button>
                            </div>
                          </article>
                        )
                      })
                    )}
                  </div>
                </section>
              </section>
            )}

            {activeTab === 'menu' && (
              <section className="panel-grid">
                <section className="panel panel--full">
                  <div className="section-head">
                    <div className="section-title"><BookOpen /> 共享菜单</div>
                    <div className="inline-actions">
                      <input
                        className="field field--compact"
                        value={menuSearch}
                        onChange={(event) => setMenuSearch(event.target.value)}
                        placeholder="搜索菜名、分类…"
                      />
                      <select className="field field--compact" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                        <option value="">全部分类</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="primary-btn" onClick={openCreateDish}>
                        <Plus /> 新增
                      </button>
                    </div>
                  </div>
                  <div className="dish-list">
                    {filteredDishes.length === 0 ? (
                      <div className="empty-state"><UtensilsCrossed /> 还没有菜，去「发现」里加一些吧</div>
                    ) : (
                      filteredDishes.map((dish) => (
                        <article key={dish.id} className="dish-card" onClick={() => setSelectedDishId(dish.id)}>
                          {dish.imageData ? (
                            <img className="dish-card__image" src={dish.imageData} alt={dish.name} />
                          ) : (
                            <div className="dish-card__placeholder">{dish.name.slice(0, 2)}</div>
                          )}
                          <div className="dish-card__body">
                            <div className="dish-card__head">
                              <div>
                                <div className="dish-card__title">{dish.name}</div>
                                <div className="dish-card__meta">{dish.category || '未分类'} · {formatTime(dish.updatedAt)}</div>
                              </div>
                              <button
                                type="button"
                                className="ghost-btn"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void quickOrderDish(dish)
                                }}
                              >
                                <Heart size={14} /> 点这个
                              </button>
                            </div>
                            <p>{dish.description || '点进来写做法、口味和照片'}</p>
                            <div className="tag-row">
                              {dish.tags.slice(0, 5).map((tag) => (
                                <span key={tag} className="tag">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              </section>
            )}

            {activeTab === 'studio' && (
              <section className="panel-grid">
                <section className="panel">
                  <div className="section-title"><Import /> 快速导入</div>
                  <div className="subtle-copy">一行一个菜，也可以写成“分类/菜名”。</div>
                  <textarea
                    className="field field--textarea"
                    value={importText}
                    onChange={(event) => setImportText(event.target.value)}
                    placeholder={`家常/番茄炒蛋\n快炒/青椒牛肉丝\n红烧肉`}
                  />
                  <button type="button" className="primary-btn" onClick={() => void submitImport()} disabled={actionBusy}>
                    <Import /> 批量导入
                  </button>
                </section>

                <section className="panel">
                  <div className="section-head">
                    <div className="section-title"><Sparkles /> 推荐好菜</div>
                    <div className="subtle-copy">先挑进菜单，之后她就能直接点。</div>
                  </div>
                  <div className="recommend-list">
                    {board.recommendations.map((item) => (
                      <article key={item.name} className="recommend-card">
                        <div>
                          <strong>{item.name}</strong>
                          <p>{item.reason}</p>
                        </div>
                        <button type="button" className="ghost-btn" onClick={() => void addRecommendation(item)}>
                          <Plus size={14} /> 加入
                        </button>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="panel panel--full">
                  <div className="section-head">
                    <div className="section-title"><ChefHat /> 在线菜谱</div>
                    <div className="inline-actions">
                      <div className="search-field-wrap">
                        <input
                          className="field field--compact"
                          value={recipeQuery}
                          onChange={(event) => setRecipeQuery(event.target.value)}
                          placeholder="搜索菜名，中文会走家常菜谱库"
                        />
                        {recipeQuery && (
                          <button
                            type="button"
                            className="search-clear-btn"
                            onClick={() => setRecipeQuery('')}
                            aria-label="清空搜索"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <button type="button" className="primary-btn" onClick={() => void runRecipeSearch()} disabled={recipeLoading}>
                        <Search /> {recipeLoading ? '搜索中…' : '搜索'}
                      </button>
                    </div>
                  </div>
                  <div className="online-list">
                    {onlineRecipes.map((recipe) => (
                      <article key={recipe.id} className="online-card">
                        <div>
                          <strong>{recipe.name}</strong>
                          <div className="dish-card__meta">
                            {[recipe.category, recipe.area].filter(Boolean).join(' · ') || '在线推荐'}
                          </div>
                        </div>
                        <button type="button" className="ghost-btn" onClick={() => void importOnlineRecipe(recipe)}>
                          <Plus size={14} /> 加入菜单
                        </button>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="panel panel--full">
                  <div className="section-title"><Clock /> 最近动态</div>
                  <div className="event-list">
                    {board.events.map((event) => (
                      <div key={event.id} className="event-item">
                        <strong>{event.summary}</strong>
                        <span>{formatTime(event.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </section>
            )}
          </>
        )}
      </main>

      {dishEditorOpen && (
        <div className="modal-shell" onClick={() => setDishEditorOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__head">
              <div>
                <div className="section-title">{dishDraft.id ? <><Pencil /> 编辑这道菜</> : <><Plus /> 添加新菜</>}</div>
                <div className="subtle-copy">支持照片、标签和一句做法说明。</div>
              </div>
              <button type="button" className="ghost-btn" onClick={() => setDishEditorOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="form-grid">
              <input
                className="field"
                value={dishDraft.name}
                onChange={(event) => setDishDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="菜名"
              />
              <input
                className="field"
                value={dishDraft.category}
                onChange={(event) => setDishDraft((current) => ({ ...current, category: event.target.value }))}
                placeholder="分类，比如：家常 / 快炒 / 汤锅"
              />
              <input
                className="field"
                value={dishDraft.tags}
                onChange={(event) => setDishDraft((current) => ({ ...current, tags: event.target.value }))}
                placeholder="标签，用空格或斜杠分隔"
              />
              <input className="field" type="file" accept="image/*" onChange={(event) => void handleDishImageChange(event)} />
              <textarea
                className="field field--textarea"
                value={dishDraft.description}
                onChange={(event) => setDishDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="可以写做法、食材、口味提醒，或者这道菜为什么值得保留。"
              />
              {dishDraft.imageData && <img className="image-preview" src={dishDraft.imageData} alt={dishDraft.name || '预览图'} />}
            </div>
            <div className="inline-actions">
              <button type="button" className="primary-btn" onClick={() => void submitDish()} disabled={actionBusy}>
                {dishDraft.id ? '保存修改' : '加入共享菜单'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDish && (
        <div className="modal-shell" onClick={() => setSelectedDishId('')}>
          <div className="modal-card modal-card--wide" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__head">
              <div>
                <div className="section-title">{selectedDish.name}</div>
                <div className="subtle-copy">
                  {selectedDish.category || '未分类'} · 由 {selectedDish.updatedBy || selectedDish.createdBy || '共享菜单'} 更新
                </div>
              </div>
              <div className="inline-actions">
                <button type="button" className="ghost-btn" onClick={() => openEditDish(selectedDish)}>
                  <Pencil size={14} /> 编辑
                </button>
                <button type="button" className="ghost-btn" onClick={() => void handleDeleteDish(selectedDish)}>
                  <Trash2 size={14} /> 删除
                </button>
              </div>
            </div>
            <div className="detail-layout">
              <div>
                {selectedDish.imageData ? (
                  <img className="detail-image" src={selectedDish.imageData} alt={selectedDish.name} />
                ) : (
                  <div className="detail-image detail-image--empty">还没上传照片</div>
                )}
                <div className="tag-row">
                  {selectedDish.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="detail-copy">{selectedDish.description || '还没有写说明'}</p>
                <div className="inline-actions">
                  <button type="button" className="primary-btn" onClick={() => void quickOrderDish(selectedDish)}>
                    <Heart size={15} /> 直接点这道菜
                  </button>
                </div>
              </div>
              <div>
                <div className="section-title"><MessageCircleHeart /> 评论</div>
                <div className="comment-stream">
                  {commentsFor(board.comments, 'dish', selectedDish.id).map((comment) => (
                    <div key={comment.id} className="comment-item">
                      <strong>{comment.author}</strong>
                      <span>{comment.content}</span>
                    </div>
                  ))}
                </div>
                <div className="comment-editor">
                  <input
                    className="field"
                    value={commentDrafts[`dish:${selectedDish.id}`] || ''}
                    onChange={(event) =>
                      setCommentDrafts((current) => ({
                        ...current,
                        [`dish:${selectedDish.id}`]: event.target.value,
                      }))
                    }
                    placeholder="评价一下这道菜：比如太辣了、很适合周末"
                  />
                  <button type="button" className="ghost-btn" onClick={() => void submitComment('dish', selectedDish.id)}>
                    <Send size={14} /> 发送
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
