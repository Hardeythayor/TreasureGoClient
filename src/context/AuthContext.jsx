import { createContext, useCallback, useContext, useState } from 'react'
import { ApiError, isApiConfigured } from '@/lib/api'
import { loginRequest } from '@/services/authService'

export const TEST_CREDENTIALS = {
  email: 'user@treasurego.com',
  password: '12345',
}

const SESSION_KEY = 'treasure-go:session'
const ADMIN_SESSION_KEY = 'treasure-go:admin-session'

function readSession(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// The test credentials are a local-only shortcut, so they carry both roles —
// they should keep unlocking both the customer app and the admin panel like
// they always have, regardless of which one is signing in.
function mockLoginResult(email, password) {
  if (email !== TEST_CREDENTIALS.email || password !== TEST_CREDENTIALS.password) {
    return null
  }
  return { token: null, user: { email, roles: ['user', 'admin'] } }
}

// Both the customer app and the admin panel authenticate against the same
// /login endpoint — the account's `roles` array (not a separate endpoint)
// determines which side it's allowed into.
//
// Unlike other modules' generic withApiFallback usage, a reachable backend's
// rejection here must NOT fall through to the local TEST_CREDENTIALS
// shortcut — that would let the demo bypass override a real "wrong password"
// response. The local mock only kicks in when the backend genuinely can't be
// reached (not configured, offline, DNS/network failure), i.e. this module
// isn't live yet.
async function authenticate(email, password, requiredRole) {
  let result

  if (isApiConfigured()) {
    try {
      result = await loginRequest(email, password)
    } catch (err) {
      const reachedBackend = err instanceof ApiError && err.status > 0
      if (reachedBackend) return null
      if (import.meta.env.DEV) {
        console.warn('[auth] API unreachable, falling back to local test credentials:', err)
      }
      result = mockLoginResult(email, password)
    }
  } else {
    result = mockLoginResult(email, password)
  }

  if (!result || !result.user?.roles?.includes(requiredRole)) {
    return null
  }

  return {
    email: result.user?.email ?? email,
    token: result.token ?? null,
    user: result.user ?? { email },
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession(SESSION_KEY))
  const [admin, setAdmin] = useState(() => readSession(ADMIN_SESSION_KEY))

  const login = useCallback(async (email, password) => {
    const session = await authenticate(email, password, 'user')
    if (!session) return false
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
    return true
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  const adminLogin = useCallback(async (email, password) => {
    const session = await authenticate(email, password, 'admin')
    if (!session) return false
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
    setAdmin(session)
    return true
  }, [])

  const adminLogout = useCallback(() => {
    localStorage.removeItem(ADMIN_SESSION_KEY)
    setAdmin(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, login, logout, admin, adminLogin, adminLogout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
