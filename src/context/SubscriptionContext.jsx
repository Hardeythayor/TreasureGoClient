import { createContext, useCallback, useContext, useState } from 'react'

const SUBSCRIPTION_KEY = 'treasure-go:subscription'

function readSubscription() {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const SubscriptionContext = createContext(null)

export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState(readSubscription)

  // NOTE: this only reflects what Flutterwave's client-side callback reported
  // — there's no backend yet to verify the transaction server-side, so this
  // is trust-on-callback, not a secure source of truth for real payments.
  const activateTier = useCallback((tier, txRef) => {
    const next = { tier, txRef, activatedAt: new Date().toISOString() }
    localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(next))
    setSubscription(next)
  }, [])

  const isTierActive = useCallback(
    (tier) => subscription?.tier === tier,
    [subscription],
  )

  return (
    <SubscriptionContext.Provider
      value={{ subscription, activateTier, isTierActive }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider')
  return ctx
}
