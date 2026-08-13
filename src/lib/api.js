import axiosInstance from '@/lib/axiosInstance'

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export function isApiConfigured() {
  return Boolean(import.meta.env.VITE_API_BASE_URL)
}

function normalizeError(error) {
  if (error.response) {
    return new ApiError(
      error.response.data?.message ?? error.message,
      error.response.status,
      error.response.data,
    )
  }
  return new ApiError(error.message, 0, null)
}

async function request(config) {
  if (!isApiConfigured()) {
    throw new ApiError('No API base URL configured (VITE_API_BASE_URL is unset)', 0, null)
  }

  try {
    const { data } = await axiosInstance(config)
    return data
  } catch (error) {
    throw normalizeError(error)
  }
}

export const apiGet = (url, config) => request({ ...config, url, method: 'GET' })
export const apiPost = (url, data, config) => request({ ...config, url, method: 'POST', data })
export const apiPut = (url, data, config) => request({ ...config, url, method: 'PUT', data })
export const apiPatch = (url, data, config) => request({ ...config, url, method: 'PATCH', data })
export const apiDelete = (url, config) => request({ ...config, url, method: 'DELETE' })

// Tries the real endpoint first; falls back to local (mock/localStorage)
// behavior if the API base URL isn't configured, the backend is unreachable,
// or that module's endpoint hasn't been implemented yet. This lets each
// context adopt its real endpoint independently, whenever it's handed to us,
// without breaking the rest of the app in the meantime.
export async function withApiFallback(apiCall, fallback) {
  if (!isApiConfigured()) return fallback()

  try {
    return await apiCall()
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[api] falling back to local data:', err)
    }
    return fallback()
  }
}
