import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api'

// Free tiers have no price or validity window, so amount/validity are left
// out of the payload entirely for them — only premium tiers send those.
function tierPayload({ name, amount, validityDays, rewardAmount, type, status }) {
  const payload = { name, reward_amount: Number(rewardAmount), type, status }
  if (type === 'premium') {
    payload.amount = Number(amount)
    payload.validity = Number(validityDays)
  }
  return payload
}

export function createTierRequest(form) {
  return apiPost('/admin/subscription-tiers', tierPayload(form))
}

export function updateTierRequest(id, form) {
  return apiPut(`/admin/subscription-tiers/${id}`, tierPayload(form))
}

export function toggleTierStatusRequest(id) {
  return apiPatch(`/admin/subscription-tiers/${id}/toggle-status`)
}

export function deleteTierRequest(id) {
  return apiDelete(`/admin/subscription-tiers/${id}`)
}

export function fetchTiersRequest({ search, type, status } = {}) {
  const params = {}
  if (search) params.search = search
  if (type && type !== 'all') params.type = type
  if (status && status !== 'all') params.status = status

  return apiGet('/admin/subscription-tiers', { params })
}
