import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FieldError } from '@/components/ui/field-error'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { useAdminTreasureRewards } from '@/context/AdminTreasureRewardsContext'
import { useSubscriptionTiers } from '@/context/SubscriptionTiersContext'
import { getFieldErrors } from '@/lib/formErrors'

const selectClass =
  'h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function AdminTreasureRewardsPage() {
  const { rewards, pagination, stats, loading, fetchRewards, fetchStats, sendReward } =
    useAdminTreasureRewards()
  const { fetchActiveTierOptions } = useSubscriptionTiers()

  const [tierOptions, setTierOptions] = useState([])

  const [search, setSearch] = useState('')
  const [tierId, setTierId] = useState('all')
  const [status, setStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const [rewardDialogOpen, setRewardDialogOpen] = useState(false)
  const [rewardTarget, setRewardTarget] = useState(null)
  const [amazonLink, setAmazonLink] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [sendingReward, setSendingReward] = useState(false)

  useEffect(() => {
    fetchActiveTierOptions()
      .then(setTierOptions)
      .catch((err) => toast.error(err?.message || 'Failed to load subscription tiers.'))
    fetchStats().catch((err) => {
      toast.error(err?.message || 'Failed to load treasure reward analytics.')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Each filter setter also resets back to page 1, since changing a filter
  // means the previous page number likely no longer applies.
  function updateSearch(value) {
    setSearch(value)
    setPage(1)
  }
  function updateTierId(value) {
    setTierId(value)
    setPage(1)
  }
  function updateStatus(value) {
    setStatus(value)
    setPage(1)
  }
  function updateDateFrom(value) {
    setDateFrom(value)
    setPage(1)
  }
  function updateDateTo(value) {
    setDateTo(value)
    setPage(1)
  }

  // Debounced so typing in the search box doesn't refilter per keystroke;
  // the other filters settle just as fast since they're discrete
  // clicks/selections, not continuous typing.
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchRewards({ search, tierId, status, dateFrom, dateTo, page }).catch((err) => {
        toast.error(err?.message || 'Failed to load treasure rewards.')
      })
    }, 300)
    return () => clearTimeout(timeout)
  }, [search, tierId, status, dateFrom, dateTo, page, fetchRewards])

  function tierLabelFor(reward) {
    const match = tierOptions.find((t) => t.id === reward.tierId)
    return match ? `$${match.amount}` : '—'
  }

  function openSendReward(reward) {
    setRewardTarget(reward)
    setAmazonLink('')
    setFieldErrors({})
    setRewardDialogOpen(true)
  }

  async function handleSendReward(e) {
    e.preventDefault()
    setFieldErrors({})
    setSendingReward(true)
    try {
      await sendReward(rewardTarget, amazonLink)
      toast.success(`Reward sent for "${rewardTarget.treasureName}".`)
      setRewardDialogOpen(false)
    } catch (err) {
      const fields = getFieldErrors(err)
      setFieldErrors(fields)
      if (Object.keys(fields).length === 0) {
        toast.error(err?.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setSendingReward(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent>
            <div className="font-heading text-2xl font-bold text-navy-deep">
              {stats.totalFound}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              Total Treasures Found
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="font-heading text-2xl font-bold text-navy-deep">
              {stats.totalRewarded}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Total Reward Sent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="font-heading text-2xl font-bold text-navy-deep">
              {stats.totalPending}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Total Pending</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex w-64 items-center gap-2 rounded-lg border border-input px-3 py-1.5 text-sm text-muted-foreground">
          <Search className="size-3.5 shrink-0" />
          <input
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Search founder or treasure…"
            className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <select value={tierId} onChange={(e) => updateTierId(e.target.value)} className={selectClass}>
          <option value="all">All tiers</option>
          {tierOptions.map((tier) => (
            <option key={tier.id} value={tier.id}>
              {tier.name} (${tier.amount})
            </option>
          ))}
        </select>

        <Tabs value={status} onValueChange={updateStatus}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="rewarded">Rewarded</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <label htmlFor="date-from">From</label>
          <input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => updateDateFrom(e.target.value)}
            className={selectClass}
          />
          <label htmlFor="date-to">To</label>
          <input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(e) => updateDateTo(e.target.value)}
            className={selectClass}
          />
        </div>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Treasure</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Found By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && rewards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading treasure rewards…
                  </TableCell>
                </TableRow>
              ) : rewards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No treasure rewards match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                rewards.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">
                      {(pagination.currentPage - 1) * pagination.perPage + i + 1}
                    </TableCell>
                    <TableCell className="font-medium">{r.treasureName}</TableCell>
                    <TableCell>{tierLabelFor(r)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{r.founderName}</div>
                      <div className="text-xs text-muted-foreground">{r.founderEmail}</div>
                      <div className="text-[11px] font-medium text-navy-mid">
                        Found {formatDate(r.dateFound)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'pending' ? 'warning' : 'success'}>
                        {r.status === 'pending' ? 'Pending' : 'Rewarded'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.status === 'pending' && (
                        <Button size="sm" onClick={() => openSendReward(r)}>
                          Send Reward
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {pagination.total > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
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
        </CardContent>
      </Card>

      <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Reward</DialogTitle>
            <DialogDescription>
              {rewardTarget &&
                `Paste the Amazon gift card link for "${rewardTarget.treasureName}" (found by ${rewardTarget.founderName}).`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendReward} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-navy-mid" htmlFor="amazon-link">
                Reward (Amazon Gift Card Link)
              </label>
              <Input
                id="amazon-link"
                type="url"
                required
                value={amazonLink}
                onChange={(e) => {
                  setAmazonLink(e.target.value)
                  setFieldErrors((prev) => (prev.amazon_link ? {} : prev))
                }}
                placeholder="https://www.amazon.com/gc/..."
              />
              <FieldError message={fieldErrors.amazon_link} />
            </div>

            <DialogFooter className="mt-2">
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={sendingReward}>
                {sendingReward ? 'Sending…' : 'Send Reward'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminTreasureRewardsPage
