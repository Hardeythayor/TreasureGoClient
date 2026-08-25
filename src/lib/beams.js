import * as PusherPushNotifications from '@pusher/push-notifications-web'
import { ApiError, apiDelete, apiGet, isApiConfigured } from '@/lib/api'

const BEAMS_INSTANCE_ID = import.meta.env.VITE_PUSHER_BEAMS_INSTANCE_ID ?? ''

// Custom token provider (any object with a fetchToken(userId) method
// satisfies Beams' TokenProvider interface) — routed through our own
// apiGet rather than the SDK's built-in TokenProvider so it goes through
// the same axios instance (and its interceptor) as every other request in
// this app, picking up the current bearer token automatically instead of
// needing it passed in statically.
const beamsTokenProvider = {
  fetchToken: (userId) => apiGet('/beams-token', { params: { user_id: userId } }),
}

let client = null

// Lazily created — nothing registers a service worker or touches
// Notification permission until something actually opts in, and this
// stays null entirely if no instance id is configured.
function getBeamsClient() {
  if (!BEAMS_INSTANCE_ID) return null
  if (!client) {
    client = new PusherPushNotifications.Client({ instanceId: BEAMS_INSTANCE_ID })
  }
  return client
}

// Starts the Beams client (registers the service worker and — this is the
// point where the browser's native permission prompt appears — requests
// Notification permission), then associates this device with the given
// user so server-triggered "authenticated" publishes reach them.
export async function enablePushNotifications(userId) {
  const beams = getBeamsClient()
  if (!beams) throw new Error('Push notifications are not configured.')
  await beams.start()
  await beams.setUserId(`user-${userId}`, beamsTokenProvider)
}

// Stops the local Beams SDK (best-effort — still proceeds to notify the
// backend below either way) and tells the backend to remove this user's
// token, so server-triggered publishes stop reaching a device that opted
// out. Same reachedBackend rule as every other write action in this
// codebase: a reachable backend's rejection is surfaced to the caller.
export async function disablePushNotifications() {
  const beams = getBeamsClient()
  if (beams) {
    try {
      await beams.stop()
    } catch {
      // ignored — see comment above
    }
  }

  if (!isApiConfigured()) return

  try {
    await apiDelete('/beams-token')
  } catch (err) {
    const reachedBackend = err instanceof ApiError && err.status > 0
    if (reachedBackend) throw err
    throw new Error('Unable to reach the server. Please check your connection and try again.', {
      cause: err,
    })
  }
}

export async function isPushNotificationsEnabled() {
  const beams = getBeamsClient()
  if (!beams) return false
  try {
    return (await beams.getRegistrationState()) === PusherPushNotifications.RegistrationState.PERMISSION_GRANTED_REGISTERED_WITH_BEAMS
  } catch {
    return false
  }
}
