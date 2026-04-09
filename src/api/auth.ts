import { requestJson, setAccessToken } from './client'
import type { AuthPayload, AuthUser } from '../types/app'

export async function login(payload: { username: string; password: string }) {
  const result = await requestJson<AuthPayload>('/api/auth/login', {
    method: 'POST',
    bodyJson: payload,
  })
  setAccessToken(result.session.token)
  return result
}

export async function register(payload: { username: string; displayName: string; password: string }) {
  const result = await requestJson<AuthPayload>('/api/auth/register', {
    method: 'POST',
    bodyJson: payload,
  })
  setAccessToken(result.session.token)
  return result
}

export function fetchMe() {
  return requestJson<{ user: AuthUser; session: { expiresAt: string } }>('/api/auth/me')
}

export function logout() {
  return requestJson<{ ok: boolean }>('/api/auth/logout', {
    method: 'POST',
  })
}

export function fetchUsers() {
  return requestJson<{ items: AuthUser[] }>('/api/auth/users')
}

export function updateMenuPermissions(userId: string, menuPermissions: AuthUser['menuPermissions']) {
  return requestJson<{ items: AuthUser[] }>(`/api/auth/users/${encodeURIComponent(userId)}/menu-permissions`, {
    method: 'PATCH',
    bodyJson: { menuPermissions },
  })
}
