import { create } from 'zustand'

export interface GeoPosition {
  lat: number
  lng: number
}

export type LocState = 'idle' | 'loading' | 'active' | 'denied' | 'skipped'

interface LocationStore {
  position: GeoPosition | null
  locState: LocState
  error: string | null
  watchId: number | null
  requestLocation: (force?: boolean) => void
  skipLocation: () => void
  clearWatch: () => void
}

export const useLocationStore = create<LocationStore>((set, get) => ({
  position: null,
  locState: 'idle',
  error: null,
  watchId: null,

  requestLocation: (force = false) => {
    // If they already skipped and we are not forcing, do nothing
    if (sessionStorage.getItem('gg-loc-skip') === 'true' && !force) {
      set({ locState: 'skipped' })
      return
    }

    // Prevent duplicate active watches or loading states unless forced
    const currentState = get().locState
    if ((currentState === 'active' || currentState === 'loading') && !force) {
      return
    }

    if (!navigator.geolocation) {
      set({ locState: 'denied', error: 'Geolocation not supported' })
      return
    }

    // Clear any active watch first
    const activeWatchId = get().watchId
    if (activeWatchId !== null) {
      navigator.geolocation.clearWatch(activeWatchId)
    }

    set({ locState: 'loading', error: null })

    // Watch position so that coordinates stay fresh as user moves
    const id = navigator.geolocation.watchPosition(
      pos => {
        set({
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          locState: 'active',
          error: null,
        })
      },
      err => {
        // Fallback to denied/skipped when location cannot be determined
        set({
          position: null,
          locState: 'denied',
          error: err.message || 'Location access denied',
        })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )

    set({ watchId: id })
  },

  skipLocation: () => {
    const activeWatchId = get().watchId
    if (activeWatchId !== null) {
      navigator.geolocation.clearWatch(activeWatchId)
    }
    sessionStorage.setItem('gg-loc-skip', 'true')
    set({ position: null, locState: 'skipped', watchId: null })
  },

  clearWatch: () => {
    const activeWatchId = get().watchId
    if (activeWatchId !== null) {
      navigator.geolocation.clearWatch(activeWatchId)
      set({ watchId: null })
    }
  },
}))
