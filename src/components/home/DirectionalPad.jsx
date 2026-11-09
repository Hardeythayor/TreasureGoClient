import { useEffect, useRef } from 'react'
import { Navigation2 } from 'lucide-react'
import { clampPointToRect } from '@/lib/mapGeometry'

// Mimics a person actually exploring a confined space: a new direction
// every few steps, not one single-direction leg held until it happens to
// reach somewhere far off (that read as moving "linearly" for too long,
// only turning when the button was released and pressed again) — but also
// not whipping straight back the way it just came, which no real walker
// does either. Each new direction aims at the middle (with a little
// jitter) of a grid cell this press hasn't been aimed at yet, filtered to
// exclude anything that would reverse the REVERSAL_LOCKOUT_TICKS-tick
// rolling average heading — so the *choice* of direction is biased toward
// unexplored parts of the screen, while still ruling out doubling straight
// back. Every cell gets aimed at before any repeat; once they all have,
// the grid resets and a new sweep begins. A little heading wobble keeps
// each burst from being a perfectly straight line, and hitting the screen
// edge ends a burst immediately (like a person reaching a wall and
// turning) rather than pinning the marker there. Step distance is kept in
// a narrow band, not 0-to-max, so the pace itself reads as steady tick to
// tick; TICK_MS (the timing itself) is unchanged.
const STEP_MIN_PX = 9
const STEP_MAX_PX = 13
const HEADING_WOBBLE_RAD = 0.3
const GRID_MARGIN_PX = 40
const GRID_TOTAL_CELLS = 20
const LEG_TICKS = 3
const REVERSAL_LOCKOUT_TICKS = 8
const REVERSAL_ANGLE_THRESHOLD_RAD = (135 * Math.PI) / 180
const TICK_MS = 1000

function angleDiff(a, b) {
  const d = Math.abs(a - b) % (Math.PI * 2)
  return d > Math.PI ? Math.PI * 2 - d : d
}

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
  // The heading actually used on each of the last REVERSAL_LOCKOUT_TICKS
  // ticks (oldest first) — its circular mean is what a new direction gets
  // checked against to rule out a near-180° reversal.
  const headingHistoryRef = useRef([])

  useEffect(() => {
    positionRef.current = position
  }, [position])

  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  function recentAverageHeading() {
    if (headingHistoryRef.current.length === 0) return null
    const sum = headingHistoryRef.current.reduce(
      (acc, h) => ({ x: acc.x + Math.cos(h), y: acc.y + Math.sin(h) }),
      { x: 0, y: 0 },
    )
    return Math.atan2(sum.y, sum.x)
  }

  function pickUnvisitedTarget(rect, current) {
    const cols = Math.max(3, Math.round(Math.sqrt((rect.width / rect.height) * GRID_TOTAL_CELLS)))
    const rows = Math.max(3, Math.round(GRID_TOTAL_CELLS / cols))
    const totalCells = cols * rows

    if (visitedCellsRef.current.size >= totalCells) {
      visitedCellsRef.current.clear()
    }

    const cellWidth = Math.max(rect.width - GRID_MARGIN_PX * 2, 1) / cols
    const cellHeight = Math.max(rect.height - GRID_MARGIN_PX * 2, 1) / rows
    const cellCenter = (cell) => ({
      x: GRID_MARGIN_PX + (cell % cols) * cellWidth + cellWidth / 2,
      y: GRID_MARGIN_PX + Math.floor(cell / cols) * cellHeight + cellHeight / 2,
    })

    const unvisited = []
    for (let cell = 0; cell < totalCells; cell++) {
      if (!visitedCellsRef.current.has(cell)) unvisited.push(cell)
    }

    const recentHeading = recentAverageHeading()
    const nonReversing =
      recentHeading === null
        ? unvisited
        : unvisited.filter((cell) => {
            const center = cellCenter(cell)
            const heading = Math.atan2(center.y - current.y, center.x - current.x)
            return angleDiff(heading, recentHeading) <= REVERSAL_ANGLE_THRESHOLD_RAD
          })
    // Falls back to any unvisited cell (even a reversing one) rather than
    // staying permanently blocked — can happen near the end of a sweep,
    // when the only cells left all happen to sit behind the marker.
    const pool = nonReversing.length > 0 ? nonReversing : unvisited

    const cell = pool[Math.floor(Math.random() * pool.length)]
    visitedCellsRef.current.add(cell)
    const center = cellCenter(cell)

    return {
      x: center.x + (Math.random() - 0.5) * 0.6 * cellWidth,
      y: center.y + (Math.random() - 0.5) * 0.6 * cellHeight,
    }
  }

  function nudge() {
    if (!map || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const current = map.project([positionRef.current.lng, positionRef.current.lat])

    if (legTicksRemainingRef.current <= 0) {
      const target = pickUnvisitedTarget(rect, current)
      headingRef.current = Math.atan2(target.y - current.y, target.x - current.x)
      legTicksRemainingRef.current = LEG_TICKS
    } else {
      headingRef.current += (Math.random() - 0.5) * HEADING_WOBBLE_RAD
    }

    headingHistoryRef.current.push(headingRef.current)
    if (headingHistoryRef.current.length > REVERSAL_LOCKOUT_TICKS) {
      headingHistoryRef.current.shift()
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
    headingHistoryRef.current = []
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
