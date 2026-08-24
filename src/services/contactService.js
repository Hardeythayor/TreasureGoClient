import { apiPost } from '@/lib/api'

export function sendContactMessageRequest({ subject, message }) {
  return apiPost('/contact-us', { subject, message })
}
