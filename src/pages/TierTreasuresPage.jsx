import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import TreasureCard from '@/components/treasure/TreasureCard'
import { treasures as FALLBACK_TREASURES } from '@/data/treasures'
import { useTreasureStatus } from '@/context/TreasureStatusContext'
import { ApiError, isApiConfigured } from '@/lib/api'
import { fetchTierTreasuresRequest } from '@/services/publicTreasuresService'

function extractTreasureList(result) {
  if (Array.isArray(result)) return result
  if (Array.isArray(result?.treasures)) return result.treasures
  if (Array.isArray(result?.data)) return result.data
  return null
}

function normalizeTreasure(data) {
  return {
    id: data.id,
    name: data.name,
    description: '',
    region: data.region,
    location: data.location,
    // The server's status is authoritative; the local (localStorage)
    // isFound check is kept as a fallback bridge right after a hunt
    // completes, same pattern used for subscription activation.
    serverFound: data.status === 'found',
  }
}

function TierTreasuresPage() {
  // :tier is the real backend subscription tier id now (not the dollar
  // amount) — that's what the treasures endpoint is keyed by, and it avoids
  // an extra round trip to resolve amount -> id (and the ambiguity of two
  // tiers sharing the same amount).
  const { tier } = useParams()
  const { isFound } = useTreasureStatus()
  const [treasureList, setTreasureList] = useState(() =>
    FALLBACK_TREASURES.filter((t) => t.tier === tier).map((t) => ({ ...t, serverFound: false })),
  )
  const [loading, setLoading] = useState(isApiConfigured())

  useEffect(() => {
    if (!isApiConfigured()) return

    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const result = await fetchTierTreasuresRequest(tier)
        const list = extractTreasureList(result)

        if (list === null) {
          if (import.meta.env.DEV) {
            console.warn('[tier-treasures] unrecognized response shape:', result)
          }
          if (!cancelled) toast.error('Unexpected response shape from the server.')
          return
        }

        if (!cancelled) setTreasureList(list.map(normalizeTreasure))
      } catch (err) {
        if (cancelled) return
        const reachedBackend = err instanceof ApiError && err.status > 0
        toast.error(
          reachedBackend
            ? err.message
            : 'Unable to reach the server. Please check your connection and try again.',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [tier])

  return (
    <div className="mx-auto max-w-3xl p-6">
      {loading && treasureList.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading treasures…</p>
      ) : treasureList.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No treasures have been added to this tier yet — check back soon.
        </p>
      ) : (
        <div className="space-y-2.5">
          {treasureList.map((treasure) => (
            <TreasureCard
              key={treasure.id}
              {...treasure}
              found={treasure.serverFound || isFound(treasure.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default TierTreasuresPage
