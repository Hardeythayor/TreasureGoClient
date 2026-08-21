import { useEffect, useRef } from 'react'
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import { MapPin, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

export const DEFAULT_CENTER = { lat: 6.5244, lng: 3.3792 } // Lagos

function PlaceSearchInput({ onPlaceSelect }) {
  const places = useMapsLibrary('places')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!places || !inputRef.current) return

    const autocomplete = new places.Autocomplete(inputRef.current, {
      fields: ['name', 'formatted_address', 'geometry'],
    })

    function handlePlaceChanged() {
      const place = autocomplete.getPlace()
      const loc = place.geometry?.location
      if (!loc) return
      onPlaceSelect({
        name: place.name || place.formatted_address || '',
        location: { lat: loc.lat(), lng: loc.lng() },
      })
    }

    autocomplete.addListener('place_changed', handlePlaceChanged)
    return () => {
      window.google?.maps?.event?.clearInstanceListeners(autocomplete)
    }
  }, [places, onPlaceSelect])

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input ref={inputRef} placeholder="Search for a place…" className="pl-8" />
    </div>
  )
}

// Recenters the map whenever the picked location changes, whether that
// change came from a place search or from dragging the marker — same
// "pan to the new spot" convention the customer-facing hunt map already
// uses after a drag.
function MapPanner({ position }) {
  const map = useMap()
  useEffect(() => {
    if (map && position) map.panTo(position)
  }, [map, position])
  return null
}

function LocationMarker({ position, onMoved }) {
  return (
    <AdvancedMarker
      position={position}
      draggable
      anchorLeft="-50%"
      anchorTop="-50%"
      onDragEnd={(e) => {
        const latLng = e.latLng
        if (!latLng) return
        onMoved({ lat: latLng.lat(), lng: latLng.lng() })
      }}
    >
      <div className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-destructive text-white shadow-lg">
        <MapPin className="size-4" fill="currentColor" />
      </div>
    </AdvancedMarker>
  )
}

// Search a place to jump the map there, then fine-tune by dragging the
// marker to the exact spot the treasure should be hidden. Reports the
// marker's current position back via onLocationChange (used for the
// request's `location`), and the searched place's name via onPlaceSelect
// (used to prefill the request's `region`).
function TreasureLocationPicker({ location, onLocationChange, onPlaceSelect }) {
  const position = location ?? DEFAULT_CENTER

  return (
    <div className="space-y-2">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <PlaceSearchInput
          onPlaceSelect={(place) => {
            onLocationChange(place.location)
            onPlaceSelect(place.name)
          }}
        />
        <Map
          mapId="ADMIN_TREASURE_PICKER_MAP"
          defaultCenter={position}
          defaultZoom={13}
          gestureHandling="greedy"
          // Individual control flags instead of disableDefaultUI + a
          // re-enable override — the override doesn't reliably take effect
          // when set alongside disableDefaultUI in the same options object.
          zoomControl={false}
          mapTypeControl={false}
          streetViewControl={false}
          rotateControl={false}
          scaleControl={false}
          fullscreenControl
          className="h-64 w-full overflow-hidden rounded-lg"
        >
          <LocationMarker position={position} onMoved={onLocationChange} />
          <MapPanner position={location} />
        </Map>
      </APIProvider>
      <p className="text-[11px] text-muted-foreground">
        Search for a place to jump there, then drag the pin to the exact spot — currently{' '}
        {position.lat.toFixed(5)}, {position.lng.toFixed(5)}.
      </p>
    </div>
  )
}

export default TreasureLocationPicker
