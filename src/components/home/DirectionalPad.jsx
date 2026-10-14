import { useEffect, useRef } from 'react'
import { Navigation2 } from 'lucide-react'
import { clampPointToRect } from '@/lib/mapGeometry'

// GPS-drift-like wander (how Google Maps'/Geocaching's own blue dot
// subtly shifts while stationary) — measured against a real recording of
// the Geocaching app's dot: per-step distance here already matches it
// (~7px), but a *fresh independent random angle every tick* is a plain
// random walk, which statistically cancels itself out and keeps the
// marker clustered in one small spot indefinitely. The real dot instead
// moves in smooth, continuous arcs, because its direction persists and
// only drifts a little from one tick to the next — a correlated random
// walk, not an independent one. HEADING_JITTER_RAD is how far that
// heading is allowed to turn per tick; MAX_STEP_PX is unchanged.
const MAX_STEP_PX = 7
const HEADING_JITTER_RAD = 0.6
const TICK_MS = 1000

function DirectionalPad({ map, containerRef, position, onMove, onWander }) {
  const intervalRef = useRef(null)
  // Always holds the latest position without needing it in nudge's deps —
  // nudge is called from a setInterval closure that's only created once
  // per press, so it needs a live reference rather than a stale prop.
  const positionRef = useRef(position)
  // Persists across ticks within one press so direction carries forward
  // instead of resetting to a fresh random angle each time; re-rolled on
  // every new press so each hold wanders a different way.
  const headingRef = useRef(0)

  useEffect(() => {
    positionRef.current = position
  }, [position])

  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  function nudge() {
    if (!map || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const current = map.project([positionRef.current.lng, positionRef.current.lat])
    headingRef.current += (Math.random() - 0.5) * HEADING_JITTER_RAD
    const distance = Math.random() * MAX_STEP_PX
    const next = clampPointToRect(
      {
        x: current.x + Math.cos(headingRef.current) * distance,
        y: current.y + Math.sin(headingRef.current) * distance,
      },
      rect,
    )
    const lngLat = map.unproject([next.x, next.y])
    onMove({ lat: lngLat.lat, lng: lngLat.lng })
  }

  function startWandering() {
    onWander()
    headingRef.current = Math.random() * Math.PI * 2
    nudge()
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(nudge, TICK_MS)
  }

  function stopWandering() {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  return (
    <div className="fixed inset-x-0 bottom-24 z-10 mx-auto flex w-fit sm:bottom-8">
      <button
        type="button"
        aria-label="Simulate movement"
        className="flex size-16 touch-none items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-black/5 transition-transform select-none active:scale-90 active:shadow-md"
        onMouseDown={startWandering}
        onMouseUp={stopWandering}
        onMouseLeave={stopWandering}
        onTouchStart={(e) => {
          e.preventDefault()
          startWandering()
        }}
        onTouchEnd={stopWandering}
        onTouchCancel={stopWandering}
      >
        <Navigation2 className="size-7 rotate-90 text-blue-600" fill="currentColor" />
      </button>
    </div>
  )
}

export default DirectionalPad
