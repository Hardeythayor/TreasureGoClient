import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import TierCard from '@/components/treasure/TierCard'
import { ApiError, isApiConfigured } from '@/lib/api'
import { fetchPublicSubscriptionTiersRequest } from '@/services/publicSubscriptionTiersService'

const ICONS = [
  '/assets/chest-1.png',
  '/assets/chest-2.png',
  '/assets/chest-3.png',
  '/assets/chest-4.png',
  '/assets/chest-5.png',
  '/assets/chest-6.png',
]

// Used only when no API base URL is configured at all (pure offline/demo
// mode) — matches the shape a real subscription tier already has.
const FALLBACK_TIERS = [
  { id: '10', name: '$10', amount: '10', validity: 30, type: 'free', reward_amount: '10' },
  { id: '25', name: '$25', amount: '25', validity: 30, type: 'free', reward_amount: '20' },
  { id: '50', name: '$50', amount: '50', validity: 30, type: 'free', reward_amount: '50' },
  { id: '75', name: '$75', amount: '75', validity: 30, type: 'premium', reward_amount: '100' },
  { id: '100', name: '$100', amount: '100', validity: 30, type: 'premium', reward_amount: '200' },
  { id: '200', name: '$200', amount: '200', validity: 30, type: 'premium', reward_amount: '300' },
]

function extractTierList(result) {
  if (Array.isArray(result)) return result
  if (Array.isArray(result?.subscription_tiers)) return result.subscription_tiers
  if (Array.isArray(result?.data)) return result.data
  return null
}

// Sorted ascending by amount so the chest icons progress from smallest
// (chest-1) to largest (chest-6) regardless of the order the API returns
// them in. `currentTierId` (from the response's sibling
// current_user_subscription.subscription_tier_id, or null) is compared
// against each tier's real backend id to mark the server-verified active
// one — offline/fallback mode has no such record, so nothing is marked
// active here and TierCard's own local check is the only signal.
function normalizeTiers(list, currentTierId = null) {
  // A user can only have one active subscription at a time — every card
  // gets this flag so a non-active one can block selection rather than
  // letting the user stack a second subscription on top of an existing one.
  const hasActiveSubscription = currentTierId != null
  return [...list]
    .sort((a, b) => Number(a.amount ?? 0) - Number(b.amount ?? 0))
    .map((data, i) => ({
      id: data.id != null ? String(data.id) : '',
      name: data.name ?? `$${data.amount ?? ''}`,
      amount: data.amount,
      validity: Number(data.validity ?? 30),
      type: data.type === 'premium' ? 'premium' : 'free',
      rewardAmount: Number(data.reward_amount ?? 0),
      icon: ICONS[i % ICONS.length],
      serverActive: currentTierId != null && String(data.id) === currentTierId,
      hasActiveSubscription,
    }))
}

function TreasuresPage() {
  const [tiers, setTiers] = useState(() => normalizeTiers(FALLBACK_TIERS))

  useEffect(() => {
    if (!isApiConfigured()) return

    async function load() {
      let result
      try {
        result = await fetchPublicSubscriptionTiersRequest()
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        toast.error(
          reachedBackend
            ? err.message
            : 'Unable to reach the server. Please check your connection and try again.',
        )
        return
      }

      const list = extractTierList(result)
      if (list === null) {
        if (import.meta.env.DEV) {
          console.warn('[treasures] unrecognized subscription tiers response shape:', result)
        }
        toast.error('Unexpected response shape from the server.')
        return
      }

      const currentTierId =
        result?.current_user_subscription?.subscription_tier_id != null
          ? String(result.current_user_subscription.subscription_tier_id)
          : null
      setTiers(normalizeTiers(list, currentTierId))
    }

    load()
  }, [])

  return (
    <div className="mx-auto max-w-5xl py-10 px-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-16 lg:grid-cols-3">
        {tiers.map((tier) => (
          <TierCard key={tier.id} {...tier} />
        ))}
      </div>
    </div>
  )
}

export default TreasuresPage
