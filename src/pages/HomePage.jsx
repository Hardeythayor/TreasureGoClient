import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps'
import { Compass, MoreVertical, MapPin, X as XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import SideMenuDrawer from '@/components/layout/SideMenuDrawer'
import DirectionalPad from '@/components/home/DirectionalPad'
import QuickNavPill, { QUICK_NAV } from '@/components/layout/QuickNavPill'
import { Switch } from '@/components/ui/switch'
import {
  useHunt,
  distanceMeters,
  getProximityLabel,
  HUNT_ZOOM,
  HUNT_WIN_THRESHOLD_M,
} from '@/context/HuntContext'
import { useTreasureStatus } from '@/context/TreasureStatusContext'
import { useNotifications } from '@/context/NotificationsContext'
import { ApiError, isApiConfigured } from '@/lib/api'
import { markTreasureFoundRequest } from '@/services/publicTreasuresService'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

const LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 }

function DebugTargetMarker({ position }) {
  return (
    <AdvancedMarker position={position} anchorLeft="-50%" anchorTop="-50%">
      <div className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white shadow-lg">
        <MapPin className="size-4" fill="currentColor" />
      </div>
    </AdvancedMarker>
  )
}

function DraggableTreasureMarker({ position, onMoved }) {
  const map = useMap()

  return (
    <AdvancedMarker
      position={position}
      draggable
      anchorLeft="-50%"
      anchorTop="-50%"
      onDragEnd={(e) => {
        const latLng = e.latLng
        if (!latLng) return
        const next = { lat: latLng.lat(), lng: latLng.lng() }
        onMoved(next)
        map?.panTo(next)
      }}
    >
      <div
        className="relative flex size-16 touch-none items-center justify-center select-none"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
      >
        <span className="absolute size-16 animate-ping rounded-full bg-gold-light/50" />
        <div className="relative z-10 flex size-12 cursor-grab items-center justify-center rounded-full border-[3px] border-gold bg-white shadow-2xl active:cursor-grabbing">
          <img
            src="/assets/icons/chest.png"
            alt="Treasure marker"
            className="size-6"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />
        </div>
      </div>
    </AdvancedMarker>
  )
}

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  // TEMP: reveals the hunt's exact hidden spot on the map for testing the
  // celebration flow. Remove this along with the debug toggle UI below once
  // done testing.
  const [debugRevealHuntTarget, setDebugRevealHuntTarget] = useState(true)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { activeHunt, clearHunt } = useHunt()
  const { markFound } = useTreasureStatus()
  const { addNotification } = useNotifications()

  const mapCenter = activeHunt?.region ?? LAGOS_CENTER
  const mapZoom = activeHunt ? HUNT_ZOOM : 12
  const [treasurePosition, setTreasurePosition] = useState(mapCenter)
  const proximity = activeHunt
    ? getProximityLabel(distanceMeters(treasurePosition, activeHunt.target))
    : null
  // Guards against firing the /find request twice — the win-condition
  // effect below can re-run (e.g. another drag) while the first call is
  // still in flight, since nothing synchronous stops it before then.
  const completingHuntRef = useRef(false)

  useEffect(() => {
    if (!activeHunt) return
    if (distanceMeters(treasurePosition, activeHunt.target) > HUNT_WIN_THRESHOLD_M) return
    if (completingHuntRef.current) return
    completingHuntRef.current = true

    const treasureId = activeHunt.treasureId
    const treasureName = activeHunt.name

    async function completeHunt() {
      try {
        if (isApiConfigured()) {
          await markTreasureFoundRequest(treasureId)
        }
        markFound(treasureId)
        addNotification({
          icon: 'trophy',
          title: 'Treasure found!',
          message: `${treasureName ?? 'A treasure'} was just found and is no longer available to hunt.`,
          time: 'Just now',
        })
        clearHunt()
        navigate(`/hunt/${treasureId}/found`, { state: { treasureName } })
      } catch (err) {
        const reachedBackend = err instanceof ApiError && err.status > 0
        toast.error(
          reachedBackend
            ? err.message
            : 'Unable to reach the server. Please check your connection and try again.',
        )
        completingHuntRef.current = false
      }
    }

    completeHunt()
  }, [treasurePosition, activeHunt, clearHunt, navigate, markFound, addNotification])

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          className="absolute inset-0 h-full w-full"
          mapId="DEMO_MAP_ID"
          defaultCenter={mapCenter}
          defaultZoom={mapZoom}
          disableDefaultUI
          gestureHandling="greedy"
        >
          <DraggableTreasureMarker
            position={treasurePosition}
            onMoved={setTreasurePosition}
          />
          {debugRevealHuntTarget && activeHunt && (
            <DebugTargetMarker position={activeHunt.target} />
          )}
        </Map>
        <DirectionalPad position={treasurePosition} onMove={setTreasurePosition} />
      </APIProvider>

      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full bg-navy-deep/55 py-2 pr-4 pl-2.5 text-white backdrop-blur-sm">
        <Compass className="size-5 text-gold-light" />
        <span className="font-heading text-sm font-bold">Treasure Go</span>
      </div>

      {activeHunt && (
        <div className="absolute top-16 left-1/2 z-10 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-navy-deep/80 py-2 pr-2 pl-4 text-white backdrop-blur-sm md:top-4">
          <span className="min-w-0 truncate text-xs font-semibold">
            Hunting: {activeHunt.name}
          </span>
          <span className="h-4 w-px shrink-0 bg-white/20" />
          <span className="shrink-0 text-xs font-medium whitespace-nowrap text-gold-light">
            {proximity}
          </span>
          <button
            type="button"
            onClick={clearHunt}
            aria-label="Cancel hunt"
            className="flex size-6 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-label="Open menu"
        className="absolute top-4 right-4 z-10 flex size-11 items-center justify-center rounded-full bg-white text-navy-mid shadow-lg"
      >
        <MoreVertical className="size-5" />
      </button>

      {/* TEMP: lets QA flip DEBUG_REVEAL_HUNT_TARGET without touching the
          codebase — remove alongside the state/marker above once done. */}
      <label className="absolute top-19 right-4 z-10 flex items-center gap-1.5 rounded-full bg-white py-1.5 pr-3 pl-2.5 text-navy-mid shadow-lg">
        <Switch
          size="sm"
          checked={debugRevealHuntTarget}
          onCheckedChange={setDebugRevealHuntTarget}
        />
        <span className="text-[10px] font-semibold whitespace-nowrap">Reveal target</span>
      </label>

      <nav className="fixed top-1/2 right-5 z-10 hidden -translate-y-1/2 flex-col gap-1.5 rounded-2xl bg-white p-2 shadow-lg md:flex">
        {QUICK_NAV.map(({ to, icon: Icon, label }) => {
          const active = pathname === to
          return (
            <Link
              key={label}
              to={to}
              className={cn(
                'flex w-16 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-navy-mid transition-colors',
                active ? 'bg-gold text-navy-deep' : 'hover:bg-black/5',
              )}
            >
              <Icon className="size-4.5" />
              <span className="text-[10px] leading-none font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>

      <QuickNavPill />

      <SideMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  )
}

export default HomePage
