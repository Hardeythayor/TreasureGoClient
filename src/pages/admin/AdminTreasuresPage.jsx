import { Plus, Pencil, Eye, Trash2 } from 'lucide-react'
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

const rows = [
  { name: 'Emerald Vault', tier: '$75', loc: '6.4281° N, 3.4219° E', status: 'Hidden', created: 'Jun 02, 2026' },
  { name: 'Sunken Lagoon Chest', tier: '$100', loc: '6.4402° N, 3.4715° E', status: 'Hidden', created: 'Jun 09, 2026' },
  { name: 'Merchant’s Cache', tier: '$50', loc: '6.4531° N, 3.3958° E', status: 'Found', created: 'May 27, 2026' },
]

function AdminTreasuresPage() {
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm">
          <Plus className="size-3.5" />
          Create New Treasure
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Treasure</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => (
            <TableRow key={t.name}>
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell>{t.tier}</TableCell>
              <TableCell className="font-mono text-xs">{t.loc}</TableCell>
              <TableCell>
                <Badge variant={t.status === 'Hidden' ? 'warning' : 'success'}>
                  {t.status}
                </Badge>
              </TableCell>
              <TableCell>{t.created}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3 text-navy-mid">
                  <button type="button" aria-label="Edit">
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" aria-label="View">
                    <Eye className="size-4" />
                  </button>
                  <button type="button" aria-label="Delete">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default AdminTreasuresPage
