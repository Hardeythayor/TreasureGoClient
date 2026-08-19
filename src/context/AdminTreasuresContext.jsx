import { createContext, useCallback, useContext, useState } from 'react'
import { ApiError, isApiConfigured } from '@/lib/api'
import {
  createTreasureRequest,
  deleteTreasureRequest,
  fetchTreasuresRequest,
  toggleTreasureStatusRequest,
  updateTreasureRequest,
} from '@/services/treasuresService'
import { DEFAULT_CENTER } from '@/components/admin/TreasureLocationPicker'

const TREASURES_KEY = 'treasure-go:admin-treasures'

// Placeholder records for offline/demo mode — structured the same way a
// real treasure will be, so the page works the same whether the API is
// configured or not.
const DEFAULT_TREASURES = [
  {
    id: 'treasure-emerald-vault',
    name: 'Emerald Vault',
    tierLabel: '$75',
    subscriptionTierId: '',
    region: 'Victoria Island',
    location: { lat: 6.4281, lng: 3.4219 },
    status: 'Hidden',
    createdAt: 'Jun 02, 2026',
  },
  {
    id: 'treasure-sunken-lagoon-chest',
    name: 'Sunken Lagoon Chest',
    tierLabel: '$100',
    subscriptionTierId: '',
    region: 'Lekki Lagoon',
    location: { lat: 6.4402, lng: 3.4715 },
    status: 'Hidden',
    createdAt: 'Jun 09, 2026',
  },
  {
    id: 'treasure-merchants-cache',
    name: 'Merchant’s Cache',
    tierLabel: '$50',
    subscriptionTierId: '',
    region: 'Marina District',
    location: { lat: 6.4531, lng: 3.3958 },
    status: 'Found',
    createdAt: 'May 27, 2026',
  },
]

function readLocalTreasures() {
  try {
    const raw = localStorage.getItem(TREASURES_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_TREASURES
  } catch {
    return DEFAULT_TREASURES
  }
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function formatToday() {
  return formatDate(new Date())
}

// "Hidden" while unfound, "Found" once claimed — the real endpoint's exact
// wording for this isn't confirmed, so common variants are normalized to
// the two labels the UI already renders.
function normalizeStatus(status) {
  if (!status) return null
  const s = String(status).toLowerCase()
  if (s === 'found' || s === 'claimed') return 'Found'
  if (s === 'hidden' || s === 'unfound' || s === 'active') return 'Hidden'
  return status
}

// The real endpoint's exact response field names aren't confirmed — this
// defensively reads a few plausible shapes for the tier reference (a plain
// subscription_tier_id, or a nested subscription_tier/tier relation object)
// and falls back to whatever's in `fallback` (submitted form values, or
// sane defaults) for anything it doesn't recognize.
function normalizeTreasure(data, fallback = {}) {
  const tier = data.subscription_tier ?? data.tier ?? null
  return {
    id: data.id != null ? String(data.id) : (fallback.id ?? `treasure-${Date.now()}`),
    name: data.name ?? fallback.name ?? '',
    region: data.region ?? fallback.region ?? '',
    subscriptionTierId:
      data.subscription_tier_id != null
        ? String(data.subscription_tier_id)
        : tier?.id != null
          ? String(tier.id)
          : (fallback.subscriptionTierId ?? ''),
    tierLabel: tier?.amount != null ? `$${tier.amount}` : (fallback.tierLabel ?? '—'),
    location: data.location ?? fallback.location ?? DEFAULT_CENTER,
    status: normalizeStatus(data.status) ?? fallback.status ?? 'Hidden',
    createdAt: data.created_at
      ? formatDate(new Date(data.created_at))
      : (fallback.createdAt ?? formatToday()),
  }
}

// Handles a bare array, this backend's likely { treasures: [...] } wrap
// (matching the { subscription_tiers: [...] } convention its sibling
// endpoint actually used), or the more generic { data: [...] } / nested-
// pagination shapes. Returns null (not an empty array) when none match, so
// callers can tell "found nothing" apart from "unrecognized shape".
function extractTreasureList(result) {
  if (Array.isArray(result)) return result
  if (Array.isArray(result?.treasures)) return result.treasures
  if (Array.isArray(result?.data)) return result.data
  if (Array.isArray(result?.data?.data)) return result.data.data
  return null
}

function normalizeTreasureList(result) {
  const list = extractTreasureList(result)
  if (list === null) {
    if (import.meta.env.DEV) {
      console.warn('[treasures] unrecognized list response shape:', result)
    }
    throw new Error('Unexpected response shape from the server.')
  }
  return list.map((item) => normalizeTreasure(item ?? {}))
}

const AdminTreasuresContext = createContext(null)

export function AdminTreasuresProvider({ children }) {
  const [treasures, setTreasures] = useState([])
  const [loading, setLoading] = useState(false)

  const persistLocal = useCallback((next) => {
    localStorage.setItem(TREASURES_KEY, JSON.stringify(next))
    return next
  }, [])

  // Same rule as SubscriptionTiersContext: once the API is configured, a
  // failure is thrown (not swallowed) so the page can show it — silently
  // falling back would show stale/wrong data with no indication anything
  // went wrong. The local list is only used when no API is configured.
  const fetchTreasures = useCallback(async () => {
    setLoading(true)
    try {
      if (!isApiConfigured()) {
        setTreasures(readLocalTreasures())
        return
      }

      let result
      try {
        result = await fetchTreasuresRequest()
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        if (reachedBackend) throw err
        throw new Error('Unable to reach the server. Please check your connection and try again.', {
          cause: err,
        })
      }

      setTreasures(normalizeTreasureList(result))
    } finally {
      setLoading(false)
    }
  }, [])

  const createTreasure = useCallback(
    async (form) => {
      if (!isApiConfigured()) {
        const all = readLocalTreasures()
        const treasure = normalizeTreasure({}, { ...form, createdAt: formatToday() })
        persistLocal([...all, treasure])
        setTreasures([...all, treasure])
        return treasure
      }

      let result
      try {
        result = await createTreasureRequest(form)
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        if (reachedBackend) throw err
        throw new Error('Unable to reach the server. Please check your connection and try again.', {
          cause: err,
        })
      }
      const treasure = normalizeTreasure(result ?? {}, form)
      await fetchTreasures()
      return treasure
    },
    [persistLocal, fetchTreasures],
  )

  const updateTreasure = useCallback(
    async (id, form) => {
      if (!isApiConfigured()) {
        const all = readLocalTreasures().map((t) =>
          t.id === id ? normalizeTreasure({}, { ...t, ...form }) : t,
        )
        persistLocal(all)
        setTreasures(all)
        return
      }

      try {
        await updateTreasureRequest(id, form)
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        if (reachedBackend) throw err
        throw new Error('Unable to reach the server. Please check your connection and try again.', {
          cause: err,
        })
      }
      await fetchTreasures()
    },
    [persistLocal, fetchTreasures],
  )

  const deleteTreasure = useCallback(
    async (id) => {
      if (!isApiConfigured()) {
        const all = readLocalTreasures().filter((t) => t.id !== id)
        persistLocal(all)
        setTreasures(all)
        return
      }

      try {
        await deleteTreasureRequest(id)
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        if (reachedBackend) throw err
        throw new Error('Unable to reach the server. Please check your connection and try again.', {
          cause: err,
        })
      }
      await fetchTreasures()
    },
    [persistLocal, fetchTreasures],
  )

  const toggleStatus = useCallback(
    async (id) => {
      if (!isApiConfigured()) {
        const all = readLocalTreasures().map((t) =>
          t.id === id ? { ...t, status: t.status === 'Hidden' ? 'Found' : 'Hidden' } : t,
        )
        persistLocal(all)
        setTreasures(all)
        return
      }

      try {
        await toggleTreasureStatusRequest(id)
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        if (reachedBackend) throw err
        throw new Error('Unable to reach the server. Please check your connection and try again.', {
          cause: err,
        })
      }
      await fetchTreasures()
    },
    [persistLocal, fetchTreasures],
  )

  return (
    <AdminTreasuresContext.Provider
      value={{
        treasures,
        loading,
        fetchTreasures,
        createTreasure,
        updateTreasure,
        deleteTreasure,
        toggleStatus,
      }}
    >
      {children}
    </AdminTreasuresContext.Provider>
  )
}

export function useAdminTreasures() {
  const ctx = useContext(AdminTreasuresContext)
  if (!ctx) {
    throw new Error('useAdminTreasures must be used within AdminTreasuresProvider')
  }
  return ctx
}
