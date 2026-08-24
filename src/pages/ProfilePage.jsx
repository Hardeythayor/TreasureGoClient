import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'

function initialsFor(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function formatMemberSince(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

const labelClass = 'text-xs font-semibold text-navy-mid'

function ProfilePage() {
  const { user, updateProfile } = useAuth()

  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', username: '', country: '' })
  const [saving, setSaving] = useState(false)

  if (!user?.name) {
    return <p className="p-6 text-center text-sm text-muted-foreground">Loading profile…</p>
  }

  function openEdit() {
    setForm({
      name: user.name ?? '',
      email: user.email ?? '',
      username: user.username ?? '',
      country: user.country ?? '',
    })
    setEditOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile(form)
      toast.success('Profile updated.')
      setEditOpen(false)
    } catch (err) {
      const reachedBackend = err instanceof ApiError && err.status > 0
      toast.error(
        reachedBackend
          ? err.message
          : 'Unable to reach the server. Please check your connection and try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  const stats = [
    { label: 'Email', value: user.email },
    { label: 'Country', value: user.country || '—' },
    { label: 'Member Since', value: formatMemberSince(user.createdAt) },
    { label: 'Current Tier', value: user.currentSubscription?.tierName || 'None' },
  ]

  return (
    <div>
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="mx-auto flex size-21 items-center justify-center rounded-full bg-linear-to-br from-gold-light to-gold font-heading text-2xl font-bold text-navy-deep">
          {initialsFor(user.name)}
        </div>
        <h2 className="mt-3 font-heading text-lg font-semibold">{user.name}</h2>
        <p className="text-xs text-muted-foreground">@{user.username}</p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-left">
          {stats.map(({ label, value }) => (
            <Card key={label}>
              <CardContent>
                <div className="text-[11px] text-muted-foreground">{label}</div>
                <div className="text-sm font-semibold">{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-3 text-left">
          <CardContent>
            <div className="text-[11px] text-muted-foreground">Treasures Found</div>
            <div className="text-sm font-semibold">{user.totalTreasuresFound}</div>
          </CardContent>
        </Card>

        <div className="mt-5 space-y-2.5">
          <Button className="w-full" onClick={openEdit}>
            Edit Profile
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/rewards">View Rewards</Link>
          </Button>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your account details.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className={labelClass} htmlFor="profile-name">
                Name
              </label>
              <Input
                id="profile-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass} htmlFor="profile-username">
                Username
              </label>
              <Input
                id="profile-username"
                required
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass} htmlFor="profile-email">
                Email
              </label>
              <Input
                id="profile-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass} htmlFor="profile-country">
                Country
              </label>
              <Input
                id="profile-country"
                required
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              />
            </div>

            <DialogFooter className="mt-2">
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProfilePage
