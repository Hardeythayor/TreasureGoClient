import { apiGet, apiPost } from '@/lib/api'

export function sendNotificationRequest({ type, messageType, title, message, subscriptionTierId, userId }) {
  const body = { type, message_type: messageType, title, message }
  if (type === 'tier') body.subscription_tier_id = subscriptionTierId
  if (type === 'user') body.user_id = userId
  return apiPost('/admin/messages', body)
}

export function fetchSentMessagesRequest({ page } = {}) {
  const params = {}
  if (page) params.page = page
  return apiGet('/admin/messages', { params })
}
