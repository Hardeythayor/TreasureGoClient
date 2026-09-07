import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { ApiError } from '@/lib/api'
import { fetchMyTreasureHuntsRequest } from '@/services/rewardsService'

const DEFAULT_PAGINATION = { currentPage: 1, lastPage: 1, total: 0, perPage: 30 }

// The nested `treasure.subscription_tier` this endpoint returns already
// carries the tier's name/reward_amount directly, unlike the admin
// equivalent — no separate tiers lookup needed to label each row.
function normalizeHunt(data) {
  const treasure = data.treasure ?? {}
  const tier = treasure.subscription_tier ?? {}
  return {
    id: data.id != null ? String(data.id) : '',
    treasureId:
      treasure.id != null
        ? String(treasure.id)
        : data.treasure_id != null
          ? String(data.treasure_id)
          : '',
    treasureName: treasure.name ?? '',
    region: treasure.region ?? '',
    status: data.status === 'found' ? 'found' : 'hidden',
    foundAt: data.found_at ?? '',
    rewardStatus: data.reward_status === 'rewarded' ? 'rewarded' : 'pending',
    rewardLink: data.reward ?? '',
    tierName: tier.name ?? '',
    rewardAmount: tier.reward_amount ?? '',
  }
}

// Handles Laravel's standard paginator shape, wrapped in this endpoint's
// actual { treasure_hunts: {...} } key, or a bare paginator/array fallback.
function normalizeHuntsPage(result) {
  const page = result?.treasure_hunts ?? result?.data ?? result
  const list = Array.isArray(page) ? page : page?.data

  if (!Array.isArray(list)) {
    if (import.meta.env.DEV) {
      console.warn('[rewards] unrecognized list response shape:', result)
    }
    throw new Error('Unexpected response shape from the server.')
  }

  return {
    items: list.map((item) => normalizeHunt(item ?? {})),
    pagination: {
      currentPage: page?.current_page ?? 1,
      lastPage: page?.last_page ?? 1,
      total: page?.total ?? list.length,
      perPage: page?.per_page ?? list.length,
    },
  }
}

const RewardsContext = createContext(null)

export function RewardsProvider({ children }) {
  const [rewards, setRewards] = useState([])
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION)
  const [loading, setLoading] = useState(false)
  const filtersRef = useRef({ page: 1 })

  // A failure is thrown (not swallowed) so the page can show it.
  const fetchRewards = useCallback(async (filters = filtersRef.current) => {
    filtersRef.current = filters
    setLoading(true)
    try {
      let result
      try {
        result = await fetchMyTreasureHuntsRequest(filters)
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        if (reachedBackend) throw err
        throw new Error('Unable to reach the server. Please check your connection and try again.', {
          cause: err,
        })
      }

      const { items, pagination: nextPagination } = normalizeHuntsPage(result)
      setRewards(items)
      setPagination(nextPagination)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <RewardsContext.Provider value={{ rewards, pagination, loading, fetchRewards }}>
      {children}
    </RewardsContext.Provider>
  )
}

export function useRewards() {
  const ctx = useContext(RewardsContext)
  if (!ctx) throw new Error('useRewards must be used within RewardsProvider')
  return ctx
}
