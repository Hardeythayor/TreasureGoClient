import { useEffect, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEP_PX = 60
const REPEAT_MS = 120
const GLIDE_MS = 220

function offsetLatLng(map, latLng, dx, dy) {
  const projection = map.getProjection()
  if (!projection || !window.google) return latLng

  const scale = 2 ** map.getZoom()
  const worldPoint = projection.fromLatLngToPoint(
    new window.google.maps.LatLng(latLng.lat, latLng.lng),
  )
  const newWorldPoint = new window.google.maps.Point(
    worldPoint.x + dx / scale,
    worldPoint.y + dy / scale,
  )
  const newLatLng = projection.fromPointToLatLng(newWorldPoint)
  return newLatLng ? { lat: newLatLng.lat(), lng: newLatLng.lng() } : latLng
}

const DIRECTIONS = [
  { dir: 'up', icon: ChevronUp, dx: 0, dy: -STEP_PX, cell: 'col-start-2 row-start-1' },
  { dir: 'left', icon: ChevronLeft, dx: -STEP_PX, dy: 0, cell: 'col-start-1 row-start-2' },
  { dir: 'right', icon: ChevronRight, dx: STEP_PX, dy: 0, cell: 'col-start-3 row-start-2' },
  { dir: 'down', icon: ChevronDown, dx: 0, dy: STEP_PX, cell: 'col-start-2 row-start-3' },
]

// Kept outside the component so the impure performance.now()/rAF loop isn't
// lexically nested inside render (only ever invoked from event handlers).
function animateGlide({ map, visualRef, animRef, onMove, to }) {
  cancelAnimationFrame(animRef.current)
  const from = visualRef.current
  const startTime = performance.now()

  function step(now) {
    const t = Math.min((now - startTime) / GLIDE_MS, 1)
    const current = {
      lat: from.lat + (to.lat - from.lat) * t,
      lng: from.lng + (to.lng - from.lng) * t,
    }
    visualRef.current = current
    onMove(current)
    map.setCenter(current)
    if (t < 1) {
      animRef.current = requestAnimationFrame(step)
    }
  }
  animRef.current = requestAnimationFrame(step)
}

function DirectionalPad({ position, onMove }) {
  const map = useMap()
  const visualRef = useRef(position)
  const animRef = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    visualRef.current = position
  }, [position])

  useEffect(() => {
    return () => {
      // Intentionally read fresh at unmount — animRef holds whichever rAF id
      // is currently in flight, not a DOM node that could go stale.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      cancelAnimationFrame(animRef.current)
      clearInterval(intervalRef.current)
    }
  }, [])

  function nudge(dx, dy) {
    if (!map) return
    animateGlide({
      map,
      visualRef,
      animRef,
      onMove,
      to: offsetLatLng(map, visualRef.current, dx, dy),
    })
  }

  function startNudging(dx, dy) {
    nudge(dx, dy)
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => nudge(dx, dy), REPEAT_MS)
  }

  function stopNudging() {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  return (
    <div className="fixed inset-x-0 bottom-24 z-10 mx-auto w-fit sm:bottom-8">
      <div className="relative grid size-24 grid-cols-3 grid-rows-3 rounded-full bg-white shadow-xl ring-1 ring-black/5">
        <div className="col-start-2 row-start-2 flex items-center justify-center">
          <span className="size-6 rounded-full bg-linear-to-br from-navy-mid to-navy-deep shadow-inner" />
        </div>
        {DIRECTIONS.map(({ dir, icon: Icon, dx, dy, cell }) => (
          <button
            key={dir}
            type="button"
            aria-label={`Pan ${dir}`}
            className={cn(
              'flex touch-none items-center justify-center text-navy-mid transition-colors hover:bg-black/5 active:bg-black/10',
              cell,
            )}
            onMouseDown={() => startNudging(dx, dy)}
            onMouseUp={stopNudging}
            onMouseLeave={stopNudging}
            onTouchStart={(e) => {
              e.preventDefault()
              startNudging(dx, dy)
            }}
            onTouchEnd={stopNudging}
            onTouchCancel={stopNudging}
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>
    </div>
  )
}

export default DirectionalPad
