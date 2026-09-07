import { useEffect, useRef } from 'react'
import { Navigation2 } from 'lucide-react'
import { clampPointToRect } from '@/lib/mapGeometry'

// Small per-tick jitter, not a real "walking" step — this is meant to read
// as GPS-drift-like wander (how Google Maps' own blue dot subtly shifts
// while stationary), not the marker visibly sprinting across the screen.
const MAX_STEP_PX = 7
const TICK_MS = 220

function DirectionalPad({ map, containerRef, position, onMove }) {
  const intervalRef = useRef(null)
  // Always holds the latest position without needing it in nudge's deps —
  // nudge is called from a setInterval closure that's only created once
  // per press, so it needs a live reference rather than a stale prop.
  const positionRef = useRef(position)

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
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * MAX_STEP_PX
    const next = clampPointToRect(
      { x: current.x + Math.cos(angle) * distance, y: current.y + Math.sin(angle) * distance },
      rect,
    )
    const lngLat = map.unproject([next.x, next.y])
    onMove({ lat: lngLat.lat, lng: lngLat.lng })
  }

  function startWandering() {
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
