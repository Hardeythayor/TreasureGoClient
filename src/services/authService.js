import { apiGet, apiPost, apiPut } from '@/lib/api'

export function loginRequest(email, password) {
  return apiPost('/login', { email, password }, { skipAuth: true })
}

export function fetchCurrentUserRequest() {
  return apiGet('/user')
}

export function updateProfileRequest({ name, email, username, country }) {
  return apiPut('/profile', { name, email, username, country })
}

export function logoutRequest() {
  return apiPost('/logout')
}
