import { useNavigate, useParams } from 'react-router'
import { Gift } from 'lucide-react'
import { treasures } from '@/data/treasures'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function RewardDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const treasure = treasures.find((t) => t.id === id)

  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-navy-deep px-5 py-4 font-heading text-base font-semibold text-white">
        Reward Details
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="max-w-sm">
          <CardContent className="flex flex-col items-center text-center">
            <Gift className="size-8 text-gold" />
            <h2 className="mt-3.5 font-heading text-lg font-semibold">
              Nice work — treasure found!
            </h2>
            <p className="mt-1.5 text-sm text-neutral">
              Our admin team has been notified about{' '}
              <strong>{treasure?.name ?? 'your treasure'}</strong> and will send
              your gift card reward instructions shortly.
            </p>
            <Badge variant="warning" className="mt-3.5">
              Pending Admin Response
            </Badge>
            <Button className="mt-5" onClick={() => navigate('/')}>
              Back to Map
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default RewardDetailPage
