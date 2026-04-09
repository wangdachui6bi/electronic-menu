const API_BASE = import.meta.env.VITE_MENU_API_BASE || 'http://localhost:3600'
const LEGACY_ACCESS_TOKEN = import.meta.env.VITE_APP_TOKEN || import.meta.env.VITE_MENU_TOKEN || ''
const SESSION_TOKEN_KEY = 'toolkit-session-token'

type JsonBody = Record<string, unknown> | Array<unknown> | undefined

export function getApiBase() {
  return API_BASE
}

export function getAccessToken() {
  return localStorage.getItem(SESSION_TOKEN_KEY) || LEGACY_ACCESS_TOKEN || ''
}

export function setAccessToken(token: string | null) {
  if (!token) {
    localStorage.removeItem(SESSION_TOKEN_KEY)
    return
  }

  localStorage.setItem(SESSION_TOKEN_KEY, token)
}

export function buildAssetUrl(path: string, extraParams?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(`${API_BASE}${path}`)

  const token = getAccessToken()
  if (token) {
    url.searchParams.set('auth_token', token)
  }

  Object.entries(extraParams || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    url.searchParams.set(key, String(value))
  })

  return url.toString()
}

export function getAccessHeaders(headers: HeadersInit = {}) {
  const token = getAccessToken()

  return token
    ? {
        ...headers,
        'X-Session-Token': token,
      }
    : headers
}

export async function requestJson<T>(path: string, init?: RequestInit & { bodyJson?: JsonBody }): Promise<T> {
  const headers = getAccessHeaders(init?.headers)
  const body =
    init?.bodyJson !== undefined && !(init.body instanceof FormData) ? JSON.stringify(init.bodyJson) : init?.body

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers:
      init?.body instanceof FormData
        ? headers
        : {
            'Content-Type': 'application/json',
            ...headers,
          },
    body,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `请求失败：${response.status}`)
  }

  return (await response.json()) as T
}
