import { Send } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

const history = [
  { to: 'All Users', type: 'Announcement', date: 'Jul 10, 2026' },
  { to: 'Amaka Obi', type: 'Congratulatory', date: 'Jul 09, 2026' },
  { to: '$100 Tier', type: 'Reward Instructions', date: 'Jul 08, 2026' },
]

function AdminNotificationsPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="space-y-3">
          <div className="text-sm font-semibold">Compose Notification</div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid">Recipient</label>
            <select className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none">
              <option>All Users</option>
              <option>Individual User</option>
              <option>Tier-based</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid">Message type</label>
            <select className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none">
              <option>General Update</option>
              <option>Congratulatory</option>
              <option>Reward Instructions</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid">Subject</label>
            <Input placeholder="Reward instructions for Emerald Vault" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid">Message</label>
            <textarea
              placeholder="Type your message…"
              className="min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <Button className="w-full">
            <Send className="size-3.5" />
            Send Notification
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-2.5 text-sm font-semibold">Sent History</div>
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>To</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.to + h.date}>
                  <TableCell>{h.to}</TableCell>
                  <TableCell>
                    <Badge variant="warning">{h.type}</Badge>
                  </TableCell>
                  <TableCell>{h.date}</TableCell>
                  <TableCell>
                    <Badge variant="success">Delivered</Badge>
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

export default AdminNotificationsPage
