import { useEffect, useState } from 'react'
import type { GeoPosition } from '@/store/location.store'
import { fetchDrivingDistanceKm } from '@/services/driving-distance'
import { formatDistance, getCalculatedDistance } from '@/utils/format'

interface LocatableProvider {
  lat?: number | null
  lng?: number | null
  distance?: string
}

export function useDrivingDistance(
  origin: GeoPosition | null,
  destination: GeoPosition | null,
  fallbackProvider?: LocatableProvider | null,
) {
  const [km, setKm] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!origin || !destination) {
      setKm(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetchDrivingDistanceKm(origin, destination)
      .then(value => {
        if (cancelled) return
        setKm(value)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setKm(null)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng])

  const fallback = fallbackProvider
    ? getCalculatedDistance(fallbackProvider, origin)
    : 'Nearby'

  const label = km != null
    ? formatDistance(km)
    : loading
      ? 'Calculating…'
      : fallback

  return { km, label, loading }
}
