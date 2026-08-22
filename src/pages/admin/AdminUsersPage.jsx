import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Search, Eye, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const { users, pagination, loading, fetchUsers, deleteUser, toggleUserStatus } = useAdminUsers()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)

  // Each filter setter also resets back to page 1, since changing a filter
  // means the previous page number likely no longer applies.
  function updateSearch(value) {
    setSearch(value)
    setPage(1)
  }
  function updateStatusFilter(value) {
    setStatusFilter(value)
    setPage(1)
  }

  // Debounced so typing in the search box doesn't fire a request per
  // keystroke; the status tabs settle just as fast since they're discrete
  // clicks, not continuous typing.
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers({ search, status: statusFilter, page }).catch((err) => {
        toast.error(err?.message || 'Failed to load users.')
      })
    }, 300)
    return () => clearTimeout(timeout)
  }, [search, statusFilter, page, fetchUsers])

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
      <Tabs value={statusFilter} onValueChange={updateStatusFilter} className="mb-4">
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
          onChange={(e) => updateSearch(e.target.value)}
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
                    <TableCell className="text-muted-foreground">
                      {(pagination.currentPage - 1) * pagination.perPage + i + 1}
                    </TableCell>
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
    </div>
  )
}

export default AdminUsersPage
