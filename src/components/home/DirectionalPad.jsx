import { useEffect, useRef } from 'react'
import { Navigation2 } from 'lucide-react'
import { clampPointToRect } from '@/lib/mapGeometry'

// Mimics a person actually exploring a confined space: a new direction
// every couple of steps, not one single-direction leg held until it
// happens to reach somewhere far off (that read as moving "linearly" for
// too long, only turning when the button was released and pressed again).
// Each new direction still aims at the middle (with a little jitter) of a
// grid cell this press hasn't been aimed at yet — not just a plain random
// heading — so the *choice* of direction is still biased toward parts of
// the screen this hold hasn't explored yet, even though a given burst is
// too short to actually reach a far cell. Every cell gets aimed at before
// any repeat; once they all have, the grid resets and a new sweep begins.
// A little heading wobble keeps each 2-step burst from being a perfectly
// straight line, and hitting the screen edge ends a burst immediately
// (like a person reaching a wall and turning) rather than pinning the
// marker there. Step distance is kept in a narrow band, not 0-to-max, so
// the pace itself reads as steady tick to tick; TICK_MS (the timing
// itself) is unchanged.
const STEP_MIN_PX = 9
const STEP_MAX_PX = 13
const HEADING_WOBBLE_RAD = 0.3
const GRID_MARGIN_PX = 40
const GRID_TOTAL_CELLS = 20
const LEG_TICKS = 2
const TICK_MS = 1000

function DirectionalPad({ map, containerRef, position, onMove, onWander }) {
  const intervalRef = useRef(null)
  // Always holds the latest position without needing it in nudge's deps —
  // nudge is called from a setInterval closure that's only created once
  // per press, so it needs a live reference rather than a stale prop.
  const positionRef = useRef(position)
  const headingRef = useRef(0)
  // Ticks left in the current direction before a new one is rolled — 0 (or
  // less) on the first nudge() of a press forces that first call to roll
  // one immediately, same as every leg boundary after it, and the same
  // thing clamping forces early when a leg runs into the screen edge.
  const legTicksRemainingRef = useRef(0)
  // Grid cells this press has already aimed a leg at — see pickUnvisitedTarget.
  const visitedCellsRef = useRef(new Set())

  useEffect(() => {
    positionRef.current = position
  }, [position])

  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  function pickUnvisitedTarget(rect) {
    const cols = Math.max(3, Math.round(Math.sqrt((rect.width / rect.height) * GRID_TOTAL_CELLS)))
    const rows = Math.max(3, Math.round(GRID_TOTAL_CELLS / cols))
    const totalCells = cols * rows

    if (visitedCellsRef.current.size >= totalCells) {
      visitedCellsRef.current.clear()
    }
    let cell
    do {
      cell = Math.floor(Math.random() * totalCells)
    } while (visitedCellsRef.current.has(cell))
    visitedCellsRef.current.add(cell)

    const col = cell % cols
    const row = Math.floor(cell / cols)
    const cellWidth = Math.max(rect.width - GRID_MARGIN_PX * 2, 1) / cols
    const cellHeight = Math.max(rect.height - GRID_MARGIN_PX * 2, 1) / rows

    return {
      x: GRID_MARGIN_PX + (col + 0.5 + (Math.random() - 0.5) * 0.6) * cellWidth,
      y: GRID_MARGIN_PX + (row + 0.5 + (Math.random() - 0.5) * 0.6) * cellHeight,
    }
  }

  function nudge() {
    if (!map || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const current = map.project([positionRef.current.lng, positionRef.current.lat])

    if (legTicksRemainingRef.current <= 0) {
      const target = pickUnvisitedTarget(rect)
      headingRef.current = Math.atan2(target.y - current.y, target.x - current.x)
      legTicksRemainingRef.current = LEG_TICKS
    } else {
      headingRef.current += (Math.random() - 0.5) * HEADING_WOBBLE_RAD
    }

    const distance = STEP_MIN_PX + Math.random() * (STEP_MAX_PX - STEP_MIN_PX)
    const raw = {
      x: current.x + Math.cos(headingRef.current) * distance,
      y: current.y + Math.sin(headingRef.current) * distance,
    }
    const next = clampPointToRect(raw, rect)

    legTicksRemainingRef.current =
      next.x !== raw.x || next.y !== raw.y ? 0 : legTicksRemainingRef.current - 1

    const lngLat = map.unproject([next.x, next.y])
    onMove({ lat: lngLat.lat, lng: lngLat.lng })
  }

  function startWandering() {
    onWander()
    legTicksRemainingRef.current = 0
    visitedCellsRef.current.clear()
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
