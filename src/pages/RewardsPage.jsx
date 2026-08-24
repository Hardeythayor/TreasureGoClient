import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Gift, Box, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRewards } from '@/context/RewardsContext'

function statusBadge(reward) {
  if (reward.status !== 'found') {
    return { label: 'In Progress', variant: 'neutral' }
  }
  if (reward.rewardStatus === 'rewarded') {
    return { label: 'Delivered', variant: 'success' }
  }
  return { label: 'Pending', variant: 'warning' }
}

function RewardsPage() {
  const { rewards, pagination, loading, fetchRewards } = useRewards()
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchRewards({ page }).catch((err) => {
      toast.error(err?.message || 'Failed to load rewards.')
    })
  }, [page, fetchRewards])

  return (
    <div>
      <div className="mx-auto max-w-xl space-y-2.5 p-6">
        {loading && rewards.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Loading rewards…</p>
        ) : rewards.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No treasure hunts yet — start one to see your rewards here.
          </p>
        ) : (
          rewards.map((reward) => {
            const badge = statusBadge(reward)
            return (
              <Card key={reward.id}>
                <CardContent className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning-bg text-gold">
                    <Gift className="size-4.5" />
                  </div>
                  <div className="flex-1">
                    <strong className="text-sm">{reward.treasureName}</strong>
                    <div className="text-xs text-neutral">
                      ${reward.rewardAmount} Amazon Gift Card
                    </div>
                    {badge.label === 'Delivered' && reward.rewardLink && (
                      <a
                        href={reward.rewardLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-navy-mid underline"
                      >
                        View Gift Card
                      </a>
                    )}
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </CardContent>
              </Card>
            )
          })
        )}

        {pagination.total > 0 && (
          <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
            <span>
              Showing {(pagination.currentPage - 1) * pagination.perPage + 1}–
              {Math.min(pagination.currentPage * pagination.perPage, pagination.total)} of{' '}
              {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={pagination.currentPage <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span>
                Page {pagination.currentPage} of {pagination.lastPage}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={pagination.currentPage >= pagination.lastPage}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-xl border border-dashed border-gold bg-accent p-4 text-xs text-warning">
          <Box className="size-4 shrink-0" />
          Keep hunting — your next reward could be waiting.
        </div>
      </div>
    </div>
  )
}

export default RewardsPage
