import { useState } from 'react'
import { Link } from 'react-router'
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
import { adminUsers } from '@/data/adminUsers'

function AdminUsersPage() {
  const [filter, setFilter] = useState('all')

  const rows = adminUsers.filter((u) => {
    if (filter === 'active') return u.status === 'Active'
    if (filter === 'inactive') return u.status === 'Inactive'
    return true
  })

  return (
    <div>
      <Tabs value={filter} onValueChange={setFilter} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 flex w-72 items-center gap-2 rounded-lg border border-input px-3 py-1.5 text-sm text-muted-foreground">
        <Search className="size-3.5" />
        Search users…
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
                <TableHead>Status</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u, i) => (
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
                  <TableCell>
                    <Badge variant={u.status === 'Active' ? 'success' : 'neutral'}>
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.tier}</TableCell>
                  <TableCell>{u.joined}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 text-navy-mid">
                      <Link to={`/admin/users/${u.id}`} aria-label="View user">
                        <Eye className="size-4" />
                      </Link>
                      <button type="button" aria-label="Delete user">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminUsersPage
