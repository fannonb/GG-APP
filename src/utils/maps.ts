export interface MapLocationInput {
  name: string
  address: string
  lat?: number | null
  lng?: number | null
}

export function hasMappableLocation(location: MapLocationInput) {
  return Boolean(
    location.address?.trim()
    || (location.lat != null && location.lng != null),
  )
}

/** Opens Google Maps directions. Uses coordinates when available, otherwise address search. */
export function buildGoogleMapsDirectionsUrl(location: MapLocationInput) {
  const params = new URLSearchParams({ api: '1' })

  if (location.lat != null && location.lng != null) {
    params.set('destination', `${location.lat},${location.lng}`)
  } else if (location.address?.trim()) {
    const query = location.name
      ? `${location.name}, ${location.address.trim()}`
      : location.address.trim()
    params.set('destination', query)
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/** Opens Google Maps at the provider location (view/search). */
export function buildGoogleMapsViewUrl(location: MapLocationInput) {
  const params = new URLSearchParams({ api: '1' })

  if (location.lat != null && location.lng != null) {
    params.set('query', `${location.lat},${location.lng}`)
  } else if (location.address?.trim()) {
    const query = location.name
      ? `${location.name}, ${location.address.trim()}`
      : location.address.trim()
    params.set('query', query)
  }

  return `https://www.google.com/maps/search/?${params.toString()}`
}

export function buildOpenStreetMapEmbedUrl(lat: number, lng: number) {
  const pad = 0.012
  const bbox = `${lng - pad},${lat - pad},${lng + pad},${lat + pad}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`
}
