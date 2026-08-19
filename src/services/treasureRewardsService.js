import { apiGet, apiPost } from '@/lib/api'

export function fetchTreasureRewardsAnalyticsRequest() {
  return apiGet('/admin/treasure-hunts/analytics')
}

export function fetchTreasureHuntsRequest({
  search,
  tierId,
  status,
  dateFrom,
  dateTo,
  page,
} = {}) {
  const params = {}
  if (search) params.search = search
  if (tierId && tierId !== 'all') params.subscription_tier_id = tierId
  if (status && status !== 'all') params.status = status
  if (dateFrom) params.from_date = dateFrom
  if (dateTo) params.to_date = dateTo
  if (page) params.page = page

  return apiGet('/admin/treasure-hunts', { params })
}

export function sendRewardRequest({ userId, treasureId, amazonLink }) {
  return apiPost('/admin/rewards', {
    user_id: userId,
    treasure_id: treasureId,
    amazon_link: amazonLink,
  })
}
