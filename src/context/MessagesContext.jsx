import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { ApiError, isApiConfigured } from '@/lib/api'
import {
  deleteNotificationRequest,
  fetchNotificationsRequest,
  markNotificationReadRequest,
} from '@/services/messagesFeedService'

const DEFAULT_PAGINATION = { currentPage: 1, lastPage: 1, total: 0, perPage: 30 }

// Local-only mock data, used only when no API base URL is configured at all
// (pure offline/demo mode).
const LOCAL_MESSAGES = [
  {
    id: 'seed-1',
    icon: 'trophy',
    title: 'You found it! 🏆',
    message: 'Congratulations on finding the Lagos Lagoon Chest. Reward instructions are on the way.',
    time: '2m ago',
    unread: true,
  },
  {
    id: 'seed-2',
    icon: 'gift',
    title: 'Reward delivered',
    message: 'Your $50 gift card for Emerald Vault has been sent to your email.',
    time: '1h ago',
    unread: true,
  },
  {
    id: 'seed-3',
    icon: 'bell',
    title: 'New treasures added',
    message: '3 new treasures were just added to the $100 tier. Go hunt!',
    time: 'Yesterday',
    unread: false,
  },
]

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

// `message.message` is HTML (the admin compose form's rich text editor
// output) — rendered as-is by the page via dangerouslySetInnerHTML so
// formatting (bold/italic/underline/lists) actually shows, not raw tags.
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
  const [messages, setMessages] = useState([])
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION)
  const [loading, setLoading] = useState(false)
  const filtersRef = useRef({ page: 1 })

  // Same rule as every other list fetch in this codebase: once the API is
  // configured, a failure is thrown (not swallowed) so the page can show
  // it. The local list is only used when no API is configured at all.
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

  // Same rule as the other write actions in this codebase: once the API is
  // configured, a reachable backend's rejection is surfaced, and only a
  // genuinely unreachable backend falls back to a local-only flip.
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
  }, [])

  // Same rule as the other write actions in this codebase: once the API is
  // configured, a reachable backend's rejection is surfaced, and only a
  // genuinely unreachable backend falls back to a local-only removal.
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
  }, [])

  return (
    <MessagesContext.Provider
      value={{ messages, pagination, loading, fetchMessages, markRead, deleteMessage }}
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
