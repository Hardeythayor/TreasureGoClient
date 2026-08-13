import { apiPost } from '@/lib/api'

export function loginRequest(email, password) {
  return apiPost('/login', { email, password }, { skipAuth: true })
}
