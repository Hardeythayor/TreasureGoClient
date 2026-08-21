import { apiGet } from '@/lib/api'

export function fetchPublicSubscriptionTiersRequest() {
  return apiGet('/subscription-tiers')
}
