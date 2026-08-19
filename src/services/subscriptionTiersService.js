import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api'

export function createTierRequest({ name, amount, validityDays, rewardAmount, type, status }) {
  return apiPost('/admin/subscription-tiers', {
    name,
    amount: Number(amount),
    validity: Number(validityDays),
    reward_amount: Number(rewardAmount),
    type,
    status,
  })
}

export function updateTierRequest(id, { name, amount, validityDays, rewardAmount, type, status }) {
  return apiPut(`/admin/subscription-tiers/${id}`, {
    name,
    amount: Number(amount),
    validity: Number(validityDays),
    reward_amount: Number(rewardAmount),
    type,
    status,
  })
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
