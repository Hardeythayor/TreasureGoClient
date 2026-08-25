import Pusher from 'pusher-js'
import { apiPost } from '@/lib/api'

const PUSHER_APP_KEY = import.meta.env.VITE_PUSHER_APP_KEY ?? ''
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER ?? ''

let client = null

// Lazily created — nothing opens a socket until something actually
// subscribes, and it stays null entirely if no key is configured (e.g.
// local/offline demo mode), same convention as the Google Maps/Flutterwave
// keys elsewhere in this app.
function getPusherClient() {
  if (!PUSHER_APP_KEY) return null
  if (!client) {
    client = new Pusher(PUSHER_APP_KEY, {
      cluster: PUSHER_CLUSTER,
      // Private channels are authorized through our own API rather than
      // Pusher's built-in authEndpoint/auth.headers, so the request goes
      // through the same axios instance (and its interceptor) everything
      // else in this app already uses — it picks up whichever bearer
      // token is current automatically.
      authorizer: (channel) => ({
        authorize: (socketId, callback) => {
          apiPost('/broadcasting/auth', { socket_id: socketId, channel_name: channel.name })
            .then((data) => callback(null, data))
            .catch((err) => callback(err, null))
        },
      }),
    })
  }
  return client
}

// Subscribes to a user's private notifications channel and invokes
// `onMessage` with the raw event payload whenever one arrives. Returns an
// unsubscribe function; a no-op if Pusher isn't configured or there's no
// user id yet, so callers can use it unconditionally in an effect cleanup.
export function subscribeToUserNotifications(userId, onMessage) {
  const pusher = getPusherClient()
  if (!pusher || !userId) return () => {}

  const channelName = `private-notifications.${userId}`
  const channel = pusher.subscribe(channelName)
  channel.bind('new-message', onMessage)

  return () => {
    channel.unbind('new-message', onMessage)
    pusher.unsubscribe(channelName)
  }
}
