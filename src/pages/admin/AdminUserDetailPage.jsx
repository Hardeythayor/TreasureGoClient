import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FieldError } from '@/components/ui/field-error'
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
import { useAdminUsers } from '@/context/AdminUsersContext'
import { getFieldErrors } from '@/lib/formErrors'

// Endpoint for this isn't wired yet — kept as a static placeholder until
// it's provided.
const treasuresFound = [
  { name: 'Emerald Vault', date: 'Jun 14, 2026', status: 'Delivered' },
  { name: 'Copper Compass', date: 'Apr 02, 2026', status: 'Pending' },
]

const labelClass = 'text-xs font-semibold text-navy-mid'

function AdminUserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    userDetail: user,
    userDetailLoading: loading,
    userDetailError: error,
    fetchUserById,
    updateUserBasicInfo,
    deleteUser,
    toggleUserStatus,
    resetUserPassword,
  } = useAdminUsers()

  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', username: '', email: '', country: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [resettingPassword, setResettingPassword] = useState(false)

  useEffect(() => {
    fetchUserById(id).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function openEdit() {
    setForm({
      name: user.name,
      username: user.username,
      email: user.email,
      country: user.country,
    })
    setFieldErrors({})
    setFormOpen(true)
  }

  function updateField(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      setFieldErrors((prev) => {
        if (!prev[field]) return prev
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFieldErrors({})
    setSubmitting(true)
    try {
      await updateUserBasicInfo(user.id, form)
      toast.success('User updated.')
      setFormOpen(false)
    } catch (err) {
      const fields = getFieldErrors(err)
      setFieldErrors(fields)
      if (Object.keys(fields).length === 0) {
        toast.error(err?.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${user.name}"? This can't be undone.`)) return
    try {
      await deleteUser(user.id)
      toast.success(`"${user.name}" deleted.`)
      navigate('/admin/users', { replace: true })
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Please try again.')
    }
  }

  async function handleToggleStatus() {
    try {
      await toggleUserStatus(user.id)
      toast.success(`"${user.name}" is now ${user.status === 'Active' ? 'Inactive' : 'Active'}.`)
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Please try again.')
    }
  }

  async function handleResetPassword() {
    if (!window.confirm(`Reset the password for "${user.name}"?`)) return
    setResettingPassword(true)
    try {
      await resetUserPassword(user.id)
      toast.success(`Password reset for "${user.name}".`)
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setResettingPassword(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading user…</p>
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (!user) {
    return <p className="text-sm text-muted-foreground">User not found.</p>
  }

  return (
    <div>
      <div className="mb-4 flex gap-2.5">
        <Button
          variant="destructive"
          size="sm"
          className="bg-destructive text-white hover:bg-destructive/90"
          onClick={handleDelete}
        >
          Remove User
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-navy-mid text-navy-mid hover:bg-navy-mid/5"
          onClick={handleResetPassword}
          disabled={resettingPassword}
        >
          {resettingPassword ? 'Resetting…' : 'Reset Password'}
        </Button>
        <Button size="sm">Send Message</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex size-14 items-center justify-center rounded-full bg-linear-to-br from-gold-light to-gold text-lg font-bold text-navy-deep">
                {user.name
                  .split(' ')
                  .map((x) => x[0])
                  .join('')}
              </div>
              <button
                type="button"
                aria-label="Edit user"
                onClick={openEdit}
                className="text-navy-mid hover:text-navy-deep"
              >
                <Pencil className="size-4" />
              </button>
            </div>
            <div className="mt-2.5 font-semibold">{user.name}</div>
            <div className="text-xs text-muted-foreground">
              {user.username} · {user.email}
            </div>
            <div className="mt-3 space-y-1 text-xs text-neutral">
              <p>Country: {user.country}</p>
              <p>Joined: {user.joined}</p>
              <p className="flex items-center gap-1.5">
                Status:
                <Switch
                  checked={user.status === 'Active'}
                  onCheckedChange={handleToggleStatus}
                  aria-label={`Toggle status for ${user.name}`}
                />
                <Badge variant={user.status === 'Active' ? 'success' : 'neutral'}>{user.status}</Badge>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-2.5 text-sm font-semibold">Treasures Found</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Treasure</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reward</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {treasuresFound.map((t, i) => (
                  <TableRow key={t.name}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>{t.name}</TableCell>
                    <TableCell>{t.date}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'Delivered' ? 'success' : 'warning'}>
                        {t.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update this user's basic information.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className={labelClass} htmlFor="user-name">
                Name
              </label>
              <Input
                id="user-name"
                required
                value={form.name}
                onChange={updateField('name')}
              />
              <FieldError message={fieldErrors.name} />
            </div>

            <div className="space-y-1">
              <label className={labelClass} htmlFor="user-username">
                Username
              </label>
              <Input
                id="user-username"
                required
                value={form.username}
                onChange={updateField('username')}
              />
              <FieldError message={fieldErrors.username} />
            </div>

            <div className="space-y-1">
              <label className={labelClass} htmlFor="user-email">
                Email
              </label>
              <Input
                id="user-email"
                type="email"
                required
                value={form.email}
                onChange={updateField('email')}
              />
              <FieldError message={fieldErrors.email} />
            </div>

            <div className="space-y-1">
              <label className={labelClass} htmlFor="user-country">
                Country
              </label>
              <Input
                id="user-country"
                value={form.country}
                onChange={updateField('country')}
              />
              <FieldError message={fieldErrors.country} />
            </div>

            <DialogFooter className="mt-2">
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminUserDetailPage
