import { useNavigate } from 'react-router'
import { Box } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useHunt } from '@/context/HuntContext'

function TreasureCard({ id, name, description, region, found, location }) {
  const navigate = useNavigate()
  const { startHunt } = useHunt()

  function handleStartHunt() {
    startHunt({ id, location })
    navigate('/')
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3.5 sm:flex-nowrap">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-warning-bg text-gold">
          <Box className="size-5" />
        </div>
        <div className="min-w-0 flex-1 basis-40">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <strong className="text-sm">{name}</strong>
            <Badge variant={found ? 'neutral' : 'success'}>
              {found ? 'Found' : 'Unfound'}
            </Badge>
          </div>
          <p className="my-0.5 text-xs text-neutral">{description}</p>
          <p className="text-[11px] text-muted-foreground">{region}</p>
        </div>
        {!found && (
          <Button size="sm" className="ml-auto sm:ml-0" onClick={handleStartHunt}>
            Start Hunt
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default TreasureCard
