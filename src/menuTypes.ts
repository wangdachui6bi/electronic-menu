export type MenuDish = {
  id: string
  name: string
  category: string
  description: string
  imageData: string
  tags: string[]
  sourceType: string
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export type MenuRequest = {
  id: string
  dishId: string
  dishName: string
  requestType: 'menu' | 'wish'
  note: string
  requestedBy: string
  status: 'pending' | 'accepted' | 'cooking' | 'done' | 'declined' | string
  createdAt: string
  updatedAt: string
}

export type MenuComment = {
  id: string
  targetType: 'dish' | 'request'
  targetId: string
  content: string
  author: string
  createdAt: string
}

export type MenuEvent = {
  id: number
  eventType: string
  entityType: string
  entityId: string
  summary: string
  payload: Record<string, unknown> | null
  createdAt: string
}

export type MenuRecommendation = {
  name: string
  category: string
  reason: string
  tags: string[]
}

export type MenuBootstrap = {
  serverTime: string
  dishes: MenuDish[]
  requests: MenuRequest[]
  comments: MenuComment[]
  events: MenuEvent[]
  recommendations: MenuRecommendation[]
}

export type IdentityKey = 'me' | 'partner'
