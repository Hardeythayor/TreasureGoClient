import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Search, Eye, Trash2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useAdminUsers } from '@/context/AdminUsersContext'

function AdminUsersPage() {
  const { users, loading, fetchUsers, deleteUser, toggleUserStatus } = useAdminUsers()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Debounced so typing in the search box doesn't fire a request per
  // keystroke; the status tabs settle just as fast since they're discrete
  // clicks, not continuous typing.
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers({ search, status: statusFilter }).catch((err) => {
        toast.error(err?.message || 'Failed to load users.')
      })
    }, 300)
    return () => clearTimeout(timeout)
  }, [search, statusFilter, fetchUsers])

  async function handleDelete(user) {
    if (!window.confirm(`Delete "${user.name}"? This can't be undone.`)) return
    try {
      await deleteUser(user.id)
      toast.success(`"${user.name}" deleted.`)
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Please try again.')
    }
  }

  async function handleToggleStatus(user) {
    try {
      await toggleUserStatus(user.id)
      toast.success(`"${user.name}" is now ${user.status === 'Active' ? 'Inactive' : 'Active'}.`)
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Please try again.')
    }
  }

  return (
    <div>
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 flex w-72 items-center gap-2 rounded-lg border border-input px-3 py-1.5 text-sm text-muted-foreground">
        <Search className="size-3.5 shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users…"
          className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Loading users…
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No users match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u, i) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-full bg-linear-to-br from-gold-light to-gold text-[11px] font-bold text-navy-deep">
                          {u.name
                            .split(' ')
                            .map((x) => x[0])
                            .join('')}
                        </div>
                        {u.name}
                      </div>
                    </TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.country}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={u.status === 'Active'}
                          onCheckedChange={() => handleToggleStatus(u)}
                          aria-label={`Toggle status for ${u.name}`}
                        />
                        <Badge variant={u.status === 'Active' ? 'success' : 'neutral'}>
                          {u.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{u.joined}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-navy-mid">
                        <Link to={`/admin/users/${u.id}`} aria-label="View user">
                          <Eye className="size-4" />
                        </Link>
                        <button
                          type="button"
                          aria-label="Delete user"
                          onClick={() => handleDelete(u)}
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
    </div>
  )
}

export default AdminUsersPage
