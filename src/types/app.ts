export type IdentityKey = 'me' | 'partner'

export type MenuPermissions = {
  menuView: boolean
  submitRequest: boolean
  comment: boolean
  manageDishes: boolean
  manageRequests: boolean
  managePermissions: boolean
}

export type AuthUser = {
  id: string
  username: string
  displayName: string
  isOwner: boolean
  menuPermissions: MenuPermissions
  createdAt: string
  updatedAt: string
}

export type AuthSession = {
  token: string
  expiresAt: string
}

export type AuthPayload = {
  user: AuthUser
  session: AuthSession
}

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

export type SharedAlbum = {
  id: string
  name: string
  description: string
  visibility: 'private' | 'shared'
  assetCount: number
  coverAssetId: string | null
  ownerUserId: string
  currentRole: 'owner' | 'editor' | 'viewer'
  members: Array<{
    userId: string
    username: string
    displayName: string
    role: 'editor' | 'viewer'
  }>
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export type GalleryAsset = {
  id: string
  albumId: string
  albumName: string
  originalName: string
  caption: string
  mimeType: string
  mediaType: 'image' | 'video'
  sizeBytes: number
  width: number | null
  height: number | null
  durationSeconds: number | null
  isFavorite: boolean
  storageProvider: 'local' | 'cos'
  uploadedBy: string
  takenAt: string | null
  createdAt: string
  updatedAt: string
  previewUrl: string
  downloadUrl: string
}

export type GalleryComment = {
  id: string
  assetId: string
  content: string
  author: string
  createdAt: string
}

export type GalleryStorageInfo = {
  provider: 'local' | 'cos'
  configured: boolean
  directUploadReady: boolean
  note: string
}

export type GalleryBootstrap = {
  serverTime: string
  albums: SharedAlbum[]
  assets: GalleryAsset[]
  comments: GalleryComment[]
  storage: GalleryStorageInfo
  users: AuthUser[]
}

export type OnlineRecipe = {
  id: string
  name: string
  thumb?: string
  category?: string
  area?: string
  instructions?: string
  steps?: string[]
  tags?: string[]
  youtube?: string
  source?: string
  ingredients?: Array<{ name: string; measure: string }>
  provider?: 'howtocook' | 'mealdb'
}
