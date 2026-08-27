import { apiGet, apiPost, apiPut } from '@/lib/api'

export function loginRequest(email, password) {
  return apiPost('/login', { email, password }, { skipAuth: true })
}

export function registerRequest({ name, username, email, country, password, passwordConfirmation }) {
  return apiPost(
    '/register',
    {
      name,
      username,
      email,
      country,
      password,
      password_confirmation: passwordConfirmation,
    },
    { skipAuth: true },
  )
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

export function changePasswordRequest({ currentPassword, newPassword, passwordConfirmation }) {
  return apiPut('/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
    password_confirmation: passwordConfirmation,
  })
}

export function verifyEmailRequest(code) {
  return apiPost('/email/verify', { code })
}

export function resendEmailVerificationRequest() {
  return apiPost('/email/resend')
}

export function forgotPasswordRequest(email) {
  return apiPost('/forgot-password', { email }, { skipAuth: true })
}

export function verifyResetCodeRequest(email, code) {
  return apiPost('/verify-reset-code', { email, code }, { skipAuth: true })
}

export function resetPasswordRequest({ email, password, passwordConfirmation, resetToken }) {
  return apiPost(
    '/reset-password',
    {
      email,
      password,
      password_confirmation: passwordConfirmation,
      reset_token: resetToken,
    },
    { skipAuth: true },
  )
}
