import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { maplibregl, buildSatelliteStyle } from '@/lib/maplibreClient'

export const DEFAULT_CENTER = { lat: 6.5244, lng: 3.3792 } // Lagos

// Free, keyless geocoder (OpenStreetMap Nominatim) used only for this admin
// "jump to a place" search box. Fine for occasional internal-tool use —
// swap for a paid geocoding provider if usage grows past Nominatim's
// fair-use limits (see their usage policy).
async function searchPlaces(query) {
  if (!query.trim()) return []
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '5')

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return []
  const results = await res.json()
  return results.map((r) => ({
    name: r.display_name,
    location: { lat: Number(r.lat), lng: Number(r.lon) },
  }))
}

function PlaceSearchInput({ onPlaceSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    // Both branches set state from inside the timeout callback (not the
    // effect body directly) so an empty query still clears results after
    // the same debounce delay, rather than synchronously mid-effect.
    debounceRef.current = setTimeout(async () => {
      const trimmed = query.trim()
      if (!trimmed) {
        setResults([])
        return
      }
      const places = await searchPlaces(trimmed)
      setResults(places)
      setOpen(true)
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search for a place…"
        className="pl-8"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-white shadow-lg">
          {results.map((place) => (
            <li key={`${place.location.lat},${place.location.lng}`}>
              <button
                type="button"
                className="block w-full truncate px-3 py-2 text-left text-xs hover:bg-muted"
                // onMouseDown (not onClick) so this fires before the input's
                // onBlur closes the list out from under it.
                onMouseDown={(e) => {
                  e.preventDefault()
                  onPlaceSelect(place)
                  setQuery(place.name)
                  setOpen(false)
                }}
              >
                {place.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Search a place to jump the map there, then fine-tune by dragging the
// marker to the exact spot the treasure should be hidden. Reports the
// marker's current position back via onLocationChange (used for the
// request's `location`), and the searched place's name via onPlaceSelect
// (used to prefill the request's `region`).
function TreasureLocationPicker({ location, onLocationChange, onPlaceSelect }) {
  const position = location ?? DEFAULT_CENTER
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  // Created once — unlike the customer-facing hunt map, this one stays
  // fully interactive (admins need to freely pan/zoom to find a spot), so
  // subsequent position changes are applied imperatively below rather than
  // by recreating the map.
  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildSatelliteStyle(),
      center: [position.lng, position.lat],
      zoom: 13,
      attributionControl: false,
    })

    const el = document.createElement('div')
    el.className =
      'flex size-8 items-center justify-center rounded-full border-2 border-white bg-destructive text-white shadow-lg'
    el.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>'

    const marker = new maplibregl.Marker({ element: el, draggable: true, anchor: 'bottom' })
      .setLngLat([position.lng, position.lat])
      .addTo(map)

    marker.on('dragend', () => {
      const lngLat = marker.getLngLat()
      onLocationChange({ lat: lngLat.lat, lng: lngLat.lng })
    })

    mapRef.current = map
    markerRef.current = marker

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keeps the marker (and, when the change came from search, the camera)
  // in sync with the position prop without recreating the map — mirrors
  // the "pan to the new spot" convention the customer-facing hunt map used
  // to have, whether the change came from a search or a drag.
  useEffect(() => {
    if (!markerRef.current) return
    const current = markerRef.current.getLngLat()
    if (current.lat === position.lat && current.lng === position.lng) return
    markerRef.current.setLngLat([position.lng, position.lat])
    mapRef.current?.panTo([position.lng, position.lat])
  }, [position.lat, position.lng])

  return (
    <div className="space-y-2">
      <PlaceSearchInput
        onPlaceSelect={(place) => {
          onLocationChange(place.location)
          onPlaceSelect(place.name)
        }}
      />
      <div ref={containerRef} className="h-64 w-full overflow-hidden rounded-lg" />
      <p className="text-[11px] text-muted-foreground">
        Search for a place to jump there, then drag the pin to the exact spot — currently{' '}
        {position.lat.toFixed(5)}, {position.lng.toFixed(5)}.
      </p>
    </div>
  )
}

export default TreasureLocationPicker
