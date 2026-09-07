import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { ApiError } from '@/lib/api'
import {
  fetchTreasureHuntsRequest,
  fetchTreasureRewardsAnalyticsRequest,
  sendRewardRequest,
} from '@/services/treasureRewardsService'

const DEFAULT_FILTERS = { search: '', tierId: 'all', status: 'all', dateFrom: '', dateTo: '' }
const DEFAULT_PAGINATION = { currentPage: 1, lastPage: 1, total: 0, perPage: 30 }

// The real record nests the founder under `user` and the treasure (name,
// region, subscription_tier_id) under `treasure` — `reward_status` (not the
// hunt's own `status`, which just says "found") is what this page treats
// as pending/rewarded.
function normalizeHunt(data) {
  const user = data.user ?? {}
  const treasure = data.treasure ?? {}
  return {
    id: data.id != null ? String(data.id) : '',
    userId: data.user_id != null ? String(data.user_id) : user.id != null ? String(user.id) : '',
    treasureId:
      data.treasure_id != null
        ? String(data.treasure_id)
        : treasure.id != null
          ? String(treasure.id)
          : '',
    treasureName: treasure.name ?? '',
    tierId: treasure.subscription_tier_id != null ? String(treasure.subscription_tier_id) : '',
    founderName: user.name ?? '',
    founderEmail: user.email ?? '',
    dateFound: data.found_at ? data.found_at.slice(0, 10) : '',
    status: data.reward_status === 'rewarded' ? 'rewarded' : 'pending',
    rewardLink: data.reward ?? '',
  }
}

// Handles Laravel's standard paginator shape, wrapped in this endpoint's
// actual { treasure_hunts: {...} } key (matching the { subscription_tiers:
// [...] }-style convention this backend's other list endpoints use), or a
// bare paginator/array as a fallback.
function normalizeHuntsPage(result) {
  const page = result?.treasure_hunts ?? result?.data ?? result
  const list = Array.isArray(page) ? page : page?.data

  if (!Array.isArray(list)) {
    if (import.meta.env.DEV) {
      console.warn('[treasure-rewards] unrecognized list response shape:', result)
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

const AdminTreasureRewardsContext = createContext(null)

export function AdminTreasureRewardsProvider({ children }) {
  const [rewards, setRewards] = useState([])
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ totalFound: 0, totalRewarded: 0, totalPending: 0 })
  const filtersRef = useRef(DEFAULT_FILTERS)

  // A failure is thrown (not swallowed) so the page can show it.
  const fetchRewards = useCallback(async (filters = filtersRef.current) => {
    filtersRef.current = filters
    setLoading(true)
    try {
      let result
      try {
        result = await fetchTreasureHuntsRequest(filters)
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

  const fetchStats = useCallback(async () => {
    let result
    try {
      result = await fetchTreasureRewardsAnalyticsRequest()
    } catch (err) {
      const reachedBackend = err instanceof ApiError && err.status > 0
      if (reachedBackend) throw err
      throw new Error('Unable to reach the server. Please check your connection and try again.', {
        cause: err,
      })
    }

    setStats({
      totalFound: Number(result?.total_found ?? 0),
      totalRewarded: Number(result?.total_rewarded ?? 0),
      totalPending: Number(result?.total_pending ?? 0),
    })
  }, [])

  // Refetches the current page/filters on success so the row (and stats,
  // next time they're loaded) reflect real server state rather than an
  // optimistic guess.
  const sendReward = useCallback(
    async (reward, amazonLink) => {
      try {
        await sendRewardRequest({
          userId: reward.userId,
          treasureId: reward.treasureId,
          amazonLink,
        })
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        if (reachedBackend) throw err
        throw new Error('Unable to reach the server. Please check your connection and try again.', {
          cause: err,
        })
      }
      await fetchRewards(filtersRef.current)
    },
    [fetchRewards],
  )

  return (
    <AdminTreasureRewardsContext.Provider
      value={{ rewards, pagination, stats, loading, fetchRewards, fetchStats, sendReward }}
    >
      {children}
    </AdminTreasureRewardsContext.Provider>
  )
}

export function useAdminTreasureRewards() {
  const ctx = useContext(AdminTreasureRewardsContext)
  if (!ctx) {
    throw new Error('useAdminTreasureRewards must be used within AdminTreasureRewardsProvider')
  }
  return ctx
}
