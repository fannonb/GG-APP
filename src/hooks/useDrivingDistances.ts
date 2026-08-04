import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GeoPosition } from '@/store/location.store'
import { fetchDrivingDistancesKm, toGeoCoord } from '@/services/driving-distance'
import { formatDistance, getCalculatedDistance } from '@/utils/format'

interface LocatableItem {
  id: string | number
  lat?: number | null
  lng?: number | null
  distance?: string
}

function itemKey(id: string | number) {
  return String(id)
}

export function useDrivingDistances(
  origin: GeoPosition | null,
  items: LocatableItem[],
) {
  const [distancesKm, setDistancesKm] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(false)

  const routableItems = useMemo(
    () => items
      .map(item => ({
        item,
        coord: toGeoCoord(item.lat, item.lng),
      }))
      .filter((entry): entry is { item: LocatableItem; coord: GeoPosition } => entry.coord != null),
    [items],
  )

  const routableKey = useMemo(
    () => routableItems.map(entry => `${itemKey(entry.item.id)}:${entry.coord.lat},${entry.coord.lng}`).join('|'),
    [routableItems],
  )

  useEffect(() => {
    if (!origin || routableItems.length === 0) {
      setDistancesKm(new Map())
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetchDrivingDistancesKm(origin, routableItems.map(entry => entry.coord))
      .then(values => {
        if (cancelled) return

        const next = new Map<string, number>()
        routableItems.forEach((entry, index) => {
          const km = values[index]
          if (km != null) next.set(itemKey(entry.item.id), km)
        })
        setDistancesKm(next)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setDistancesKm(new Map())
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [origin?.lat, origin?.lng, routableKey, routableItems])

  const getLabel = useCallback((item: LocatableItem) => {
    const km = distancesKm.get(itemKey(item.id))
    if (km != null) return formatDistance(km)
    if (loading && item.lat != null && item.lng != null) return 'Calculating…'
    return getCalculatedDistance(item, origin)
  }, [distancesKm, loading, origin])

  const getKm = useCallback((item: LocatableItem) => distancesKm.get(itemKey(item.id)) ?? null, [distancesKm])

  return { distancesKm, getLabel, getKm, loading }
}
