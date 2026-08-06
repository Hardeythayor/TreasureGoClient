import { useParams } from 'react-router'
import TreasureCard from '@/components/treasure/TreasureCard'
import { treasures } from '@/data/treasures'
import { useTreasureStatus } from '@/context/TreasureStatusContext'

function TierTreasuresPage() {
  const { tier } = useParams()
  const { isFound } = useTreasureStatus()
  const tierTreasures = treasures.filter((t) => t.tier === tier)

  return (
    <div className="mx-auto max-w-3xl p-6">
      {tierTreasures.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No treasures have been added to this tier yet — check back soon.
        </p>
      ) : (
        <div className="space-y-2.5">
          {tierTreasures.map((treasure) => (
            <TreasureCard
              key={treasure.id}
              {...treasure}
              found={isFound(treasure.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default TierTreasuresPage
