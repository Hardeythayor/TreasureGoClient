import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { ApiError } from '@/lib/api'
import {
  createTierRequest,
  deleteTierRequest,
  fetchTiersRequest,
  toggleTierStatusRequest,
  updateTierRequest,
} from '@/services/subscriptionTiersService'

const DEFAULT_FILTERS = { search: '', type: 'all', status: 'all' }

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
    rewardAmount: Number(data.reward_amount ?? data.rewardAmount ?? fallback.rewardAmount ?? 0),
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

  // Failures are thrown (not swallowed) so the page can show them.
  const fetchTiers = useCallback(async (filters = filtersRef.current) => {
    filtersRef.current = filters
    setLoading(true)
    try {
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

  const createTier = useCallback(
    async (form) => {
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
    [fetchTiers],
  )

  const updateTier = useCallback(
    async (id, patch) => {
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
    [fetchTiers],
  )

  const deleteTier = useCallback(
    async (id) => {
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
    [fetchTiers],
  )

  const toggleStatus = useCallback(
    async (id) => {
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
    [fetchTiers],
  )

  // For dropdowns elsewhere (e.g. the treasure-creation form) that need the
  // list of active tiers without disturbing this page's own filtered
  // `tiers` view/state.
  const fetchActiveTierOptions = useCallback(async () => {
    const filters = { search: '', type: 'all', status: 'active' }
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
