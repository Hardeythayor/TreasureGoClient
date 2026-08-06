import { createContext, useCallback, useContext, useState } from 'react'

const NOTIFICATIONS_KEY = 'treasure-go:notifications'

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'seed-1',
    icon: 'trophy',
    title: 'You found it! 🏆',
    message:
      'Congratulations on finding the Lagos Lagoon Chest. Reward instructions are on the way.',
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
  {
    id: 'seed-4',
    icon: 'bell',
    title: 'Subscription reminder',
    message: 'Your $75 Treasure Pass renews in 3 days.',
    time: '2 days ago',
    unread: false,
  },
]

function readNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_NOTIFICATIONS
  } catch {
    return DEFAULT_NOTIFICATIONS
  }
}

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(readNotifications)

  const addNotification = useCallback((notification) => {
    setNotifications((prev) => {
      const next = [
        { id: `n-${Date.now()}`, unread: true, ...notification },
        ...prev,
      ]
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <NotificationsContext.Provider value={{ notifications, addNotification }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider')
  }
  return ctx
}
