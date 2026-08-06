import { Gift, Box } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const rewards = [
  { name: 'Emerald Vault', value: '$75 Gift Card', status: 'Delivered', variant: 'success' },
  { name: 'Sunken Lagoon Chest', value: '$50 Gift Card', status: 'Pending', variant: 'warning' },
  { name: 'Copper Compass Box', value: '$15 Gift Card', status: 'Processing', variant: 'neutral' },
]

function RewardsPage() {
  return (
    <div>
      <div className="mx-auto max-w-xl space-y-2.5 p-6">
        {rewards.map(({ name, value, status, variant }) => (
          <Card key={name}>
            <CardContent className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning-bg text-gold">
                <Gift className="size-4.5" />
              </div>
              <div className="flex-1">
                <strong className="text-sm">{name}</strong>
                <div className="text-xs text-neutral">{value}</div>
              </div>
              <Badge variant={variant}>{status}</Badge>
            </CardContent>
          </Card>
        ))}
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-gold bg-accent p-4 text-xs text-warning">
          <Box className="size-4 shrink-0" />
          Keep hunting — your next reward could be waiting.
        </div>
      </div>
    </div>
  )
}

export default RewardsPage
