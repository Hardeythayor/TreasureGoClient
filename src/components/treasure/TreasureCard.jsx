import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Box } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useHunt } from '@/context/HuntContext'
import { ApiError, isApiConfigured } from '@/lib/api'
import { startTreasureHuntRequest } from '@/services/publicTreasuresService'

function TreasureCard({ id, name, description, region, found, location }) {
  const navigate = useNavigate()
  const { startHunt } = useHunt()
  const [starting, setStarting] = useState(false)

  async function handleStartHunt() {
    if (!isApiConfigured()) {
      startHunt({ id, name, location })
      navigate('/')
      return
    }

    setStarting(true)
    try {
      const result = await startTreasureHuntRequest(id)
      const treasure = result?.treasure_hunt?.treasure
      if (!treasure?.location) {
        if (import.meta.env.DEV) {
          console.warn('[start-hunt] unrecognized response shape:', result)
        }
        toast.error('Unexpected response shape from the server.')
        return
      }
      startHunt({ id: treasure.id, name: treasure.name, location: treasure.location })
      navigate('/')
    } catch (err) {
      const reachedBackend = err instanceof ApiError && err.status > 0
      toast.error(
        reachedBackend
          ? err.message
          : 'Unable to reach the server. Please check your connection and try again.',
      )
    } finally {
      setStarting(false)
    }
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
          <Button
            size="sm"
            className="ml-auto sm:ml-0"
            onClick={handleStartHunt}
            disabled={starting}
          >
            {starting ? 'Starting…' : 'Start Hunt'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default TreasureCard
