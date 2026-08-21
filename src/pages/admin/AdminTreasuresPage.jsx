import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
import TreasureLocationPicker, { DEFAULT_CENTER } from '@/components/admin/TreasureLocationPicker'
import { useAdminTreasures } from '@/context/AdminTreasuresContext'
import { useSubscriptionTiers } from '@/context/SubscriptionTiersContext'

function formatLocation(location) {
  return `${location.lat.toFixed(4)}° N, ${location.lng.toFixed(4)}° E`
}

const EMPTY_FORM = { name: '', subscriptionTierId: '' }

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

const labelClass = 'text-xs font-semibold text-navy-mid'

function AdminTreasuresPage() {
  const {
    treasures,
    loading,
    fetchTreasures,
    createTreasure,
    updateTreasure,
    deleteTreasure,
    toggleStatus,
  } = useAdminTreasures()
  const { fetchActiveTierOptions } = useSubscriptionTiers()

  const [tierOptions, setTierOptions] = useState([])
  const [tierOptionsLoading, setTierOptionsLoading] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [region, setRegion] = useState('')
  const [location, setLocation] = useState(DEFAULT_CENTER)

  useEffect(() => {
    fetchTreasures().catch((err) => {
      toast.error(err?.message || 'Failed to load treasures.')
    })
    loadTierOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTreasures])

  async function loadTierOptions() {
    setTierOptionsLoading(true)
    try {
      setTierOptions(await fetchActiveTierOptions())
    } catch (err) {
      toast.error(err?.message || 'Failed to load subscription tiers.')
    } finally {
      setTierOptionsLoading(false)
    }
  }

  function tierLabelFor(treasure) {
    const match = tierOptions.find((t) => t.id === treasure.subscriptionTierId)
    return match ? `$${match.amount}` : treasure.tierLabel
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setRegion('')
    setLocation(DEFAULT_CENTER)
    setFormOpen(true)
    loadTierOptions()
  }

  function openEdit(treasure) {
    setEditingId(treasure.id)
    setForm({ name: treasure.name, subscriptionTierId: treasure.subscriptionTierId })
    setRegion(treasure.region)
    setLocation(treasure.location)
    setFormOpen(true)
    loadTierOptions()
  }

  async function handleDelete(treasure) {
    if (!window.confirm(`Delete "${treasure.name}"? This can't be undone.`)) return
    try {
      await deleteTreasure(treasure.id)
      toast.success(`"${treasure.name}" deleted.`)
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Please try again.')
    }
  }

  async function handleToggleStatus(treasure) {
    try {
      await toggleStatus(treasure.id)
      toast.success(
        `"${treasure.name}" is now ${treasure.status === 'Hidden' ? 'Found' : 'Hidden'}.`,
      )
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Please try again.')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!region) {
      toast.error('Search for a place above to set the region before saving.')
      return
    }
    setSubmitting(true)
    try {
      const payload = { name: form.name, region, subscriptionTierId: form.subscriptionTierId, location }

      if (editingId) {
        await updateTreasure(editingId, payload)
        toast.success(`"${form.name}" updated.`)
      } else {
        await createTreasure(payload)
        toast.success(`"${form.name}" created.`)
      }
      setFormOpen(false)
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-3.5" />
          Create New Treasure
        </Button>
      </div>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Treasure</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && treasures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Loading treasures…
                  </TableCell>
                </TableRow>
              ) : treasures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No treasures yet.
                  </TableCell>
                </TableRow>
              ) : (
                treasures.map((t, i) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.region}</TableCell>
                    <TableCell>{tierLabelFor(t)}</TableCell>
                    <TableCell className="font-mono text-xs">{formatLocation(t.location)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={t.status === 'Found'}
                          onCheckedChange={() => handleToggleStatus(t)}
                          aria-label={`Toggle status for ${t.name}`}
                        />
                        <Badge variant={t.status === 'Hidden' ? 'warning' : 'success'}>
                          {t.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{t.createdAt}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-navy-mid">
                        <button type="button" aria-label="Edit" onClick={() => openEdit(t)}>
                          <Pencil className="size-4" />
                        </button>
                        <button type="button" aria-label="Delete" onClick={() => handleDelete(t)}>
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          className="sm:max-w-lg"
          onInteractOutside={(e) => {
            // The Google Places suggestion dropdown (.pac-container) is
            // appended straight to document.body, outside this dialog's DOM
            // subtree — without this, Radix treats a click on it as an
            // outside interaction and closes the dialog before Google's own
            // mousedown-based selection handler gets to run, so the pick
            // silently does nothing.
            if (e.target instanceof Element && e.target.closest('.pac-container')) {
              e.preventDefault()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Treasure' : 'Create New Treasure'}</DialogTitle>
            <DialogDescription>
              Search for a place, then drag the pin to the exact spot the treasure should be
              hidden.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className={labelClass} htmlFor="treasure-name">
                Name
              </label>
              <Input
                id="treasure-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Emerald Vault"
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass} htmlFor="treasure-tier">
                Subscription Tier
              </label>
              <select
                id="treasure-tier"
                required
                disabled={tierOptionsLoading}
                value={form.subscriptionTierId}
                onChange={(e) => setForm((f) => ({ ...f, subscriptionTierId: e.target.value }))}
                className={selectClass}
              >
                <option value="" disabled>
                  {tierOptionsLoading ? 'Loading tiers…' : 'Select a tier'}
                </option>
                {tierOptions.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name} (${tier.amount})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <span className={labelClass}>Hiding Spot</span>
              <TreasureLocationPicker
                location={location}
                onLocationChange={setLocation}
                onPlaceSelect={setRegion}
              />
              <p className="text-[11px] text-muted-foreground">
                Region:{' '}
                <span className="font-medium text-foreground">
                  {region || 'search for a place above to set this'}
                </span>
              </p>
            </div>

            <DialogFooter className="mt-2">
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Treasure'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminTreasuresPage
