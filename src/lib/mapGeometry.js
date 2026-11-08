// Pixel-space helper for a static (non-interactive) MapLibre map: since the
// camera never pans/zooms after mount, a lat/lng's on-screen pixel position
// only changes if the container itself resizes. This is the one bit shared
// between the draggable marker (clamp a drag) and the directional pad
// (clamp a nudge glide) — everything else is a plain map.project()/
// map.unproject() call, simple enough to inline where it's used.
export function clampPointToRect(point, rect, margin = 40) {
  return {
    x: Math.min(Math.max(point.x, margin), Math.max(rect.width - margin, margin)),
    y: Math.min(Math.max(point.y, margin), Math.max(rect.height - margin, margin)),
  }
}

// Same normalized Web Mercator coordinates MapLibre uses internally
// (EPSG:3857, in units of "fraction of the world's circumference") — lets a
// camera's zoom be computed from plain lng/lat math, with no live map
// instance involved, so nothing has to visibly jump the camera to test a
// guess.
function mercatorX(lng) {
  return (180 + lng) / 360
}

function mercatorY(lat) {
  return (180 - (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))) / 360
}

// MapLibre/Mapbox GL's fixed world-size unit: the map's full width in
// pixels at zoom 0 is this many pixels, doubling with each zoom level.
const TILE_SIZE = 512

// The hunt screen's draggable marker always starts at `center` and needs to
// render dead in the middle of the screen — so the camera has to be
// centered on it exactly, not fit to both `center` and `target` (which
// would land the camera somewhere between the two instead, off `center`).
// This picks the most-zoomed-in level, up to `maxZoom`, that still keeps
// `target` inside the padded box of a `width`x`height` container once the
// camera is centered on `center` — the same on-screen guarantee a
// `cameraForBounds` fit gives, just anchored to one fixed point.
export function zoomKeepingTargetVisible({ center, target, width, height, padding, maxZoom, minZoom = 1 }) {
  const dx = mercatorX(target.lng) - mercatorX(center.lng)
  const dy = mercatorY(target.lat) - mercatorY(center.lat)

  const halfW = dx >= 0 ? width / 2 - padding.right : width / 2 - padding.left
  const halfH = dy >= 0 ? height / 2 - padding.bottom : height / 2 - padding.top

  let maxWorldSize = Infinity
  if (dx !== 0) maxWorldSize = Math.min(maxWorldSize, Math.abs(halfW / dx))
  if (dy !== 0) maxWorldSize = Math.min(maxWorldSize, Math.abs(halfH / dy))

  const zoom = Math.log2(maxWorldSize / TILE_SIZE)
  return Math.min(maxZoom, Math.max(minZoom, zoom))
}
