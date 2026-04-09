import { computed, reactive } from 'vue'
import { fetchMe, login, logout, register } from '../api/auth'
import { setAccessToken } from '../api/client'
import type { AuthUser } from '../types/app'

type SessionState = {
  bootstrapped: boolean
  loading: boolean
  user: AuthUser | null
  expiresAt: string
}

const state = reactive<SessionState>({
  bootstrapped: false,
  loading: false,
  user: null,
  expiresAt: '',
})

async function hydrate() {
  if (state.loading) {
    return
  }

  state.loading = true
  try {
    const payload = await fetchMe()
    state.user = payload.user
    state.expiresAt = payload.session.expiresAt
  } catch {
    state.user = null
    state.expiresAt = ''
    setAccessToken(null)
  } finally {
    state.loading = false
    state.bootstrapped = true
  }
}

async function signIn(payload: { username: string; password: string }) {
  state.loading = true
  try {
    const result = await login(payload)
    state.user = result.user
    state.expiresAt = result.session.expiresAt
    state.bootstrapped = true
    return result.user
  } finally {
    state.loading = false
  }
}

async function signUp(payload: { username: string; displayName: string; password: string }) {
  state.loading = true
  try {
    const result = await register(payload)
    state.user = result.user
    state.expiresAt = result.session.expiresAt
    state.bootstrapped = true
    return result.user
  } finally {
    state.loading = false
  }
}

async function signOut() {
  try {
    await logout()
  } catch {
    // ignore logout failures and still clear local state
  }

  setAccessToken(null)
  state.user = null
  state.expiresAt = ''
  state.bootstrapped = true
}

export function useSession() {
  return {
    state,
    user: computed(() => state.user),
    isAuthenticated: computed(() => Boolean(state.user)),
    bootstrapped: computed(() => state.bootstrapped),
    loading: computed(() => state.loading),
    hydrate,
    signIn,
    signUp,
    signOut,
  }
}
