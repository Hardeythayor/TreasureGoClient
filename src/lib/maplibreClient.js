// maplibre-gl has no default export — only named ones (Map, Marker,
// addProtocol, ...) — so this collects them into a namespace object, kept
// as `maplibregl` so call sites (new maplibregl.Map(...), etc.) read the
// same as the more familiar default-export convention.
import * as maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'

// Registered once for the whole app (not per-map-instance) so any map can
// reference a `pmtiles://...` source URL — this is what lets a single
// downloaded .pmtiles archive (vector OR raster tiles) be read directly by
// MapLibre without a tile server.
let protocolRegistered = false
function ensurePmtilesProtocol() {
  if (protocolRegistered) return
  const protocol = new Protocol()
  maplibregl.addProtocol('pmtiles', protocol.tile)
  protocolRegistered = true
}

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY ?? ''
// A locally downloaded/self-hosted raster satellite archive — the genuinely
// offline-capable path (see the licensing note in buildSatelliteStyle).
const SATELLITE_PMTILES_URL = import.meta.env.VITE_SATELLITE_PMTILES_URL ?? ''
// 'esri' (default) or 'maptiler' — lets you switch providers without
// touching code. Esri needs no key at all, so it's the zero-setup default;
// MapTiler is only used if you deliberately opt into it here AND have set
// VITE_MAPTILER_KEY.
const SATELLITE_PROVIDER = import.meta.env.VITE_SATELLITE_PROVIDER || 'esri'

// Builds a minimal MapLibre style for the satellite raster layer. Priority:
// 1. A locally-downloaded PMTiles archive — works fully offline once cached.
// 2. Esri World Imagery — free, no API key, generally the closest free
//    match to Google's own satellite resolution (also Maxar-sourced in a
//    lot of areas, though real coverage/resolution still varies by region —
//    there's no way to guarantee a match without checking the specific spot).
// 3. MapTiler's hosted satellite tiles, only if explicitly selected via
//    VITE_SATELLITE_PROVIDER=maptiler (plus a key) — kept available in case
//    Esri's coverage turns out worse for a given region.
// This never returns null — Esri needs no configuration, so there's always
// a usable default.
export function buildSatelliteStyle() {
  ensurePmtilesProtocol()

  let tileSource
  if (SATELLITE_PMTILES_URL) {
    tileSource = { type: 'raster', url: `pmtiles://${SATELLITE_PMTILES_URL}`, tileSize: 256 }
  } else if (SATELLITE_PROVIDER === 'maptiler' && MAPTILER_KEY) {
    tileSource = {
      type: 'raster',
      tiles: [`https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`],
      tileSize: 256,
      attribution: '© MapTiler © OpenStreetMap contributors',
    }
  } else {
    tileSource = {
      type: 'raster',
      // Esri's tile path is {z}/{y}/{x} (row before column) — the reverse
      // of the {z}/{x}/{y} order every other source here uses.
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    }
  }

  return {
    version: 8,
    sources: { satellite: tileSource },
    layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
  }
}

export { maplibregl }
