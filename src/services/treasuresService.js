import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api'

export function createTreasureRequest({ name, region, subscriptionTierId, location }) {
  return apiPost('/admin/treasures', {
    name,
    region,
    subscription_tier_id: subscriptionTierId,
    location,
  })
}

export function updateTreasureRequest(id, { name, region, subscriptionTierId, location }) {
  return apiPut(`/admin/treasures/${id}`, {
    name,
    region,
    subscription_tier_id: subscriptionTierId,
    location,
  })
}

export function fetchTreasuresRequest() {
  return apiGet('/admin/treasures')
}

export function deleteTreasureRequest(id) {
  return apiDelete(`/admin/treasures/${id}`)
}

export function toggleTreasureStatusRequest(id) {
  return apiPatch(`/admin/treasures/${id}/toggle-status`)
}
