import { requestJson, buildAssetUrl } from './client'
import type { MenuBootstrap } from '../types/app'

export function subscribeMenuRefresh(
  onRefresh: (reason: string) => void,
  onStatus?: (status: 'live' | 'closed' | 'error') => void,
) {
  const eventSource = new EventSource(buildAssetUrl('/api/menu/events/stream'))

  eventSource.addEventListener('connected', () => onStatus?.('live'))
  eventSource.addEventListener('refresh', (event) => {
    onStatus?.('live')
    const payload = event instanceof MessageEvent ? JSON.parse(event.data) : { reason: 'refresh' }
    onRefresh(String(payload.reason || 'refresh'))
  })
  eventSource.onerror = () => onStatus?.('error')

  return () => {
    onStatus?.('closed')
    eventSource.close()
  }
}

export function fetchBootstrap() {
  return requestJson<MenuBootstrap>('/api/menu/bootstrap')
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
  return requestJson<MenuBootstrap>('/api/menu/dishes', {
    method: 'POST',
    bodyJson: payload,
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
  },
) {
  return requestJson<MenuBootstrap>(`/api/menu/dishes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    bodyJson: payload,
  })
}

export function deleteDish(id: string, actor: string) {
  return requestJson<MenuBootstrap>(`/api/menu/dishes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    bodyJson: { actor },
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
  return requestJson<MenuBootstrap>('/api/menu/dishes/import', {
    method: 'POST',
    bodyJson: payload,
  })
}

export function createRequest(payload: {
  actor: string
  dishId?: string
  dishName?: string
  note?: string
}) {
  return requestJson<MenuBootstrap>('/api/menu/requests', {
    method: 'POST',
    bodyJson: payload,
  })
}

export function updateRequestStatus(
  id: string,
  payload: {
    actor: string
    status: string
    note?: string
  },
) {
  return requestJson<MenuBootstrap>(`/api/menu/requests/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    bodyJson: payload,
  })
}

export function deleteRequest(id: string, actor: string) {
  return requestJson<MenuBootstrap>(`/api/menu/requests/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    bodyJson: { actor },
  })
}

export function addComment(payload: {
  actor: string
  targetType: 'dish' | 'request'
  targetId: string
  content: string
}) {
  return requestJson<MenuBootstrap>('/api/menu/comments', {
    method: 'POST',
    bodyJson: payload,
  })
}
