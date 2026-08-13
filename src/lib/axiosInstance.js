import axios from 'axios'

const SESSION_KEY = 'treasure-go:session'
const ADMIN_SESSION_KEY = 'treasure-go:admin-session'

// TODO: confirm the real refresh endpoint path + request/response shape with
// the backend — assumed as POST { refreshToken } -> { token, refreshToken }
// until we're told otherwise. The current /login response has no
// refreshToken, so this path is unreachable in practice for now.
const REFRESH_TOKEN_PATH = '/auth/refresh'

function readSession(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSession(key, session) {
  localStorage.setItem(key, JSON.stringify(session))
}

function clearSession(key) {
  localStorage.removeItem(key)
}

// The app keeps separate user/admin sessions (a browser can be logged into
// both at once), so the token to attach depends on which side of the app
// the request is coming from — inferred from the current route, same as
// RequireAuth/RequireAdminAuth already do.
function resolveSessionKey() {
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  return isAdminRoute ? ADMIN_SESSION_KEY : SESSION_KEY
}

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: { Accept: 'application/json' },
})

axiosInstance.interceptors.request.use((config) => {
  if (!config.skipAuth) {
    const sessionKey = resolveSessionKey()
    config._sessionKey = sessionKey
    const token = readSession(sessionKey)?.token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Every 401 that arrives while a refresh is already in flight gets queued
// here instead of failing immediately — they're all resolved (and retried
// with the new token) once that single refresh call comes back.
let isRefreshing = false
let pendingQueue = []

function resolvePendingQueue(token) {
  pendingQueue.forEach(({ resolve }) => resolve(token))
  pendingQueue = []
}

function rejectPendingQueue(error) {
  pendingQueue.forEach(({ reject }) => reject(error))
  pendingQueue = []
}

async function refreshAccessToken(sessionKey) {
  const session = readSession(sessionKey)
  if (!session?.refreshToken) {
    throw new Error('No refresh token available')
  }

  // Plain axios, not axiosInstance — this must skip the interceptors above
  // so a failed refresh can't recursively trigger another refresh.
  const { data } = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL ?? ''}${REFRESH_TOKEN_PATH}`,
    { refreshToken: session.refreshToken },
  )

  const nextSession = {
    ...session,
    token: data.token,
    refreshToken: data.refreshToken ?? session.refreshToken,
  }
  writeSession(sessionKey, nextSession)
  return data.token
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error

    const isAuthError = response?.status === 401
    const isRefreshCall = config?.url?.includes(REFRESH_TOKEN_PATH)
    // Requests made with skipAuth (login, signup, ...) never carried a token
    // to begin with, so a 401 from them is a direct rejection (e.g. wrong
    // credentials) — not an expired-session signal, and there's nothing to
    // refresh. Let it reject as-is instead of routing it through the refresh
    // flow, which would otherwise mask the real error.
    if (!isAuthError || isRefreshCall || config?.skipAuth || !config || config._retried) {
      return Promise.reject(error)
    }

    const sessionKey = config._sessionKey ?? resolveSessionKey()

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      }).then((token) => {
        config._retried = true
        config.headers.Authorization = `Bearer ${token}`
        return axiosInstance(config)
      })
    }

    config._retried = true
    isRefreshing = true

    try {
      const token = await refreshAccessToken(sessionKey)
      resolvePendingQueue(token)
      config.headers.Authorization = `Bearer ${token}`
      return axiosInstance(config)
    } catch (refreshError) {
      rejectPendingQueue(refreshError)
      clearSession(sessionKey)
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default axiosInstance
