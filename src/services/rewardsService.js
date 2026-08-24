import { apiGet } from '@/lib/api'

export function fetchMyTreasureHuntsRequest({ page } = {}) {
  const params = {}
  if (page) params.page = page
  return apiGet('/treasure-hunts', { params })
}
