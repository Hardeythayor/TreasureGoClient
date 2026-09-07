import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CreditCard } from 'lucide-react'
import TierCard from '@/components/treasure/TierCard'
import { EmptyState } from '@/components/ui/empty-state'
import { ApiError } from '@/lib/api'
import { fetchPublicSubscriptionTiersRequest } from '@/services/publicSubscriptionTiersService'

const ICONS = [
  '/assets/chest-1.png',
  '/assets/chest-2.png',
  '/assets/chest-3.png',
  '/assets/chest-4.png',
  '/assets/chest-5.png',
  '/assets/chest-6.png',
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
// one.
function normalizeTiers(list, currentTierId = null) {
  // The free tier is always available. Only premium tiers enforce "one
  // active premium subscription at a time," so every card gets this flag
  // based on whether the user's *currently active* tier is itself premium —
  // an active free subscription should never block another tier.
  const currentTier =
    currentTierId != null ? list.find((t) => String(t.id) === currentTierId) : null
  const hasActivePremiumSubscription = currentTier?.type === 'premium'
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
      hasActivePremiumSubscription,
    }))
}

function TreasuresPage() {
  const [tiers, setTiers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
      } finally {
        setLoading(false)
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
      {loading ? (
        <p className="text-center text-sm text-muted-foreground">Loading treasure passes…</p>
      ) : tiers.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No treasure passes yet"
          description="The admin hasn't set up any subscription tiers yet — check back soon."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-16 lg:grid-cols-3">
          {tiers.map((tier) => (
            <TierCard key={tier.id} {...tier} />
          ))}
        </div>
      )}
    </div>
  )
}

export default TreasuresPage
