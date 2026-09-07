import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { MoreVertical, X as XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { maplibregl, buildSatelliteStyle } from '@/lib/maplibreClient'
import { clampPointToRect } from '@/lib/mapGeometry'
import SideMenuDrawer from '@/components/layout/SideMenuDrawer'
import DirectionalPad from '@/components/home/DirectionalPad'
import QuickNavPill, { QUICK_NAV, NavIcon } from '@/components/layout/QuickNavPill'
import { Switch } from '@/components/ui/switch'
import {
  useHunt,
  distanceMeters,
  HUNT_ZOOM,
  HUNT_WIN_THRESHOLD_M,
} from '@/context/HuntContext'
import { useTreasureStatus } from '@/context/TreasureStatusContext'
import { useMessages } from '@/context/MessagesContext'
import { ApiError } from '@/lib/api'
import { markTreasureFoundRequest } from '@/services/publicTreasuresService'

const LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 }
const IDLE_ZOOM = 16

// Creates a non-interactive ("static image") MapLibre map once per
// `buildCamera` identity — no pan, zoom, rotate, or any other camera
// gesture is ever possible, so the treasure marker can be safely confined
// to the screen: the viewport it's confined to can never move out from
// under it. `buildCamera(mapInstance)` decides the initial center/zoom —
// it gets a real (already-sized) map instance so it can use methods like
// cameraForBounds that need to know the actual container dimensions.
function useStaticMap(containerRef, buildCamera) {
  const [map, setMap] = useState(null)

  useEffect(() => {
    if (!containerRef.current) return

    const instance = new maplibregl.Map({
      style: buildSatelliteStyle(),
      container: containerRef.current,
      center: [0, 0],
      zoom: 1,
      interactive: false,
      attributionControl: false,
    })

    instance.jumpTo(buildCamera(instance))

    setMap(instance)
    return () => {
      instance.remove()
      setMap(null)
    }
  }, [containerRef, buildCamera])

  return map
}

// Forces a re-render whenever the map's container resizes — MapLibre's own
// internal ResizeObserver already surfaces this as a 'resize' event, this
// just gives components a reason to recompute anything pixel-based (like a
// projected marker position) that depends on the container's size.
function useMapResizeSignal(map) {
  const [, bump] = useReducer((n) => n + 1, 0)
  useEffect(() => {
    if (!map) return
    map.on('resize', bump)
    return () => map.off('resize', bump)
  }, [map])
}

// Projects a lat/lng into pixel coordinates relative to the map's
// container. Computed directly during render (not via an effect+setState —
// map.project is a cheap, synchronous, pure-given-the-current-camera call)
// so the only thing that needs a subscription is knowing *when* to
// recompute it, which is what useMapResizeSignal is for.
function useProjectedPoint(map, latLng) {
  useMapResizeSignal(map)
  if (!map || !latLng) return null
  const projected = map.project([latLng.lng, latLng.lat])
  return { x: projected.x, y: projected.y }
}

function DebugTargetMarker({ map, position }) {
  const point = useProjectedPoint(map, position)
  if (!point) return null

  return (
    <div
      className="absolute z-10 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-gold bg-white shadow-2xl"
      style={{ left: point.x, top: point.y }}
    >
      <img src="/assets/icons/chest.png" alt="Treasure location" className="size-6" />
    </div>
  )
}

// Dragging is implemented entirely in pixel space against the static
// (non-panning) map: the pointer's raw client delta from drag-start is
// added to the marker's starting on-screen pixel position, clamped to the
// container's box, then converted back to lat/lng once via map.unproject().
// This never touches the map's camera, so there's nothing for it to "follow
// the marker" with — unlike native marker dragging (as Google Maps does
// it), which hands control to the SDK and can auto-pan near the edges.
function DraggableTreasureMarker({ map, containerRef, position, onMoved }) {
  const point = useProjectedPoint(map, position)
  const dragRef = useRef(null)

  function handlePointerDown(e) {
    if (!map || !containerRef.current) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPoint: map.project([position.lng, position.lat]),
    }
  }

  function handlePointerMove(e) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId || !map || !containerRef.current) return
    e.stopPropagation()

    const dx = e.clientX - drag.startClientX
    const dy = e.clientY - drag.startClientY
    const rect = containerRef.current.getBoundingClientRect()
    const clamped = clampPointToRect(
      { x: drag.startPoint.x + dx, y: drag.startPoint.y + dy },
      rect,
    )
    const lngLat = map.unproject([clamped.x, clamped.y])
    onMoved({ lat: lngLat.lat, lng: lngLat.lng })
  }

  function handlePointerUp(e) {
    if (dragRef.current?.pointerId === e.pointerId) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    dragRef.current = null
  }

  if (!point) return null

  return (
    <div
      className="absolute z-10 flex size-16 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center justify-center [-webkit-touch-callout:none] select-none outline-none active:cursor-grabbing"
      style={{ left: point.x, top: point.y }}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <span className="absolute size-14 rounded-full bg-blue-500/20" />
      <span className="relative z-10 size-5 rounded-full border-[3px] border-white bg-blue-600 shadow-[0_1px_4px_rgba(0,0,0,0.4)]" />
    </div>
  )
}

// Everything that depends on `treasurePosition` starting fresh whenever the
// hunt changes (or clears) lives here, keyed by the hunt's id from
// HomePage below — remounting on that key change is what resets
// `treasurePosition` back to the new center, rather than an effect doing
// it via setState (which only cascades renders for no benefit, since a
// fresh mount achieves the same reset for free).
function HuntMap({ activeHunt, debugRevealHuntTarget }) {
  const navigate = useNavigate()
  const { clearHunt } = useHunt()
  const { markFound } = useTreasureStatus()

  const startPosition = activeHunt?.region ?? LAGOS_CENTER
  const [treasurePosition, setTreasurePosition] = useState(startPosition)
  // Guards against firing the /find request twice — the win-condition
  // effect below can re-run (e.g. another drag) while the first call is
  // still in flight, since nothing synchronous stops it before then.
  const completingHuntRef = useRef(false)

  const containerRef = useRef(null)
  // A fixed HUNT_ZOOM can't guarantee the target (300-450m from the hunt's
  // start, by design) actually fits on a static, non-panning screen — a
  // jitter angle that happens to run along the screen's narrower dimension
  // could still push the target off-screen at any single hand-picked zoom.
  // cameraForBounds is MapLibre's own tool for exactly this: given both
  // points, it accounts for the real container's aspect ratio itself and
  // returns a center/zoom guaranteed to fit both, so the hunt is never
  // accidentally unwinnable on a smaller or unusually-shaped viewport.
  const buildCamera = useCallback(
    (mapInstance) => {
      if (!activeHunt) {
        return { center: [LAGOS_CENTER.lng, LAGOS_CENTER.lat], zoom: IDLE_ZOOM }
      }

      const bounds = new maplibregl.LngLatBounds()
        .extend([activeHunt.region.lng, activeHunt.region.lat])
        .extend([activeHunt.target.lng, activeHunt.target.lat])
      // Asymmetric so neither point lands under the "Hunting: …" banner up
      // top or the nav icon down at the bottom — not just anywhere on
      // screen, but clear of the UI chrome sitting on top of the map.
      const fitted = mapInstance.cameraForBounds(bounds, {
        padding: { top: 110, bottom: 170, left: 70, right: 70 },
        maxZoom: HUNT_ZOOM,
      })

      return fitted
        ? { center: fitted.center, zoom: Math.min(fitted.zoom, HUNT_ZOOM) }
        : { center: [activeHunt.region.lng, activeHunt.region.lat], zoom: HUNT_ZOOM }
    },
    [activeHunt],
  )
  const map = useStaticMap(containerRef, buildCamera)

  useEffect(() => {
    if (!activeHunt) return
    if (distanceMeters(treasurePosition, activeHunt.target) > HUNT_WIN_THRESHOLD_M) return
    if (completingHuntRef.current) return
    completingHuntRef.current = true

    const treasureId = activeHunt.treasureId
    const treasureName = activeHunt.name

    async function completeHunt() {
      try {
        await markTreasureFoundRequest(treasureId)
        markFound(treasureId)
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
  }, [treasurePosition, activeHunt, clearHunt, navigate, markFound])

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 h-full w-full bg-navy-deep" />

      {map && (
        <DraggableTreasureMarker
          map={map}
          containerRef={containerRef}
          position={treasurePosition}
          onMoved={setTreasurePosition}
        />
      )}
      {map && debugRevealHuntTarget && activeHunt && (
        <DebugTargetMarker map={map} position={activeHunt.target} />
      )}
      {map && (
        <DirectionalPad
          map={map}
          containerRef={containerRef}
          position={treasurePosition}
          onMove={setTreasurePosition}
        />
      )}
    </>
  )
}

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  // TEMP: reveals the hunt's exact hidden spot on the map for testing the
  // celebration flow. Remove this along with the debug toggle UI below once
  // done testing.
  const [debugRevealHuntTarget, setDebugRevealHuntTarget] = useState(true)
  const { pathname } = useLocation()
  const { activeHunt, clearHunt } = useHunt()
  const { unreadCount } = useMessages()

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <HuntMap
        key={activeHunt?.treasureId ?? 'idle'}
        activeHunt={activeHunt}
        debugRevealHuntTarget={debugRevealHuntTarget}
      />

      <div className="absolute top-4 left-4 z-10 flex items-center gap-1 rounded-full bg-navy-deep/55 py-1 pr-4 pl-1.5 text-white backdrop-blur-sm">
        <img src="/assets/green_bg_logo.png" alt="Treasure Go" className="h-7 w-7 shrink-0 object-contain" />
        <span className="text-sm font-bold tracking-wide whitespace-nowrap uppercase">
          <span className="text-white">Treasure</span> <span className="text-gold">Go</span>
        </span>
      </div>

      {activeHunt && (
        <div className="absolute top-16 left-1/2 z-10 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-navy-deep/80 py-2 pr-2 pl-4 text-white backdrop-blur-sm md:top-4">
          <span className="min-w-0 truncate text-xs font-semibold">
            Hunting: {activeHunt.name}
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
              <NavIcon
                icon={Icon}
                unreadBadge={to === '/messages' ? unreadCount : 0}
                className="size-4.5"
              />
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
