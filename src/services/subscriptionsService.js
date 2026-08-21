import { apiPost } from '@/lib/api'

export function createSubscriptionRequest(subscriptionTierId) {
  return apiPost('/subscriptions', { subscription_tier_id: Number(subscriptionTierId) })
}

export function verifyTransactionRequest(transactionReference) {
  return apiPost('/subscriptions/transactions/verify', {
    transaction_reference: transactionReference,
  })
}
