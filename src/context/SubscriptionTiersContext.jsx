import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { ApiError, isApiConfigured } from '@/lib/api'
import {
  createTierRequest,
  deleteTierRequest,
  fetchTiersRequest,
  toggleTierStatusRequest,
  updateTierRequest,
} from '@/services/subscriptionTiersService'

const TIERS_KEY = 'treasure-go:admin-subscription-tiers'

const DEFAULT_TIERS = [
  { id: 'tier-starter-pass', name: 'Starter Pass', amount: 10, validityDays: 30, type: 'free', status: 'active', createdAt: 'Jan 01, 2026' },
  { id: 'tier-explorer-pass', name: 'Explorer Pass', amount: 25, validityDays: 30, type: 'free', status: 'active', createdAt: 'Jan 01, 2026' },
  { id: 'tier-adventurer-pass', name: 'Adventurer Pass', amount: 50, validityDays: 30, type: 'free', status: 'active', createdAt: 'Jan 01, 2026' },
  { id: 'tier-voyager-pass', name: 'Voyager Pass', amount: 75, validityDays: 30, type: 'premium', status: 'active', createdAt: 'Jan 01, 2026' },
  { id: 'tier-elite-pass', name: 'Elite Pass', amount: 100, validityDays: 30, type: 'premium', status: 'active', createdAt: 'Jan 01, 2026' },
  { id: 'tier-legendary-pass', name: 'Legendary Pass', amount: 200, validityDays: 30, type: 'premium', status: 'active', createdAt: 'Jan 01, 2026' },
]

const DEFAULT_FILTERS = { search: '', type: 'all', status: 'all' }

function readLocalTiers() {
  try {
    const raw = localStorage.getItem(TIERS_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_TIERS
  } catch {
    return DEFAULT_TIERS
  }
}

function filterLocally(all, { search = '', type = 'all', status = 'all' } = {}) {
  return all.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    if (type !== 'all' && t.type !== type) return false
    if (status !== 'all' && t.status !== status) return false
    return true
  })
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function formatToday() {
  return formatDate(new Date())
}

// The real endpoint's exact response field names aren't confirmed — this
// defensively reads either a bare resource or common Laravel wrappers, and
// falls back to whatever's in `fallback` (submitted form values, or sane
// defaults) for anything it doesn't recognize.
function normalizeTier(data, fallback = {}) {
  return {
    id: data.id != null ? String(data.id) : (fallback.id ?? `tier-${slugify(data.name ?? fallback.name ?? '')}-${Date.now()}`),
    name: data.name ?? fallback.name ?? '',
    amount: Number(data.amount ?? fallback.amount ?? 0),
    validityDays: Number(data.validity ?? data.validityDays ?? fallback.validityDays ?? 0),
    type: data.type ?? fallback.type ?? 'free',
    status: data.status ?? fallback.status ?? 'active',
    createdAt: data.created_at
      ? formatDate(new Date(data.created_at))
      : (fallback.createdAt ?? formatToday()),
  }
}

function normalizeTierResponse(result, form) {
  const data = result?.subscription_tier ?? result?.data ?? result ?? {}
  return normalizeTier(data, form)
}

// Handles a bare array, this endpoint's actual { subscription_tiers: [...] }
// wrap, or the more generic { data: [...] } / nested-pagination shapes some
// other endpoints on this backend might use. Returns null (rather than an
// empty array) when none of those match, so callers can tell "found nothing"
// apart from "couldn't find a list at all" — the latter almost always means
// this normalizer's shape assumptions don't match the real response yet.
function extractTierList(result) {
  if (Array.isArray(result)) return result
  if (Array.isArray(result?.subscription_tiers)) return result.subscription_tiers
  if (Array.isArray(result?.data)) return result.data
  if (Array.isArray(result?.data?.data)) return result.data.data
  return null
}

function normalizeTierList(result) {
  const list = extractTierList(result)
  if (list === null) {
    if (import.meta.env.DEV) {
      console.warn('[subscription-tiers] unrecognized list response shape:', result)
    }
    throw new Error('Unexpected response shape from the server.')
  }
  return list.map((item) => normalizeTier(item ?? {}))
}

const SubscriptionTiersContext = createContext(null)

export function SubscriptionTiersProvider({ children }) {
  const [tiers, setTiers] = useState([])
  const [loading, setLoading] = useState(false)
  const filtersRef = useRef(DEFAULT_FILTERS)

  const persistLocal = useCallback((next) => {
    localStorage.setItem(TIERS_KEY, JSON.stringify(next))
    return next
  }, [])

  // Search/type/status filtering happens server-side via query params once
  // the API is configured; in local/offline mode the same filters are
  // applied to the full stored list instead. Failures once the API is
  // configured are thrown (not swallowed) so the page can show them —
  // silently falling back here would show stale/wrong data with no
  // indication anything went wrong.
  const fetchTiers = useCallback(async (filters = filtersRef.current) => {
    filtersRef.current = filters
    setLoading(true)
    try {
      if (!isApiConfigured()) {
        setTiers(filterLocally(readLocalTiers(), filters))
        return
      }

      let result
      try {
        result = await fetchTiersRequest(filters)
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        if (reachedBackend) throw err
        throw new Error('Unable to reach the server. Please check your connection and try again.', {
          cause: err,
        })
      }

      // Deliberately outside the try/catch above — a response-shape parsing
      // error is a different problem than a network/API failure and should
      // say so, not get mislabeled as "unreachable".
      setTiers(normalizeTierList(result))
    } finally {
      setLoading(false)
    }
  }, [])

  // The local-only tier is a pure offline/demo fallback for when no API base
  // URL is configured at all. Once a real API is configured, any failure —
  // unreachable or an authoritative rejection — is thrown with a message
  // describing what happened, instead of silently creating the tier locally
  // and showing a fake "created" success for something the real API never
  // actually accepted.
  const createTier = useCallback(
    async (form) => {
      if (!isApiConfigured()) {
        const all = readLocalTiers()
        const tier = {
          id: `tier-${slugify(form.name)}-${Date.now()}`,
          name: form.name,
          amount: Number(form.amount),
          validityDays: Number(form.validityDays),
          type: form.type,
          status: form.status,
          createdAt: formatToday(),
        }
        persistLocal([...all, tier])
        setTiers(filterLocally([...all, tier], filtersRef.current))
        return tier
      }

      let result
      try {
        result = await createTierRequest(form)
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        if (reachedBackend) throw err
        throw new Error('Unable to reach the server. Please check your connection and try again.', {
          cause: err,
        })
      }
      const tier = normalizeTierResponse(result, form)
      await fetchTiers(filtersRef.current)
      return tier
    },
    [persistLocal, fetchTiers],
  )

  // Same rule as createTier: once the API is configured, a reachable
  // backend's rejection is surfaced (not swallowed), and only a genuinely
  // unreachable backend falls back to the local-only update.
  const updateTier = useCallback(
    async (id, patch) => {
      if (!isApiConfigured()) {
        const all = readLocalTiers().map((t) =>
          t.id === id
            ? {
                ...t,
                ...patch,
                amount: patch.amount != null ? Number(patch.amount) : t.amount,
                validityDays:
                  patch.validityDays != null ? Number(patch.validityDays) : t.validityDays,
              }
            : t,
        )
        persistLocal(all)
        setTiers(filterLocally(all, filtersRef.current))
        return
      }

      try {
        await updateTierRequest(id, patch)
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        if (reachedBackend) throw err
        throw new Error('Unable to reach the server. Please check your connection and try again.', {
          cause: err,
        })
      }
      await fetchTiers(filtersRef.current)
    },
    [persistLocal, fetchTiers],
  )

  // Same rule as createTier/updateTier/toggleStatus: once the API is
  // configured, a reachable backend's rejection is surfaced, and only a
  // genuinely unreachable backend falls back to the local-only delete.
  const deleteTier = useCallback(
    async (id) => {
      if (!isApiConfigured()) {
        const all = readLocalTiers().filter((t) => t.id !== id)
        persistLocal(all)
        setTiers(filterLocally(all, filtersRef.current))
        return
      }

      try {
        await deleteTierRequest(id)
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        if (reachedBackend) throw err
        throw new Error('Unable to reach the server. Please check your connection and try again.', {
          cause: err,
        })
      }
      await fetchTiers(filtersRef.current)
    },
    [persistLocal, fetchTiers],
  )

  // Same rule as createTier/updateTier: once the API is configured, a
  // reachable backend's rejection is surfaced, and only a genuinely
  // unreachable backend falls back to the local-only toggle.
  const toggleStatus = useCallback(
    async (id) => {
      if (!isApiConfigured()) {
        const all = readLocalTiers().map((t) =>
          t.id === id ? { ...t, status: t.status === 'active' ? 'inactive' : 'active' } : t,
        )
        persistLocal(all)
        setTiers(filterLocally(all, filtersRef.current))
        return
      }

      try {
        await toggleTierStatusRequest(id)
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        if (reachedBackend) throw err
        throw new Error('Unable to reach the server. Please check your connection and try again.', {
          cause: err,
        })
      }
      await fetchTiers(filtersRef.current)
    },
    [persistLocal, fetchTiers],
  )

  // For dropdowns elsewhere (e.g. the treasure-creation form) that need the
  // list of active tiers without disturbing this page's own filtered
  // `tiers` view/state.
  const fetchActiveTierOptions = useCallback(async () => {
    const filters = { search: '', type: 'all', status: 'active' }
    if (!isApiConfigured()) {
      return filterLocally(readLocalTiers(), filters)
    }

    try {
      const result = await fetchTiersRequest(filters)
      return normalizeTierList(result)
    } catch (err) {
      const reachedBackend = err instanceof ApiError && err.status > 0
      if (reachedBackend) throw err
      throw new Error('Unable to reach the server. Please check your connection and try again.', {
        cause: err,
      })
    }
  }, [])

  return (
    <SubscriptionTiersContext.Provider
      value={{
        tiers,
        loading,
        fetchTiers,
        fetchActiveTierOptions,
        createTier,
        updateTier,
        deleteTier,
        toggleStatus,
      }}
    >
      {children}
    </SubscriptionTiersContext.Provider>
  )
}

export function useSubscriptionTiers() {
  const ctx = useContext(SubscriptionTiersContext)
  if (!ctx) {
    throw new Error('useSubscriptionTiers must be used within SubscriptionTiersProvider')
  }
  return ctx
}
