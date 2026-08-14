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
// The local TEST_CREDENTIALS shortcut only applies when no API base URL is
// configured at all (pure offline/demo mode). Once a real API is configured,
// every failure — unreachable, network error, or an authoritative rejection
// — is thrown with a message describing what actually happened, instead of
// silently succeeding via the local fallback. Masking a real connectivity or
// auth problem behind a fake success is worse than just showing the error.
async function authenticate(email, password, requiredRole) {
  if (!isApiConfigured()) {
    const mock = mockLoginResult(email, password)
    if (!mock || !mock.user?.roles?.includes(requiredRole)) {
      throw new Error('Incorrect email or password.')
    }
    return { email: mock.user.email, token: mock.token, user: mock.user }
  }

  let result
  try {
    result = await loginRequest(email, password)
  } catch (err) {
    const reachedBackend = err instanceof ApiError && err.status > 0
    if (reachedBackend) {
      throw new Error(err.message || 'Incorrect email or password.', { cause: err })
    }
    throw new Error('Unable to reach the server. Please check your connection and try again.', {
      cause: err,
    })
  }

  if (!result?.user?.roles?.includes(requiredRole)) {
    throw new Error('This account does not have access to this area.')
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
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  const adminLogin = useCallback(async (email, password) => {
    const session = await authenticate(email, password, 'admin')
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
    setAdmin(session)
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
