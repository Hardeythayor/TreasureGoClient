import { apiGet } from '@/lib/api'

export function fetchMyTreasureHuntsRequest({ page } = {}) {
  const params = { status: 'found' }
  if (page) params.page = page
  return apiGet('/treasure-hunts', { params })
}
