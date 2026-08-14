import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
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
import { useSubscriptionTiers } from '@/context/SubscriptionTiersContext'

const EMPTY_FORM = { name: '', amount: '', validityDays: '', type: 'free', status: 'active' }

const selectClass =
  'h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

const labelClass = 'text-xs font-semibold text-navy-mid'

function AdminSubscriptionTiersPage() {
  const { tiers, loading, fetchTiers, createTier, updateTier, deleteTier, toggleStatus } =
    useSubscriptionTiers()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  // Debounced so typing in the search box doesn't fire a request per
  // keystroke; type/status changes settle just as fast since they're
  // discrete clicks, not continuous typing.
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchTiers({ search, type: typeFilter, status: statusFilter }).catch((err) => {
        toast.error(err?.message || 'Failed to load subscription tiers.')
      })
    }, 300)
    return () => clearTimeout(timeout)
  }, [search, typeFilter, statusFilter, fetchTiers])

  const rows = tiers

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function openEdit(tier) {
    setEditingId(tier.id)
    setForm({
      name: tier.name,
      amount: String(tier.amount),
      validityDays: String(tier.validityDays),
      type: tier.type,
      status: tier.status,
    })
    setFormOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingId) {
        await updateTier(editingId, form)
        toast.success(`"${form.name}" updated.`)
      } else {
        await createTier(form)
        toast.success(`"${form.name}" created.`)
      }
      setFormOpen(false)
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(tier) {
    if (!window.confirm(`Delete "${tier.name}"? This can't be undone.`)) return
    try {
      await deleteTier(tier.id)
      toast.success(`"${tier.name}" deleted.`)
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Please try again.')
    }
  }

  async function handleToggleStatus(tier) {
    try {
      await toggleStatus(tier.id)
      toast.success(`"${tier.name}" is now ${tier.status === 'active' ? 'inactive' : 'active'}.`)
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Please try again.')
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex w-56 items-center gap-2 rounded-lg border border-input px-3 py-1.5 text-sm text-muted-foreground">
            <Search className="size-3.5 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={selectClass}
          >
            <option value="all">All types</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>

          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Button size="sm" onClick={openCreate}>
          <Plus className="size-3.5" />
          Create New Tier
        </Button>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Loading subscription tiers…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No subscription tiers match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((t, i) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>${t.amount}</TableCell>
                    <TableCell>{t.validityDays} days</TableCell>
                    <TableCell>
                      <Badge variant={t.type === 'premium' ? 'warning' : 'success'}>
                        {t.type === 'premium' ? 'Premium' : 'Free'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={t.status === 'active'}
                          onCheckedChange={() => handleToggleStatus(t)}
                          aria-label={`Toggle status for ${t.name}`}
                        />
                        <Badge variant={t.status === 'active' ? 'success' : 'neutral'}>
                          {t.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{t.createdAt}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-navy-mid">
                        <button type="button" aria-label="Edit tier" onClick={() => openEdit(t)}>
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete tier"
                          onClick={() => handleDelete(t)}
                        >
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Subscription Tier' : 'Create New Tier'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the details for this subscription tier.'
                : 'Add a new subscription tier for users to select.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className={labelClass} htmlFor="tier-name">
                Name
              </label>
              <Input
                id="tier-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Explorer Pass"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelClass} htmlFor="tier-amount">
                  Amount ($)
                </label>
                <Input
                  id="tier-amount"
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="e.g. 25"
                />
              </div>

              <div className="space-y-1">
                <label className={labelClass} htmlFor="tier-validity">
                  Validity (days)
                </label>
                <Input
                  id="tier-validity"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.validityDays}
                  onChange={(e) => setForm((f) => ({ ...f, validityDays: e.target.value }))}
                  placeholder="e.g. 30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelClass} htmlFor="tier-type">
                  Type
                </label>
                <select
                  id="tier-type"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className={`${selectClass} w-full`}
                >
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className={labelClass} htmlFor="tier-status">
                  Status
                </label>
                <select
                  id="tier-status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className={`${selectClass} w-full`}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <DialogFooter className="mt-2">
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Tier'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminSubscriptionTiersPage
