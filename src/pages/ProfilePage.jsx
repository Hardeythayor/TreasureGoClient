import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const stats = [
  { label: 'Email', value: 'amaka@mail.com' },
  { label: 'Member Since', value: 'Jan 2026' },
  { label: 'Current Tier', value: '$100' },
  { label: 'Treasures Found', value: '3' },
]

function ProfilePage() {
  return (
    <div>
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="mx-auto flex size-21 items-center justify-center rounded-full bg-linear-to-br from-gold-light to-gold font-heading text-2xl font-bold text-navy-deep">
          AO
        </div>
        <h2 className="mt-3 font-heading text-lg font-semibold">Amaka Obi</h2>
        <p className="text-xs text-muted-foreground">@amaka.o</p>

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

        <div className="mt-5 space-y-2.5">
          <Button className="w-full">Edit Profile</Button>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/rewards">View Rewards</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
