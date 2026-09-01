import { createContext, useCallback, useContext, useState } from 'react'
import { ApiError, isApiConfigured } from '@/lib/api'
import { fetchSubscriptionAnalyticsRequest } from '@/services/subscriptionAnalyticsService'

// Local-only mock data, used only when no API base URL is configured at all
// (pure offline/demo mode).
const LOCAL_ANALYTICS = {
  totalRevenue: 14485,
  totalSubscribers: 312,
  byTier: [
    { tierId: 'tier-starter-pass', tierName: 'Starter Pass', subscribers: 96, revenue: 960 },
    { tierId: 'tier-explorer-pass', tierName: 'Explorer Pass', subscribers: 74, revenue: 1850 },
    { tierId: 'tier-adventurer-pass', tierName: 'Adventurer Pass', subscribers: 58, revenue: 2900 },
    { tierId: 'tier-voyager-pass', tierName: 'Voyager Pass', subscribers: 41, revenue: 3075 },
    { tierId: 'tier-elite-pass', tierName: 'Elite Pass', subscribers: 29, revenue: 2900 },
    { tierId: 'tier-legendary-pass', tierName: 'Legendary Pass', subscribers: 14, revenue: 2800 },
  ],
}

function normalizeAnalytics(result) {
  const byTier = Array.isArray(result?.by_tier) ? result.by_tier : []
  return {
    totalRevenue: Number(result?.total_revenue ?? 0),
    totalSubscribers: Number(result?.total_subscribers ?? 0),
    byTier: byTier.map((t) => ({
      tierId: t.tier_id != null ? String(t.tier_id) : '',
      tierName: t.tier_name ?? '',
      subscribers: Number(t.subscribers ?? 0),
      revenue: Number(t.revenue ?? 0),
    })),
  }
}

const AdminSubscriptionAnalyticsContext = createContext(null)

export function AdminSubscriptionAnalyticsProvider({ children }) {
  const [analytics, setAnalytics] = useState(LOCAL_ANALYTICS)
  const [loading, setLoading] = useState(false)

  // Same rule as the other admin modules: once the API is configured, a
  // failure is thrown (not swallowed) so the page can show it. The local
  // mock is only used when no API is configured at all.
  const fetchSubscriptionAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      if (!isApiConfigured()) {
        setAnalytics(LOCAL_ANALYTICS)
        return
      }

      let result
      try {
        result = await fetchSubscriptionAnalyticsRequest()
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        if (reachedBackend) throw err
        throw new Error('Unable to reach the server. Please check your connection and try again.', {
          cause: err,
        })
      }

      setAnalytics(normalizeAnalytics(result))
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <AdminSubscriptionAnalyticsContext.Provider
      value={{ analytics, loading, fetchSubscriptionAnalytics }}
    >
      {children}
    </AdminSubscriptionAnalyticsContext.Provider>
  )
}

export function useAdminSubscriptionAnalytics() {
  const ctx = useContext(AdminSubscriptionAnalyticsContext)
  if (!ctx) {
    throw new Error(
      'useAdminSubscriptionAnalytics must be used within AdminSubscriptionAnalyticsProvider',
    )
  }
  return ctx
}
