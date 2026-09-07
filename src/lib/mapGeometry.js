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
