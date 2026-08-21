import { createContext, useCallback, useContext, useState } from 'react'

const HUNT_KEY = 'treasure-go:active-hunt'
const EARTH_RADIUS_M = 6371000

// The band the hunt's starting point is placed within, relative to the
// treasure's real (hidden) spot — a floor as well as a ceiling, so the
// start is never close enough for an easy first-guess win, and how close
// the marker needs to get before it counts as found.
export const HUNT_JITTER_MIN_M = 300
export const HUNT_JITTER_M = 450
export const HUNT_WIN_THRESHOLD_M = 50
export const HUNT_ZOOM = 17

function toRad(deg) {
  return (deg * Math.PI) / 180
}

export function distanceMeters(a, b) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

export function getProximityLabel(distanceMeters) {
  if (distanceMeters <= 100) return '🔥 Burning hot'
  if (distanceMeters <= 175) return '🌡️ Warm'
  if (distanceMeters <= HUNT_JITTER_M) return '❄️ Cold'
  return '🥶 Freezing'
}

// Distance is sampled from a ring between minRadiusMeters and
// maxRadiusMeters, not from 0 — a plain `Math.random() * radiusMeters` would
// cluster points toward the center, frequently landing the start right on
// top of the target and letting players "win" without actually searching.
function jitterLocation(center, minRadiusMeters, maxRadiusMeters) {
  const angle = Math.random() * Math.PI * 2
  const radius = minRadiusMeters + Math.random() * (maxRadiusMeters - minRadiusMeters)
  const dLat = (radius * Math.cos(angle)) / 111320
  const dLng = (radius * Math.sin(angle)) / (111320 * Math.cos(toRad(center.lat)))
  return { lat: center.lat + dLat, lng: center.lng + dLng }
}

function readHunt() {
  try {
    const raw = localStorage.getItem(HUNT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const HuntContext = createContext(null)

export function HuntProvider({ children }) {
  const [activeHunt, setActiveHunt] = useState(readHunt)

  // `treasure.location` is the real secret spot to find (the offline demo
  // data and the /treasures/{id}/start-hunt response both hand this over
  // directly as `target`) — `region` is just a random nearby point to start
  // the marker/map at, so the hunt isn't already won the moment it starts.
  const startHunt = useCallback((treasure) => {
    const target = treasure.location
    const hunt = {
      treasureId: treasure.id,
      name: treasure.name,
      region: jitterLocation(target, HUNT_JITTER_MIN_M, HUNT_JITTER_M),
      target,
    }
    localStorage.setItem(HUNT_KEY, JSON.stringify(hunt))
    setActiveHunt(hunt)
  }, [])

  const clearHunt = useCallback(() => {
    localStorage.removeItem(HUNT_KEY)
    setActiveHunt(null)
  }, [])

  return (
    <HuntContext.Provider value={{ activeHunt, startHunt, clearHunt }}>
      {children}
    </HuntContext.Provider>
  )
}

export function useHunt() {
  const ctx = useContext(HuntContext)
  if (!ctx) throw new Error('useHunt must be used within HuntProvider')
  return ctx
}
