import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { ApiError, isApiConfigured } from '@/lib/api'
import { fetchSentMessagesRequest } from '@/services/adminNotificationsService'

const DEFAULT_PAGINATION = { currentPage: 1, lastPage: 1, total: 0, perPage: 30 }

// Local-only mock data, used only when no API base URL is configured at all
// (pure offline/demo mode).
const LOCAL_SENT_MESSAGES = [
  {
    id: 'demo-1',
    to: 'All Users',
    messageTypeLabel: 'General Update',
    date: 'Jul 10, 2026',
    title: 'New Subscription tiers to be added soon',
    message: '<p>Look forward to an exciting experience as new Treasure Passes will be added soon.</p>',
  },
  {
    id: 'demo-2',
    to: '1 User',
    messageTypeLabel: 'Congratulatory',
    date: 'Jul 09, 2026',
    title: 'Congrats on your find!',
    message: '<p>Nice work finding <strong>Emerald Vault</strong> — your reward is on the way.</p>',
  },
  {
    id: 'demo-3',
    to: '$100 Tier',
    messageTypeLabel: 'General Update',
    date: 'Jul 08, 2026',
    title: 'New treasures added to your tier',
    message: '<p>3 new treasures were just added to the $100 tier. Go hunt!</p>',
  },
]

const MESSAGE_TYPE_LABELS = {
  announcement: 'General Update',
  congratulatory: 'Congratulatory',
}

// No recipient name/email comes back for a `user`-type send (`recipients`
// is just an array of raw ids) — "1 User" is the most specific label the
// response actually supports.
function recipientLabel(data) {
  if (data.type === 'tier') {
    return data.subscription_tier?.name ? `${data.subscription_tier.name} Tier` : 'Tier'
  }
  if (data.type === 'user') return '1 User'
  return 'All Users'
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function normalizeSentMessage(data) {
  return {
    id: data.id != null ? String(data.id) : '',
    to: recipientLabel(data),
    messageTypeLabel: MESSAGE_TYPE_LABELS[data.message_type] ?? data.message_type ?? '',
    date: formatDate(data.created_at),
    title: data.title ?? '',
    message: data.message ?? '',
  }
}

// Handles Laravel's standard paginator shape, wrapped in this endpoint's
// actual { notifications: {...} } key, or a bare paginator/array fallback.
function normalizeSentMessagesPage(result) {
  const page = result?.notifications ?? result?.data ?? result
  const list = Array.isArray(page) ? page : page?.data

  if (!Array.isArray(list)) {
    if (import.meta.env.DEV) {
      console.warn('[admin-messages] unrecognized list response shape:', result)
    }
    throw new Error('Unexpected response shape from the server.')
  }

  return {
    items: list.map((item) => normalizeSentMessage(item ?? {})),
    pagination: {
      currentPage: page?.current_page ?? 1,
      lastPage: page?.last_page ?? 1,
      total: page?.total ?? list.length,
      perPage: page?.per_page ?? list.length,
    },
  }
}

const AdminMessagesContext = createContext(null)

export function AdminMessagesProvider({ children }) {
  const [messages, setMessages] = useState([])
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION)
  const [loading, setLoading] = useState(false)
  const filtersRef = useRef({ page: 1 })

  // Same rule as every other list fetch in this codebase: once the API is
  // configured, a failure is thrown (not swallowed) so the page can show
  // it. The local list is only used when no API is configured at all.
  const fetchSentMessages = useCallback(async (filters = filtersRef.current) => {
    filtersRef.current = filters
    setLoading(true)
    try {
      if (!isApiConfigured()) {
        setMessages(LOCAL_SENT_MESSAGES)
        setPagination({
          currentPage: 1,
          lastPage: 1,
          total: LOCAL_SENT_MESSAGES.length,
          perPage: LOCAL_SENT_MESSAGES.length || 30,
        })
        return
      }

      let result
      try {
        result = await fetchSentMessagesRequest(filters)
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        if (reachedBackend) throw err
        throw new Error('Unable to reach the server. Please check your connection and try again.', {
          cause: err,
        })
      }

      const { items, pagination: nextPagination } = normalizeSentMessagesPage(result)
      setMessages(items)
      setPagination(nextPagination)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <AdminMessagesContext.Provider value={{ messages, pagination, loading, fetchSentMessages }}>
      {children}
    </AdminMessagesContext.Provider>
  )
}

export function useAdminMessages() {
  const ctx = useContext(AdminMessagesContext)
  if (!ctx) throw new Error('useAdminMessages must be used within AdminMessagesProvider')
  return ctx
}
