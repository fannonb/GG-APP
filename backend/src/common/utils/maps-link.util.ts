import type { Prisma } from '@prisma/client'

/**
 * Google Maps link to a place: its exact pin when it has one, otherwise a search on its address.
 * Returns null when the place has neither.
 */
export function placeMapsUrl(place: {
  lat: Prisma.Decimal | number | null
  lng: Prisma.Decimal | number | null
  address?: string | null
}): string | null {
  if (place.lat != null && place.lng != null) {
    return `https://www.google.com/maps?q=${Number(place.lat)},${Number(place.lng)}`
  }
  const address = place.address?.trim()
  return address ? `https://www.google.com/maps?q=${encodeURIComponent(address)}` : null
}
