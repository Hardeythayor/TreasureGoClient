import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { ApiError, isApiConfigured } from '@/lib/api'
import {
  fetchTreasureHuntsRequest,
  fetchTreasureRewardsAnalyticsRequest,
  sendRewardRequest,
} from '@/services/treasureRewardsService'

// Local-only mock data, used only when no API base URL is configured at
// all (pure offline/demo mode) — every real action below is wired to a
// real endpoint now.
const DEFAULT_REWARDS = [
  { id: 'reward-1', userId: '1', treasureId: '11', treasureName: 'Emerald Vault', tierId: 'tier-voyager-pass', founderName: 'Amaka Obi', founderEmail: 'amaka@mail.com', dateFound: '2026-06-14', status: 'rewarded' },
  { id: 'reward-2', userId: '2', treasureId: '12', treasureName: 'Copper Compass', tierId: 'tier-elite-pass', founderName: 'David Chen', founderEmail: 'david@mail.com', dateFound: '2026-07-02', status: 'pending' },
  { id: 'reward-3', userId: '3', treasureId: '13', treasureName: 'Sunken Lagoon Chest', tierId: 'tier-elite-pass', founderName: 'Tolu Bankole', founderEmail: 'tolu@mail.com', dateFound: '2026-05-27', status: 'rewarded' },
  { id: 'reward-4', userId: '4', treasureId: '14', treasureName: 'Merchant’s Cache', tierId: 'tier-adventurer-pass', founderName: 'Sarah Kim', founderEmail: 'sarah@mail.com', dateFound: '2026-07-10', status: 'pending' },
  { id: 'reward-5', userId: '1', treasureId: '15', treasureName: 'Beachcomber’s Box', tierId: 'tier-starter-pass', founderName: 'Amaka Obi', founderEmail: 'amaka@mail.com', dateFound: '2026-08-01', status: 'pending' },
  { id: 'reward-6', userId: '2', treasureId: '16', treasureName: 'Forgotten Cargo Crate', tierId: 'tier-explorer-pass', founderName: 'David Chen', founderEmail: 'david@mail.com', dateFound: '2026-08-05', status: 'rewarded' },
  { id: 'reward-7', userId: '4', treasureId: '17', treasureName: 'Ikoyi Manor Vault', tierId: 'tier-legendary-pass', founderName: 'Sarah Kim', founderEmail: 'sarah@mail.com', dateFound: '2026-06-20', status: 'rewarded' },
  { id: 'reward-8', userId: '3', treasureId: '18', treasureName: 'Old Rail Cache', tierId: 'tier-explorer-pass', founderName: 'Tolu Bankole', founderEmail: 'tolu@mail.com', dateFound: '2026-07-18', status: 'pending' },
  { id: 'reward-9', userId: '1', treasureId: '19', treasureName: 'Deepwater Cache', tierId: 'tier-legendary-pass', founderName: 'Amaka Obi', founderEmail: 'amaka@mail.com', dateFound: '2026-08-12', status: 'pending' },
  { id: 'reward-10', userId: '2', treasureId: '20', treasureName: 'Conservancy Stash', tierId: 'tier-adventurer-pass', founderName: 'David Chen', founderEmail: 'david@mail.com', dateFound: '2026-06-30', status: 'rewarded' },
]

const DEFAULT_FILTERS = { search: '', tierId: 'all', status: 'all', dateFrom: '', dateTo: '' }
const DEFAULT_PAGINATION = { currentPage: 1, lastPage: 1, total: 0, perPage: 30 }

function filterRewardsLocally(all, { search = '', tierId = 'all', status = 'all', dateFrom = '', dateTo = '' } = {}) {
  return all.filter((r) => {
    if (search) {
      const q = search.toLowerCase()
      const matches =
        r.treasureName.toLowerCase().includes(q) ||
        r.founderName.toLowerCase().includes(q) ||
        r.founderEmail.toLowerCase().includes(q)
      if (!matches) return false
    }
    if (tierId !== 'all' && r.tierId !== tierId) return false
    if (status !== 'all' && r.status !== status) return false
    if (dateFrom && r.dateFound < dateFrom) return false
    if (dateTo && r.dateFound > dateTo) return false
    return true
  })
}

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

  // Same rule as the other admin modules: once the API is configured, a
  // failure is thrown (not swallowed) so the page can show it. The local
  // list/count is only used when no API is configured at all.
  const fetchRewards = useCallback(async (filters = filtersRef.current) => {
    filtersRef.current = filters
    setLoading(true)
    try {
      if (!isApiConfigured()) {
        const filtered = filterRewardsLocally(DEFAULT_REWARDS, filters)
        setRewards(filtered)
        setPagination({ currentPage: 1, lastPage: 1, total: filtered.length, perPage: filtered.length || 30 })
        return
      }

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
    if (!isApiConfigured()) {
      const all = DEFAULT_REWARDS
      setStats({
        totalFound: all.length,
        totalRewarded: all.filter((r) => r.status === 'rewarded').length,
        totalPending: all.filter((r) => r.status === 'pending').length,
      })
      return
    }

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

  // Same rule as the other admin modules: once the API is configured, a
  // reachable backend's rejection is surfaced, and only a genuinely
  // unreachable backend falls back to a local-only status flip. Refetches
  // the current page/filters on success so the row (and stats, next time
  // they're loaded) reflect real server state rather than an optimistic
  // guess.
  const sendReward = useCallback(
    async (reward, amazonLink) => {
      if (!isApiConfigured()) {
        setRewards((prev) =>
          prev.map((r) => (r.id === reward.id ? { ...r, status: 'rewarded', rewardLink: amazonLink } : r)),
        )
        return
      }

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
