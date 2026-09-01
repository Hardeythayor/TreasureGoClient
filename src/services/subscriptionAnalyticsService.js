import { apiGet } from '@/lib/api'

export function fetchSubscriptionAnalyticsRequest() {
  return apiGet('/admin/subscriptions/analytics')
}
