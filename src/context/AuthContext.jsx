import { createContext, useCallback, useContext, useState } from 'react'

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

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession(SESSION_KEY))
  const [admin, setAdmin] = useState(() => readSession(ADMIN_SESSION_KEY))

  const login = useCallback((email, password) => {
    if (email !== TEST_CREDENTIALS.email || password !== TEST_CREDENTIALS.password) {
      return false
    }
    const session = { email }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
    return true
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  const adminLogin = useCallback((email, password) => {
    if (email !== TEST_CREDENTIALS.email || password !== TEST_CREDENTIALS.password) {
      return false
    }
    const session = { email }
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
