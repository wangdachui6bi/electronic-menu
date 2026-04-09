import { getAccessHeaders, requestJson } from './client'
import type { GalleryBootstrap } from '../types/app'

export type UploadMeta = {
  caption: string
  width: number | null
  height: number | null
  durationSeconds: number | null
  takenAt: string | null
}

export function fetchGalleryBootstrap() {
  return requestJson<GalleryBootstrap>('/api/gallery/bootstrap')
}

export function createAlbum(payload: { actor: string; name: string; description: string; visibility: 'private' | 'shared' }) {
  return requestJson<GalleryBootstrap>('/api/gallery/albums', {
    method: 'POST',
    bodyJson: payload,
  })
}

export function updateAlbum(
  albumId: string,
  payload: { actor: string; name: string; description: string; visibility: 'private' | 'shared' },
) {
  return requestJson<GalleryBootstrap>(`/api/gallery/albums/${encodeURIComponent(albumId)}`, {
    method: 'PATCH',
    bodyJson: payload,
  })
}

export function updateAlbumMembers(
  albumId: string,
  members: Array<{ userId: string; role: 'editor' | 'viewer' }>,
) {
  return requestJson<GalleryBootstrap>(`/api/gallery/albums/${encodeURIComponent(albumId)}/members`, {
    method: 'PUT',
    bodyJson: { members },
  })
}

export async function uploadAssets(payload: {
  actor: string
  albumId: string
  files: File[]
  items: UploadMeta[]
}) {
  const formData = new FormData()
  formData.set('actor', payload.actor)
  formData.set('albumId', payload.albumId)
  formData.set('items', JSON.stringify(payload.items))
  payload.files.forEach((file) => formData.append('files', file))

  const response = await fetch(`${import.meta.env.VITE_MENU_API_BASE || 'http://localhost:3600'}/api/gallery/assets/upload`, {
    method: 'POST',
    headers: getAccessHeaders(),
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `上传失败：${response.status}`)
  }

  return (await response.json()) as GalleryBootstrap
}

export function toggleFavorite(assetId: string, actor: string, isFavorite: boolean) {
  return requestJson<GalleryBootstrap>(`/api/gallery/assets/${encodeURIComponent(assetId)}/favorite`, {
    method: 'PATCH',
    bodyJson: { actor, isFavorite },
  })
}

export function deleteAsset(assetId: string, actor: string) {
  return requestJson<GalleryBootstrap>(`/api/gallery/assets/${encodeURIComponent(assetId)}`, {
    method: 'DELETE',
    bodyJson: { actor },
  })
}

export function addAssetComment(payload: { actor: string; assetId: string; content: string }) {
  return requestJson<GalleryBootstrap>('/api/gallery/comments', {
    method: 'POST',
    bodyJson: payload,
  })
}
