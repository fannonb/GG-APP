import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { C, font, radius } from '@/design-system/tokens'
import {
  reverseNominatim,
  searchNominatim,
  type LocationSuggestion,
} from '@/features/auth/components/LocationPickerInput'

export interface PinnedLocation {
  lat: number
  lng: number
  /** Street-level label from the geocoder, e.g. "Samora Machel Ave, Harare". */
  label: string
}

interface MapPinPickerProps {
  value: PinnedLocation | null
  onChange: (value: PinnedLocation) => void
  /** Where to centre the map before a pin is dropped. */
  fallbackCenter?: { lat: number; lng: number } | null
  hint?: string
}

/** Status under the map: red for failures, grey for a neutral note. */
interface LocationNotice {
  tone: 'error' | 'note'
  text: string
}

const DEFAULT_CENTER = { lat: -17.8292, lng: 31.0522 } // Harare
const PIN_ICON = L.divIcon({
  className: '',
  iconSize: [34, 44],
  iconAnchor: [17, 42],
  html: `<svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 1.5C8.4 1.5 1.5 8.3 1.5 16.8 1.5 28.4 17 42.5 17 42.5S32.5 28.4 32.5 16.8C32.5 8.3 25.6 1.5 17 1.5z" fill="#0B7BC0" stroke="#fff" stroke-width="2"/>
    <circle cx="17" cy="16.5" r="5.5" fill="#fff"/></svg>`,
})

function shortLabel(location: LocationSuggestion) {
  return [location.shortName, location.city].filter(Boolean).join(', ') || location.address
}

/**
 * Search for an address or use GPS, then drag the pin (or tap the map) to the exact door.
 * The pin is what pharmacies are matched against and where a delivery goes.
 */
export function MapPinPicker({ value, onChange, fallbackCenter, hint }: MapPinPickerProps) {
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  // Leaflet handlers are registered once, so they read the latest onChange through a ref.
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  // Read at failure time, so a location that arrives while GPS is still trying is used.
  const fallbackRef = useRef(fallbackCenter)
  useEffect(() => {
    fallbackRef.current = fallbackCenter
  }, [fallbackCenter])

  const [query, setQuery] = useState('')
  const [resolved, setResolved] = useState<{ query: string; results: LocationSuggestion[] }>({ query: '', results: [] })
  const trimmedQuery = query.trim()
  const canSearch = trimmedQuery.length >= 3
  const searching = canSearch && resolved.query !== trimmedQuery
  const results = canSearch && resolved.query === trimmedQuery ? resolved.results : []
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState<LocationNotice | null>(null)

  const placePin = async (lat: number, lng: number, label?: string) => {
    onChangeRef.current({ lat, lng, label: label ?? 'Pinned location' })
    if (label) return
    try {
      const place = await reverseNominatim(lat, lng)
      onChangeRef.current({ lat, lng, label: shortLabel(place) })
    } catch {
      // Keep the pin; the label is only a convenience.
    }
  }

  // Create the map once.
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return
    const start = value ?? fallbackCenter ?? DEFAULT_CENTER
    const map = L.map(mapEl.current, { zoomControl: true, attributionControl: true }).setView(
      [start.lat, start.lng],
      value || fallbackCenter ? 16 : 12,
    )
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    map.on('click', event => void placePin(event.latlng.lat, event.latlng.lng))
    mapRef.current = map
    // The map may mount inside a container that is still sizing itself.
    const resize = window.setTimeout(() => map.invalidateSize(), 150)
    return () => {
      window.clearTimeout(resize)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the marker in sync with the value.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!value) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }
    if (!markerRef.current) {
      const marker = L.marker([value.lat, value.lng], { draggable: true, icon: PIN_ICON, keyboard: true, title: 'Drag to the exact spot' })
      marker.on('dragend', () => {
        const point = marker.getLatLng()
        void placePin(point.lat, point.lng)
      })
      marker.addTo(map)
      markerRef.current = marker
      map.setView([value.lat, value.lng], Math.max(map.getZoom(), 16))
    } else {
      const current = markerRef.current.getLatLng()
      if (current.lat !== value.lat || current.lng !== value.lng) {
        markerRef.current.setLatLng([value.lat, value.lng])
        map.panTo([value.lat, value.lng])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng])

  // Re-centre on the fallback (e.g. GPS arriving late) until a pin exists.
  useEffect(() => {
    if (value || !fallbackCenter || !mapRef.current) return
    mapRef.current.setView([fallbackCenter.lat, fallbackCenter.lng], 16)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallbackCenter?.lat, fallbackCenter?.lng])

  // Debounced address search.
  useEffect(() => {
    if (trimmedQuery.length < 3) return
    const timer = window.setTimeout(async () => {
      let found: LocationSuggestion[] = []
      try {
        found = await searchNominatim(trimmedQuery)
      } catch {
        // Show "no results" rather than an error; the map and GPS still work.
      }
      setResolved({ query: trimmedQuery, results: found })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [trimmedQuery])

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setNotice({ tone: 'error', text: 'Location is not available in this browser. Search for the address instead.' })
      return
    }
    setLocating(true)
    setNotice(null)

    const onFound = (position: GeolocationPosition) => {
      setLocating(false)
      setNotice(null)
      void placePin(position.coords.latitude, position.coords.longitude)
    }

    // Final failure, after any retry: use the last known location if there is one.
    const onFailed = (error: GeolocationPositionError) => {
      setLocating(false)
      if (error.code === error.PERMISSION_DENIED) {
        setNotice({
          tone: 'error',
          text: window.isSecureContext
            ? 'Location is blocked for this site. Allow it in your browser settings, or search for the address.'
            : 'Location needs a secure (https) connection. Search for the address or tap the map.',
        })
        return
      }
      const fallback = fallbackRef.current
      if (fallback) {
        setNotice({ tone: 'note', text: 'Using your approximate location. Drag the pin or tap the map to adjust.' })
        void placePin(fallback.lat, fallback.lng)
        return
      }
      setNotice({ tone: 'error', text: "Couldn't get your location. Search for the address or tap the map." })
    }

    // High accuracy first. On timeout or no GPS, retry once with a coarse position that may be cached.
    navigator.geolocation.getCurrentPosition(
      onFound,
      error => {
        if (error.code !== error.TIMEOUT && error.code !== error.POSITION_UNAVAILABLE) {
          onFailed(error)
          return
        }
        navigator.geolocation.getCurrentPosition(onFound, onFailed, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        })
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: font.family }}>
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search street, area or landmark…"
            aria-label="Search for an address"
            autoComplete="off"
            style={{ flex: 1, minWidth: 0, padding: '10px 12px', fontSize: 14, fontFamily: font.family, color: C.text, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none' }}
          />
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            style={{ flexShrink: 0, padding: '0 12px', borderRadius: radius.sm, border: `1.5px solid ${C.border}`, background: '#fff', color: '#0B7BC0', fontSize: 13, fontWeight: 700, cursor: locating ? 'default' : 'pointer', fontFamily: font.family, whiteSpace: 'nowrap' }}
          >
            {locating ? 'Locating…' : 'Use my location'}
          </button>
        </div>
        {(results.length > 0 || searching) && canSearch && (
          <div role="listbox" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 1000, background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.sm, boxShadow: '0 8px 24px rgba(9,28,68,0.12)', overflow: 'hidden' }}>
            {searching && results.length === 0 && <div style={{ padding: '10px 12px', fontSize: 13, color: C.textSub }}>Searching…</div>}
            {results.map(result => (
              <button
                key={result.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  setQuery('')
                  void placePin(result.lat, result.lng, shortLabel(result))
                }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', borderBottom: `1px solid ${C.border}`, background: 'none', cursor: 'pointer', fontFamily: font.family }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{result.shortName}</div>
                <div style={{ fontSize: 12, color: C.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.address}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        ref={mapEl}
        role="application"
        aria-label="Map. Tap to drop the pin, or drag the pin to the exact spot."
        style={{ height: 240, borderRadius: radius.md, border: `1px solid ${C.border}`, overflow: 'hidden', background: C.bg, zIndex: 0 }}
      />

      <div style={{ fontSize: 12, color: value ? C.text : C.textSub, lineHeight: 1.5 }}>
        {value ? (
          <>
            <strong>Pin:</strong> {value.label}{' '}
            <span style={{ color: C.textLight }}>({value.lat.toFixed(5)}, {value.lng.toFixed(5)})</span>
          </>
        ) : (
          hint ?? 'Tap the map or search to drop a pin.'
        )}
      </div>
      {notice && <div style={{ fontSize: 12, color: notice.tone === 'error' ? C.error : C.textSub }}>{notice.text}</div>}
    </div>
  )
}
