import { createContext, useCallback, useContext, useState } from 'react'

const TIERS_KEY = 'treasure-go:admin-subscription-tiers'

const DEFAULT_TIERS = [
  { id: 'tier-starter-pass', name: 'Starter Pass', amount: 10, validityDays: 30, type: 'free', status: 'active', createdAt: 'Jan 01, 2026' },
  { id: 'tier-explorer-pass', name: 'Explorer Pass', amount: 25, validityDays: 30, type: 'free', status: 'active', createdAt: 'Jan 01, 2026' },
  { id: 'tier-adventurer-pass', name: 'Adventurer Pass', amount: 50, validityDays: 30, type: 'free', status: 'active', createdAt: 'Jan 01, 2026' },
  { id: 'tier-voyager-pass', name: 'Voyager Pass', amount: 75, validityDays: 30, type: 'premium', status: 'active', createdAt: 'Jan 01, 2026' },
  { id: 'tier-elite-pass', name: 'Elite Pass', amount: 100, validityDays: 30, type: 'premium', status: 'active', createdAt: 'Jan 01, 2026' },
  { id: 'tier-legendary-pass', name: 'Legendary Pass', amount: 200, validityDays: 30, type: 'premium', status: 'active', createdAt: 'Jan 01, 2026' },
]

function readTiers() {
  try {
    const raw = localStorage.getItem(TIERS_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_TIERS
  } catch {
    return DEFAULT_TIERS
  }
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function formatToday() {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

const SubscriptionTiersContext = createContext(null)

export function SubscriptionTiersProvider({ children }) {
  const [tiers, setTiers] = useState(readTiers)

  const persist = useCallback((next) => {
    localStorage.setItem(TIERS_KEY, JSON.stringify(next))
    return next
  }, [])

  const createTier = useCallback(
    ({ name, amount, validityDays, type, status }) => {
      setTiers((prev) => {
        const id = `tier-${slugify(name)}-${Date.now()}`
        const next = [
          ...prev,
          {
            id,
            name,
            amount: Number(amount),
            validityDays: Number(validityDays),
            type,
            status,
            createdAt: formatToday(),
          },
        ]
        return persist(next)
      })
    },
    [persist],
  )

  const updateTier = useCallback(
    (id, patch) => {
      setTiers((prev) =>
        persist(
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ...patch,
                  amount: patch.amount != null ? Number(patch.amount) : t.amount,
                  validityDays:
                    patch.validityDays != null ? Number(patch.validityDays) : t.validityDays,
                }
              : t,
          ),
        ),
      )
    },
    [persist],
  )

  const deleteTier = useCallback(
    (id) => {
      setTiers((prev) => persist(prev.filter((t) => t.id !== id)))
    },
    [persist],
  )

  const toggleStatus = useCallback(
    (id) => {
      setTiers((prev) =>
        persist(
          prev.map((t) =>
            t.id === id
              ? { ...t, status: t.status === 'active' ? 'inactive' : 'active' }
              : t,
          ),
        ),
      )
    },
    [persist],
  )

  return (
    <SubscriptionTiersContext.Provider
      value={{ tiers, createTier, updateTier, deleteTier, toggleStatus }}
    >
      {children}
    </SubscriptionTiersContext.Provider>
  )
}

export function useSubscriptionTiers() {
  const ctx = useContext(SubscriptionTiersContext)
  if (!ctx) {
    throw new Error('useSubscriptionTiers must be used within SubscriptionTiersProvider')
  }
  return ctx
}
