import { useState, useEffect } from 'react'

export interface GeoPosition {
  lat: number
  lng: number
}

interface GeolocationState {
  position: GeoPosition | null
  loading:  boolean
  error:    string | null
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({ position: null, loading: true, error: null })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ position: null, loading: false, error: 'Geolocation not supported' })
      return
    }

    const id = navigator.geolocation.watchPosition(
      pos => setState({ position: { lat: pos.coords.latitude, lng: pos.coords.longitude }, loading: false, error: null }),
      ()  => setState({ position: null, loading: false, error: 'Location access denied' }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )

    return () => navigator.geolocation.clearWatch(id)
  }, [])

  return state
}
