import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { ApiError, isApiConfigured } from '@/lib/api'
import {
  deleteAdminUserRequest,
  fetchAdminUserRequest,
  fetchAdminUsersRequest,
  toggleAdminUserStatusRequest,
  updateAdminUserRequest,
} from '@/services/adminUsersService'
import { adminUsers as LOCAL_USERS } from '@/data/adminUsers'

const DEFAULT_FILTERS = { search: '', status: 'all' }

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function normalizeStatus(status) {
  const s = String(status ?? '').toLowerCase()
  if (s === 'active') return 'Active'
  if (s === 'inactive') return 'Inactive'
  return status || 'Active'
}

// The real endpoint's exact response field names are confirmed (id, name,
// username, email, country, status, created_at) — no tier/subscription
// field is included, so that column was dropped from the table entirely
// rather than showing a placeholder for data that doesn't exist.
function normalizeUser(data) {
  return {
    id: data.id != null ? String(data.id) : '',
    name: data.name ?? '',
    username: data.username ?? '',
    email: data.email ?? '',
    country: data.country ?? '',
    status: normalizeStatus(data.status),
    joined: data.created_at ? formatDate(new Date(data.created_at)) : '',
  }
}

// Handles a bare array, this endpoint's actual { users: [...] } wrap, or
// the more generic { data: [...] } / nested-pagination shapes other
// endpoints on this backend have used. Returns null (not an empty array)
// when none match, so callers can tell "found nothing" apart from
// "unrecognized shape".
function extractUserList(result) {
  if (Array.isArray(result)) return result
  if (Array.isArray(result?.users)) return result.users
  if (Array.isArray(result?.data)) return result.data
  if (Array.isArray(result?.data?.data)) return result.data.data
  return null
}

function normalizeUserList(result) {
  const list = extractUserList(result)
  if (list === null) {
    if (import.meta.env.DEV) {
      console.warn('[admin-users] unrecognized list response shape:', result)
    }
    throw new Error('Unexpected response shape from the server.')
  }
  return list.map((item) => normalizeUser(item ?? {}))
}

function filterLocally(all, { search = '', status = 'all' } = {}) {
  return all.filter((u) => {
    if (search) {
      const q = search.toLowerCase()
      const matches =
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      if (!matches) return false
    }
    if (status !== 'all' && u.status.toLowerCase() !== status) return false
    return true
  })
}

const AdminUsersContext = createContext(null)

export function AdminUsersProvider({ children }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [userDetail, setUserDetail] = useState(null)
  const [userDetailLoading, setUserDetailLoading] = useState(false)
  const [userDetailError, setUserDetailError] = useState('')
  const filtersRef = useRef(DEFAULT_FILTERS)

  // Same rule as the other admin modules: once the API is configured, a
  // failure is thrown (not swallowed) so the page can show it. The local
  // list is only used when no API is configured at all.
  const fetchUsers = useCallback(async (filters = filtersRef.current) => {
    filtersRef.current = filters
    setLoading(true)
    try {
      if (!isApiConfigured()) {
        setUsers(filterLocally(LOCAL_USERS, filters))
        return
      }

      let result
      try {
        result = await fetchAdminUsersRequest(filters)
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        if (reachedBackend) throw err
        throw new Error('Unable to reach the server. Please check your connection and try again.', {
          cause: err,
        })
      }

      setUsers(normalizeUserList(result))
    } finally {
      setLoading(false)
    }
  }, [])

  // Same rule as fetchUsers, for a single record — plus owning the
  // detail's own loading state here (not in the page), so the page never
  // needs to call setState synchronously inside its effect body itself.
  // The detail response's wrapper key isn't confirmed — this defensively
  // checks a singular `user` wrap (matching the list endpoint's plural
  // `users` convention), a generic `data` wrap, or a bare object.
  const fetchUserById = useCallback(async (id) => {
    setUserDetailLoading(true)
    setUserDetailError('')
    try {
      if (!isApiConfigured()) {
        const local = LOCAL_USERS.find((u) => String(u.id) === String(id))
        if (!local) throw new Error('User not found.')
        const user = normalizeUser(local)
        setUserDetail(user)
        return user
      }

      let result
      try {
        result = await fetchAdminUserRequest(id)
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        if (reachedBackend) throw err
        throw new Error('Unable to reach the server. Please check your connection and try again.', {
          cause: err,
        })
      }

      const data = result?.user ?? result?.data ?? result ?? {}
      const user = normalizeUser(data)
      setUserDetail(user)
      return user
    } catch (err) {
      setUserDetail(null)
      setUserDetailError(err?.message || 'Failed to load user.')
      throw err
    } finally {
      setUserDetailLoading(false)
    }
  }, [])

  // Same rule as the other admin modules: once the API is configured, a
  // reachable backend's rejection is surfaced (not swallowed), and only a
  // genuinely unreachable backend falls back to a local-only update. Either
  // way, both the shared list and the current detail record are updated
  // wherever the edited user happens to be loaded.
  const updateUserBasicInfo = useCallback(async (id, patch) => {
    function applyLocally(fields) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...fields } : u)))
      setUserDetail((prev) => (prev && prev.id === id ? { ...prev, ...fields } : prev))
    }

    if (!isApiConfigured()) {
      applyLocally(patch)
      return
    }

    let result
    try {
      result = await updateAdminUserRequest(id, patch)
    } catch (err) {
      const reachedBackend = err instanceof ApiError && err.status > 0
      if (reachedBackend) throw err
      throw new Error('Unable to reach the server. Please check your connection and try again.', {
        cause: err,
      })
    }

    // Only merge the 4 basic-info fields this form actually submits —
    // reusing normalizeUser here would be wrong, since a response that
    // doesn't happen to echo back status/created_at would normalize those
    // to defaults ('Active', '') and blank out real values that patch
    // never touched in the first place.
    const data = result?.user ?? result?.data ?? result ?? {}
    applyLocally({
      name: data.name ?? patch.name,
      username: data.username ?? patch.username,
      email: data.email ?? patch.email,
      country: data.country ?? patch.country,
    })
  }, [])

  // Same rule as the other admin modules: once the API is configured, a
  // reachable backend's rejection is surfaced, and only a genuinely
  // unreachable backend falls back to a local-only delete. Removes the
  // user from both the shared list and the current detail record.
  const deleteUser = useCallback(async (id) => {
    if (!isApiConfigured()) {
      setUsers((prev) => prev.filter((u) => u.id !== id))
      setUserDetail((prev) => (prev && prev.id === id ? null : prev))
      return
    }

    try {
      await deleteAdminUserRequest(id)
    } catch (err) {
      const reachedBackend = err instanceof ApiError && err.status > 0
      if (reachedBackend) throw err
      throw new Error('Unable to reach the server. Please check your connection and try again.', {
        cause: err,
      })
    }

    setUsers((prev) => prev.filter((u) => u.id !== id))
    setUserDetail((prev) => (prev && prev.id === id ? null : prev))
  }, [])

  // Same rule as the other admin modules: once the API is configured, a
  // reachable backend's rejection is surfaced, and only a genuinely
  // unreachable backend falls back to a local-only toggle. Flips the
  // status in both the shared list and the current detail record.
  const toggleUserStatus = useCallback(async (id) => {
    function flipLocally() {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u,
        ),
      )
      setUserDetail((prev) =>
        prev && prev.id === id
          ? { ...prev, status: prev.status === 'Active' ? 'Inactive' : 'Active' }
          : prev,
      )
    }

    if (!isApiConfigured()) {
      flipLocally()
      return
    }

    try {
      await toggleAdminUserStatusRequest(id)
    } catch (err) {
      const reachedBackend = err instanceof ApiError && err.status > 0
      if (reachedBackend) throw err
      throw new Error('Unable to reach the server. Please check your connection and try again.', {
        cause: err,
      })
    }
    flipLocally()
  }, [])

  return (
    <AdminUsersContext.Provider
      value={{
        users,
        loading,
        fetchUsers,
        userDetail,
        userDetailLoading,
        userDetailError,
        fetchUserById,
        updateUserBasicInfo,
        deleteUser,
        toggleUserStatus,
      }}
    >
      {children}
    </AdminUsersContext.Provider>
  )
}

export function useAdminUsers() {
  const ctx = useContext(AdminUsersContext)
  if (!ctx) {
    throw new Error('useAdminUsers must be used within AdminUsersProvider')
  }
  return ctx
}
