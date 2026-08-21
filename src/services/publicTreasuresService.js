import { apiGet, apiPost } from '@/lib/api'

export function fetchTierTreasuresRequest(subscriptionTierId) {
  return apiGet(`/subscription-tiers/${subscriptionTierId}/treasures`)
}

export function startTreasureHuntRequest(treasureId) {
  return apiPost(`/treasures/${treasureId}/start-hunt`)
}

export function markTreasureFoundRequest(treasureId) {
  return apiPost(`/treasures/${treasureId}/find`)
}
