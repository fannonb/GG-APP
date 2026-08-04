import type { GeoPosition } from '@/store/location.store'

const OSRM_BASE = 'https://router.project-osrm.org'
const distanceCache = new Map<string, number>()

function coordKey(origin: GeoPosition, destination: GeoPosition) {
  return `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}->${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`
}

function toCoord(lat?: number | null, lng?: number | null): GeoPosition | null {
  if (lat == null || lng == null) return null
  return { lat, lng }
}

export function toGeoCoord(lat?: number | null, lng?: number | null): GeoPosition | null {
  return toCoord(lat, lng)
}

export async function fetchDrivingDistanceKm(
  origin: GeoPosition,
  destination: GeoPosition,
): Promise<number | null> {
  const key = coordKey(origin, destination)
  const cached = distanceCache.get(key)
  if (cached != null) return cached

  try {
    const url = `${OSRM_BASE}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`
    const response = await fetch(url)
    if (!response.ok) return null

    const data = await response.json() as {
      code?: string
      routes?: Array<{ distance?: number }>
    }

    const meters = data.code === 'Ok' ? data.routes?.[0]?.distance : undefined
    if (meters == null || !Number.isFinite(meters)) return null

    const km = meters / 1000
    distanceCache.set(key, km)
    return km
  } catch {
    return null
  }
}

export async function fetchDrivingDistancesKm(
  origin: GeoPosition,
  destinations: GeoPosition[],
): Promise<Array<number | null>> {
  if (destinations.length === 0) return []

  const results: Array<number | null> = destinations.map(() => null)
  const pending: Array<{ index: number; destination: GeoPosition }> = []

  destinations.forEach((destination, index) => {
    const key = coordKey(origin, destination)
    const cached = distanceCache.get(key)
    if (cached != null) {
      results[index] = cached
      return
    }
    pending.push({ index, destination })
  })

  if (pending.length === 0) return results

  const coordinates = [origin, ...pending.map(item => item.destination)]
  const coordString = coordinates.map(coord => `${coord.lng},${coord.lat}`).join(';')
  const destinationIndexes = pending.map((_, index) => String(index + 1)).join(';')

  try {
    const url = `${OSRM_BASE}/table/v1/driving/${coordString}?sources=0&destinations=${destinationIndexes}&annotations=distance`
    const response = await fetch(url)
    if (!response.ok) throw new Error('OSRM table request failed')

    const data = await response.json() as {
      code?: string
      distances?: Array<Array<number | null>>
    }

    if (data.code !== 'Ok' || !data.distances?.[0]) {
      throw new Error('OSRM table response invalid')
    }

    data.distances[0].forEach((meters, pendingIndex) => {
      const { index, destination } = pending[pendingIndex]
      if (meters == null || !Number.isFinite(meters)) return
      const km = meters / 1000
      results[index] = km
      distanceCache.set(coordKey(origin, destination), km)
    })

    return results
  } catch {
    await Promise.all(pending.map(async ({ index, destination }) => {
      results[index] = await fetchDrivingDistanceKm(origin, destination)
    }))
    return results
  }
}
