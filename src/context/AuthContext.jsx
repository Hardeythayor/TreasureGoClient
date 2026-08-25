import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { ApiError, isApiConfigured } from '@/lib/api'
import { enablePushNotifications } from '@/lib/beams'
import {
  fetchCurrentUserRequest,
  loginRequest,
  logoutRequest,
  updateProfileRequest,
} from '@/services/authService'

export const TEST_CREDENTIALS = {
  email: 'user@treasurego.com',
  password: '12345',
}

const SESSION_KEY = 'treasure-go:session'
const ADMIN_SESSION_KEY = 'treasure-go:admin-session'

// Used only when no API base URL is configured at all (pure offline/demo
// mode) — the login response itself only carries {email, roles}, so this
// fills in the rest of what GET /user would otherwise provide.
const LOCAL_PROFILE = {
  id: 'amaka-obi',
  name: 'Amaka Obi',
  username: 'amaka.o',
  country: 'Nigeria',
  status: 'active',
  createdAt: '2026-01-12T00:00:00.000000Z',
  totalTreasuresFound: 3,
  currentSubscription: {
    id: 'local-sub',
    status: 'active',
    subscribedOn: '2026-01-12T00:00:00.000000Z',
    tierId: '100',
    tierName: '$100',
    tierAmount: '100',
    tierType: 'premium',
  },
}

function readSession(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// GET /user's response wraps the record in a `user` key — falls back to a
// generic `data` wrap or a bare object, matching every other endpoint on
// this backend.
function extractProfile(result) {
  return result?.user ?? result?.data ?? result ?? {}
}

function normalizeProfile(data) {
  const sub = data.current_subscription
  return {
    id: data.id != null ? String(data.id) : '',
    name: data.name ?? '',
    username: data.username ?? '',
    country: data.country ?? '',
    status: data.status ?? '',
    createdAt: data.created_at ?? '',
    totalTreasuresFound: Number(data.total_treasures_found ?? 0),
    currentSubscription: sub
      ? {
          id: sub.id,
          status: sub.status ?? '',
          subscribedOn: sub.subscribed_on ?? '',
          tierId: sub.subscription_tier_id != null ? String(sub.subscription_tier_id) : '',
          tierName: sub.subscription_tier?.name ?? '',
          tierAmount: sub.subscription_tier?.amount ?? '',
          tierType: sub.subscription_tier?.type ?? '',
        }
      : null,
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
    return { email: mock.user.email, token: mock.token, roles: mock.user.roles }
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
    roles: result.user?.roles ?? [],
  }
}

// Customer-only — the admin panel has its own separate identity concerns
// (managing OTHER users via AdminUsersContext), not this endpoint. Never
// throws: a failed fetch just means the session keeps running on the
// minimal {email, roles} login gave it until a later fetch succeeds.
async function fetchProfile() {
  if (!isApiConfigured()) return LOCAL_PROFILE
  try {
    const result = await fetchCurrentUserRequest()
    return normalizeProfile(extractProfile(result))
  } catch {
    return {}
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession(SESSION_KEY))
  const [admin, setAdmin] = useState(() => readSession(ADMIN_SESSION_KEY))

  const login = useCallback(async (email, password) => {
    const session = await authenticate(email, password, 'user')
    const profile = await fetchProfile()
    const fullSession = { ...session, ...profile }
    localStorage.setItem(SESSION_KEY, JSON.stringify(fullSession))
    setUser(fullSession)
  }, [])

  // Backfills the profile fields for a session that was persisted before
  // this fetch existed (or whose earlier fetch failed) — runs once on
  // mount; `user.name` already being set means there's nothing to do.
  useEffect(() => {
    if (!user || user.name) return
    fetchProfile().then((profile) => {
      if (Object.keys(profile).length === 0) return
      setUser((prev) => {
        if (!prev) return prev
        const next = { ...prev, ...profile }
        localStorage.setItem(SESSION_KEY, JSON.stringify(next))
        return next
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Automatic push registration — fires whenever a customer id becomes
  // available, whether from a fresh login or an already-persisted session
  // on page load, not just the login() call itself. Best-effort: a
  // declined/unsupported/unconfigured permission shouldn't block or
  // interrupt using the app, so failures are swallowed here.
  useEffect(() => {
    if (!user?.id) return
    enablePushNotifications(user.id).catch(() => {})
  }, [user?.id])

  // Best-effort: the token is cleared locally either way, so a failed
  // server-side invalidation shouldn't block the user from logging out or
  // surface an error for something that isn't really theirs to retry. The
  // request has to fire before the token is cleared, since that's what the
  // interceptor attaches as the Authorization header.
  const logout = useCallback(async () => {
    if (isApiConfigured()) {
      try {
        await logoutRequest()
      } catch {
        // ignored — see comment above
      }
    }
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  // Same rule as the other write actions in this codebase: once the API is
  // configured, a reachable backend's rejection is surfaced (not swallowed),
  // and only a genuinely unreachable backend falls back to a local-only
  // update. Only the 4 fields this form actually submits are merged back in
  // — reusing normalizeProfile here would be wrong, since a response that
  // doesn't happen to echo back status/createdAt/etc. would normalize those
  // to defaults and blank out real values the patch never touched.
  const updateProfile = useCallback(async (patch) => {
    function applyLocally(fields) {
      setUser((prev) => {
        if (!prev) return prev
        const next = { ...prev, ...fields }
        localStorage.setItem(SESSION_KEY, JSON.stringify(next))
        return next
      })
    }

    if (!isApiConfigured()) {
      applyLocally(patch)
      return
    }

    let result
    try {
      result = await updateProfileRequest(patch)
    } catch (err) {
      const reachedBackend = err instanceof ApiError && err.status > 0
      if (reachedBackend) throw err
      throw new Error('Unable to reach the server. Please check your connection and try again.', {
        cause: err,
      })
    }

    const data = extractProfile(result)
    applyLocally({
      name: data.name ?? patch.name,
      email: data.email ?? patch.email,
      username: data.username ?? patch.username,
      country: data.country ?? patch.country,
    })
  }, [])

  const adminLogin = useCallback(async (email, password) => {
    const session = await authenticate(email, password, 'admin')
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
    setAdmin(session)
  }, [])

  const adminLogout = useCallback(async () => {
    if (isApiConfigured()) {
      try {
        await logoutRequest()
      } catch {
        // ignored — see the comment on logout() above
      }
    }
    localStorage.removeItem(ADMIN_SESSION_KEY)
    setAdmin(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, login, logout, updateProfile, admin, adminLogin, adminLogout }}
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
