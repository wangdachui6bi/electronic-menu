import type { MenuBootstrap } from './menuTypes'

const API_BASE = import.meta.env.VITE_MENU_API_BASE || 'http://localhost:3600'

const MENU_TOKEN = import.meta.env.VITE_MENU_TOKEN || ''

function withToken(headers: HeadersInit = {}) {
  return MENU_TOKEN
    ? {
      ...headers,
      'X-Menu-Token': MENU_TOKEN,
    }
    : headers
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: withToken({
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `请求失败：${response.status}`)
  }

  return (await response.json()) as T
}

export function getMenuApiBase() {
  return API_BASE
}

export function subscribeMenuRefresh(
  onRefresh: (reason: string) => void,
  onStatus?: (status: 'live' | 'closed' | 'error') => void
) {
  const query = MENU_TOKEN ? `?menu_token=${encodeURIComponent(MENU_TOKEN)}` : ''
  const eventSource = new EventSource(`${API_BASE}/api/menu/events/stream${query}`)

  eventSource.addEventListener('connected', () => onStatus?.('live'))
  eventSource.addEventListener('refresh', (event) => {
    onStatus?.('live')
    const payload = event instanceof MessageEvent ? JSON.parse(event.data) : { reason: 'refresh' }
    onRefresh(String(payload.reason || 'refresh'))
  })
  eventSource.onerror = () => {
    onStatus?.('error')
  }

  return () => {
    onStatus?.('closed')
    eventSource.close()
  }
}

export function fetchBootstrap() {
  return request<MenuBootstrap>('/api/menu/bootstrap')
}

export function createDish(payload: {
  actor: string
  name: string
  category: string
  description: string
  tags: string[]
  imageData?: string
  sourceType?: string
}) {
  return request<MenuBootstrap>('/api/menu/dishes', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateDish(
  id: string,
  payload: {
    actor: string
    name: string
    category: string
    description: string
    tags: string[]
    imageData?: string
    sourceType?: string
  }
) {
  return request<MenuBootstrap>(`/api/menu/dishes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteDish(id: string, actor: string) {
  return request<MenuBootstrap>(`/api/menu/dishes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({ actor }),
  })
}

export function importDishes(payload: {
  actor: string
  items: Array<{
    name: string
    category?: string
    description?: string
    tags?: string[]
    imageData?: string
    sourceType?: string
  }>
}) {
  return request<MenuBootstrap>('/api/menu/dishes/import', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function createRequest(payload: {
  actor: string
  dishId?: string
  dishName?: string
  note?: string
}) {
  return request<MenuBootstrap>('/api/menu/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateRequestStatus(
  id: string,
  payload: {
    actor: string
    status: string
    note?: string
  }
) {
  return request<MenuBootstrap>(`/api/menu/requests/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteRequest(id: string, actor: string) {
  return request<MenuBootstrap>(`/api/menu/requests/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({ actor }),
  })
}

export function addComment(payload: {
  actor: string
  targetType: 'dish' | 'request'
  targetId: string
  content: string
}) {
  return request<MenuBootstrap>('/api/menu/comments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
