import { apiDelete, apiGet, apiPatch } from '@/lib/api'

export function fetchNotificationsRequest({ page } = {}) {
  const params = {}
  if (page) params.page = page
  return apiGet('/notifications', { params })
}

export function markNotificationReadRequest(id) {
  return apiPatch(`/notifications/${id}/read`)
}

export function deleteNotificationRequest(id) {
  return apiDelete(`/notifications/${id}`)
}

export function markAllNotificationsReadRequest() {
  return apiPatch('/notifications/read-all')
}

export function deleteAllNotificationsRequest() {
  return apiDelete('/notifications')
}
