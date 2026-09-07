import { createContext, useCallback, useContext, useState } from 'react'
import { ApiError } from '@/lib/api'
import { fetchSubscriptionAnalyticsRequest } from '@/services/subscriptionAnalyticsService'

const EMPTY_ANALYTICS = { totalRevenue: 0, totalSubscribers: 0, byTier: [] }

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
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS)
  const [loading, setLoading] = useState(false)

  // A failure is thrown (not swallowed) so the page can show it.
  const fetchSubscriptionAnalytics = useCallback(async () => {
    setLoading(true)
    try {
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
