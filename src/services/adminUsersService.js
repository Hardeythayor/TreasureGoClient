import { apiDelete, apiGet, apiPatch, apiPut } from '@/lib/api'

export function fetchAdminUsersRequest({ search, status, page } = {}) {
  const params = {}
  if (search) params.search = search
  if (status && status !== 'all') params.status = status
  if (page) params.page = page

  return apiGet('/admin/users', { params })
}

export function fetchAdminUserRequest(id) {
  return apiGet(`/admin/users/${id}`)
}

export function updateAdminUserRequest(id, { name, username, email, country }) {
  return apiPut(`/admin/users/${id}`, { name, username, email, country })
}

export function deleteAdminUserRequest(id) {
  return apiDelete(`/admin/users/${id}`)
}

export function toggleAdminUserStatusRequest(id) {
  return apiPatch(`/admin/users/${id}/toggle-status`)
}
