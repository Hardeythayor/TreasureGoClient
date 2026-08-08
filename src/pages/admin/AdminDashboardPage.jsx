import { Card, CardContent } from '@/components/ui/card'

const kpis = [
  { label: 'Total Users', value: '1,284' },
  { label: 'Active (30d)', value: '942' },
  { label: 'Inactive', value: '342' },
  { label: 'Treasures Created', value: '87' },
  { label: 'Found / Unfound', value: '34 / 53' },
]

const bars = [70, 100, 45, 80, 60, 90]

function AdminDashboardPage() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map(({ label, value }) => (
          <Card key={label}>
            <CardContent>
              <div className="font-heading text-2xl font-bold text-navy-deep">
                {value}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardContent>
            <div className="mb-2.5 text-sm font-semibold">
              Found vs Unfound Treasures
            </div>
            <div className="flex h-32 items-end gap-2.5">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className={
                    i % 2
                      ? 'flex-1 rounded-t bg-linear-to-b from-[#8aa1c2] to-[#3e5a85]'
                      : 'flex-1 rounded-t bg-linear-to-b from-gold-light to-gold'
                  }
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="mb-2.5 text-sm font-semibold">User Growth</div>
            <svg viewBox="0 0 200 110" className="h-32 w-full">
              <polyline
                points="0,90 30,80 60,70 90,60 120,45 150,30 180,15"
                fill="none"
                stroke="#f2b10a"
                strokeWidth="3"
              />
            </svg>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboardPage
