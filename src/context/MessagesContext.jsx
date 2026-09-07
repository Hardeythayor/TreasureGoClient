import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { subscribeToUserNotifications } from '@/lib/pusher'
import {
  deleteAllNotificationsRequest,
  deleteNotificationRequest,
  fetchNotificationsRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
} from '@/services/messagesFeedService'

const DEFAULT_PAGINATION = { currentPage: 1, lastPage: 1, total: 0, perPage: 30 }

function iconFor(messageType) {
  if (messageType === 'reward_delivered') return 'gift'
  if (messageType === 'treasure_found') return 'trophy'
  // 'announcement' and anything else (e.g. 'system') fall back to the bell.
  return 'bell'
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function stripHtml(html) {
  return (html ?? '').replace(/<[^>]*>/g, '').trim()
}

// `message.message` is HTML (the admin compose form's rich text editor
// output) — rendered as-is by the page via dangerouslySetInnerHTML so
// formatting (bold/italic/underline/lists) actually shows, not raw tags.
function normalizeNotification(data) {
  const msg = data.message ?? {}
  return {
    id: data.id != null ? String(data.id) : '',
    // Read requests are scoped to the receiver, not the notification itself
    // — PATCH /notifications/{id}/read actually expects this receiver_id.
    receiverId: data.receiver_id != null ? String(data.receiver_id) : '',
    icon: iconFor(msg.message_type),
    title: msg.title ?? '',
    message: msg.message ?? '',
    time: formatTime(data.created_at),
    unread: String(data.is_read) !== '1',
  }
}

// Handles Laravel's standard paginator shape, wrapped in this endpoint's
// actual { notifications: {...} } key, or a bare paginator/array fallback.
function normalizeNotificationsPage(result) {
  const page = result?.notifications ?? result?.data ?? result
  const list = Array.isArray(page) ? page : page?.data

  if (!Array.isArray(list)) {
    if (import.meta.env.DEV) {
      console.warn('[messages] unrecognized list response shape:', result)
    }
    throw new Error('Unexpected response shape from the server.')
  }

  return {
    items: list.map((item) => normalizeNotification(item ?? {})),
    pagination: {
      currentPage: page?.current_page ?? 1,
      lastPage: page?.last_page ?? 1,
      total: page?.total ?? list.length,
      perPage: page?.per_page ?? list.length,
    },
  }
}

const MessagesContext = createContext(null)

export function MessagesProvider({ children }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION)
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const filtersRef = useRef({ page: 1 })
  // Lets the realtime handler below know whether page 1 is what's actually
  // on screen right now, without needing `pagination` in its own effect's
  // dependencies (which would tear down and resubscribe the socket channel
  // on every page change).
  const currentPageRef = useRef(1)

  useEffect(() => {
    currentPageRef.current = pagination.currentPage
  }, [pagination.currentPage])

  // Powers the header bell badge (visible app-wide, not just on the
  // Messages page) — kept independent of `messages`/`pagination` above,
  // since those reflect whatever page MessagesPage itself happens to be
  // showing, not the true unread total. Fetches just the first page and
  // counts unread there, which covers realistic inboxes without needing a
  // dedicated count endpoint. Best-effort: a header badge failing
  // shouldn't surface an error toast on every page load. Used by markRead
  // / deleteMessage below (regular async calls, not effects, so the
  // same-file async-function restriction the mount effect hits doesn't
  // apply to them).
  const refreshUnreadCount = useCallback(async () => {
    try {
      const result = await fetchNotificationsRequest({ page: 1 })
      const { items } = normalizeNotificationsPage(result)
      setUnreadCount(items.filter((m) => m.unread).length)
    } catch {
      // ignored — see comment above
    }
  }, [])

  // Inlined with an explicit .then() rather than delegating to
  // refreshUnreadCount — react-hooks/set-state-in-effect can't see past an
  // `await` inside a same-file async function call, so it flags a bare
  // `refreshUnreadCount()` here even though the actual setState only
  // happens in a deferred continuation, same as this .then() callback.
  useEffect(() => {
    if (!user) return
    fetchNotificationsRequest({ page: 1 })
      .then((result) => {
        const { items } = normalizeNotificationsPage(result)
        setUnreadCount(items.filter((m) => m.unread).length)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(user)])

  // Realtime: subscribes to this user's `private-notifications.{id}`
  // channel for as long as they're logged in. Every arriving message bumps
  // the header badge and — if page 1 is what's currently showing — gets
  // prepended to the visible list, same as a fresh fetch would return it.
  // `treasure_found` messages additionally get a dedicated toast, per the
  // request this was built for.
  useEffect(() => {
    if (!user?.id) return

    function handleRealtimeMessage(payload) {
      const newMessage = {
        id: payload.id != null ? String(payload.id) : '',
        receiverId: payload.receiver_id != null ? String(payload.receiver_id) : '',
        icon: iconFor(payload.message_type),
        title: payload.title ?? '',
        message: payload.message ?? '',
        time: formatTime(payload.created_at),
        unread: true,
      }

      setUnreadCount((c) => c + 1)
      setPagination((prev) => ({ ...prev, total: prev.total + 1 }))
      if (currentPageRef.current === 1) {
        setMessages((prev) => [newMessage, ...prev])
      }

      if (payload.message_type === 'treasure_found') {
        toast.success(payload.title || 'Treasure found!', {
          description: stripHtml(payload.message),
          position: 'top-right',
        })
      }
    }

    return subscribeToUserNotifications(user.id, handleRealtimeMessage)
  }, [user?.id])

  // A failure is thrown (not swallowed) so the page can show it.
  const fetchMessages = useCallback(async (filters = filtersRef.current) => {
    filtersRef.current = filters
    setLoading(true)
    try {
      let result
      try {
        result = await fetchNotificationsRequest(filters)
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        if (reachedBackend) throw err
        throw new Error('Unable to reach the server. Please check your connection and try again.', {
          cause: err,
        })
      }

      const { items, pagination: nextPagination } = normalizeNotificationsPage(result)
      setMessages(items)
      setPagination(nextPagination)
    } finally {
      setLoading(false)
    }
  }, [])

  const markRead = useCallback(async ({ id, receiverId }) => {
    try {
      await markNotificationReadRequest(receiverId)
    } catch (err) {
      const reachedBackend = err instanceof ApiError && err.status > 0
      if (reachedBackend) throw err
      throw new Error('Unable to reach the server. Please check your connection and try again.', {
        cause: err,
      })
    }
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, unread: false } : m)))
    refreshUnreadCount()
  }, [refreshUnreadCount])

  const deleteMessage = useCallback(async (id) => {
    try {
      await deleteNotificationRequest(id)
    } catch (err) {
      const reachedBackend = err instanceof ApiError && err.status > 0
      if (reachedBackend) throw err
      throw new Error('Unable to reach the server. Please check your connection and try again.', {
        cause: err,
      })
    }
    setMessages((prev) => prev.filter((m) => m.id !== id))
    setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }))
    refreshUnreadCount()
  }, [refreshUnreadCount])

  // Unlike markRead, this is a single bulk endpoint — no fan-out needed.
  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsReadRequest()
    } catch (err) {
      const reachedBackend = err instanceof ApiError && err.status > 0
      if (reachedBackend) throw err
      throw new Error('Unable to reach the server. Please check your connection and try again.', {
        cause: err,
      })
    }
    setMessages((prev) => prev.map((m) => ({ ...m, unread: false })))
    setUnreadCount(0)
  }, [])

  // A single bulk endpoint deletes every notification, not just the current
  // page, so the list and pagination both reset to empty rather than just
  // dropping what's currently loaded.
  const deleteAll = useCallback(async () => {
    try {
      await deleteAllNotificationsRequest()
    } catch (err) {
      const reachedBackend = err instanceof ApiError && err.status > 0
      if (reachedBackend) throw err
      throw new Error('Unable to reach the server. Please check your connection and try again.', {
        cause: err,
      })
    }
    setMessages([])
    setPagination({ currentPage: 1, lastPage: 1, total: 0, perPage: 30 })
    setUnreadCount(0)
  }, [])

  return (
    <MessagesContext.Provider
      value={{
        messages,
        pagination,
        loading,
        fetchMessages,
        markRead,
        deleteMessage,
        markAllRead,
        deleteAll,
        unreadCount,
      }}
    >
      {children}
    </MessagesContext.Provider>
  )
}

export function useMessages() {
  const ctx = useContext(MessagesContext)
  if (!ctx) throw new Error('useMessages must be used within MessagesProvider')
  return ctx
}
