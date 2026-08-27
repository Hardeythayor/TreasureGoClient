import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ApiError, isApiConfigured } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { subscribeToUserNotifications } from '@/lib/pusher'
import {
  deleteAllNotificationsRequest,
  deleteNotificationRequest,
  fetchNotificationsRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
} from '@/services/messagesFeedService'

// Notifications directed AT the admin (system/activity events — a treasure
// being found, a new user signing up, etc.) — distinct from
// AdminMessagesContext, which is the "Sent History" of messages the admin
// composed and sent OUT to customers. Both this feed and the customer-side
// MessagesContext hit the same generic /notifications endpoints; which
// account's inbox comes back is entirely down to whichever bearer token the
// axios interceptor attaches for the current route (admin vs customer
// session), not anything this context does differently.
const DEFAULT_PAGINATION = { currentPage: 1, lastPage: 1, total: 0, perPage: 30 }

// Local-only mock data, used only when no API base URL is configured at all
// (pure offline/demo mode).
const LOCAL_MESSAGES = [
  {
    id: 'admin-seed-1',
    icon: 'trophy',
    title: 'Treasure found! 🏆',
    message: 'Amaka Obi just found the Lagos Lagoon Chest.',
    time: '5m ago',
    unread: true,
  },
  {
    id: 'admin-seed-2',
    icon: 'bell',
    title: 'New user signed up',
    message: 'Chidi Eze created an account and subscribed to the $100 tier.',
    time: '1h ago',
    unread: true,
  },
  {
    id: 'admin-seed-3',
    icon: 'gift',
    title: 'Reward pending',
    message: '2 treasure rewards are awaiting an Amazon gift card link.',
    time: 'Yesterday',
    unread: false,
  },
]

function iconFor(messageType) {
  if (messageType === 'reward_delivered' || messageType === 'reward_pending') return 'gift'
  if (messageType === 'treasure_found') return 'trophy'
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

function normalizeNotification(data) {
  const msg = data.message ?? {}
  return {
    id: data.id != null ? String(data.id) : '',
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
      console.warn('[admin-messages-feed] unrecognized list response shape:', result)
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

const AdminMessagesFeedContext = createContext(null)

export function AdminMessagesFeedProvider({ children }) {
  const { admin } = useAuth()
  const [messages, setMessages] = useState([])
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION)
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(() =>
    isApiConfigured() ? 0 : LOCAL_MESSAGES.filter((m) => m.unread).length,
  )
  const filtersRef = useRef({ page: 1 })
  const currentPageRef = useRef(1)

  useEffect(() => {
    currentPageRef.current = pagination.currentPage
  }, [pagination.currentPage])

  // Same rationale as MessagesContext's refreshUnreadCount: powers the
  // header bell badge independently of whatever page AdminMessagesPage
  // itself is showing. Used from markRead/deleteMessage (regular async
  // calls, not effects).
  const refreshUnreadCount = useCallback(async () => {
    if (!isApiConfigured()) return
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
  // `await` inside a same-file async function call.
  useEffect(() => {
    if (!admin || !isApiConfigured()) return
    fetchNotificationsRequest({ page: 1 })
      .then((result) => {
        const { items } = normalizeNotificationsPage(result)
        setUnreadCount(items.filter((m) => m.unread).length)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(admin)])

  // Realtime: subscribes to this admin's `private-notifications.{id}`
  // channel for as long as they're logged in, same mechanism as the
  // customer side. `treasure_found` still gets a dedicated toast — the
  // admin cares just as much (if not more) that someone found a treasure.
  useEffect(() => {
    if (!admin?.id) return

    function handleRealtimeMessage(payload) {
      const newMessage = {
        id: payload.id != null ? String(payload.id) : '',
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

    return subscribeToUserNotifications(admin.id, handleRealtimeMessage)
  }, [admin?.id])

  const fetchMessages = useCallback(async (filters = filtersRef.current) => {
    filtersRef.current = filters
    setLoading(true)
    try {
      if (!isApiConfigured()) {
        setMessages(LOCAL_MESSAGES)
        setPagination({
          currentPage: 1,
          lastPage: 1,
          total: LOCAL_MESSAGES.length,
          perPage: LOCAL_MESSAGES.length || 30,
        })
        return
      }

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

  const markRead = useCallback(async (id) => {
    function applyLocally() {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, unread: false } : m)))
    }

    if (!isApiConfigured()) {
      applyLocally()
      return
    }

    try {
      await markNotificationReadRequest(id)
    } catch (err) {
      const reachedBackend = err instanceof ApiError && err.status > 0
      if (reachedBackend) throw err
      throw new Error('Unable to reach the server. Please check your connection and try again.', {
        cause: err,
      })
    }
    applyLocally()
    refreshUnreadCount()
  }, [refreshUnreadCount])

  const deleteMessage = useCallback(async (id) => {
    function applyLocally() {
      setMessages((prev) => prev.filter((m) => m.id !== id))
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }))
    }

    if (!isApiConfigured()) {
      applyLocally()
      return
    }

    try {
      await deleteNotificationRequest(id)
    } catch (err) {
      const reachedBackend = err instanceof ApiError && err.status > 0
      if (reachedBackend) throw err
      throw new Error('Unable to reach the server. Please check your connection and try again.', {
        cause: err,
      })
    }
    applyLocally()
    refreshUnreadCount()
  }, [refreshUnreadCount])

  const markAllRead = useCallback(async () => {
    if (!isApiConfigured()) {
      setMessages((prev) => prev.map((m) => ({ ...m, unread: false })))
      setUnreadCount(0)
      return
    }

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

  const deleteAll = useCallback(async () => {
    if (!isApiConfigured()) {
      setMessages([])
      setPagination({ currentPage: 1, lastPage: 1, total: 0, perPage: 30 })
      setUnreadCount(0)
      return
    }

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
    <AdminMessagesFeedContext.Provider
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
    </AdminMessagesFeedContext.Provider>
  )
}

export function useAdminMessagesFeed() {
  const ctx = useContext(AdminMessagesFeedContext)
  if (!ctx) throw new Error('useAdminMessagesFeed must be used within AdminMessagesFeedProvider')
  return ctx
}
