import { useParams } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { adminUsers } from '@/data/adminUsers'

const treasuresFound = [
  { name: 'Emerald Vault', date: 'Jun 14, 2026', status: 'Delivered' },
  { name: 'Copper Compass', date: 'Apr 02, 2026', status: 'Pending' },
]

function AdminUserDetailPage() {
  const { id } = useParams()
  const user = adminUsers.find((u) => u.id === id)

  if (!user) return <p className="text-sm text-muted-foreground">User not found.</p>

  return (
    <div>
      <div className="mb-4 flex gap-2.5">
        <Button variant="destructive" size="sm">
          Remove User
        </Button>
        <Button variant="outline" size="sm">
          Manage Subscription
        </Button>
        <Button size="sm">Send Message</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent>
            <div className="flex size-14 items-center justify-center rounded-full bg-linear-to-br from-gold-light to-gold text-lg font-bold text-navy-deep">
              {user.name
                .split(' ')
                .map((x) => x[0])
                .join('')}
            </div>
            <div className="mt-2.5 font-semibold">{user.name}</div>
            <div className="text-xs text-muted-foreground">
              {user.username} · {user.email}
            </div>
            <div className="mt-3 space-y-1 text-xs text-neutral">
              <p>Joined: {user.joined}</p>
              <p>Current Tier: {user.tier}</p>
              <p className="flex items-center gap-1.5">
                Status: <Badge variant={user.status === 'Active' ? 'success' : 'neutral'}>{user.status}</Badge>
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
                  <TableHead>Treasure</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reward</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {treasuresFound.map((t) => (
                  <TableRow key={t.name}>
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
    </div>
  )
}

export default AdminUserDetailPage
