import { useEffect, useRef, useState } from 'react'
import { C, font, radius } from '@/design-system/tokens'

type NominatimResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

type Props = {
  value: string
  onChange: (location: { address: string; lat: number | null; lng: number | null }) => void
  disabled?: boolean
}

export function LocationPicker({ value, onChange, disabled }: Props) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [open, setOpen] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = (q: string) => {
    if (q.trim().length < 3) { setSuggestions([]); setOpen(false); return }
    setFetching(true)
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=0`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'GG-APP/1.0' } }
    )
      .then(r => r.json())
      .then((data: NominatimResult[]) => { setSuggestions(data); setOpen(data.length > 0) })
      .catch(() => { setSuggestions([]); setOpen(false) })
      .finally(() => setFetching(false))
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    onChange({ address: q, lat: null, lng: null })
    setGeoError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 420)
  }

  const handleSelect = (place: NominatimResult) => {
    setQuery(place.display_name)
    onChange({
      address: place.display_name,
      lat: Number.parseFloat(place.lat),
      lng: Number.parseFloat(place.lon),
    })
    setSuggestions([])
    setOpen(false)
  }

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords
        fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'GG-APP/1.0' } }
        )
          .then(r => r.json())
          .then((data: { display_name: string }) => {
            setQuery(data.display_name)
            onChange({
              address: data.display_name,
              lat: latitude,
              lng: longitude,
            })
            setSuggestions([])
            setOpen(false)
          })
          .catch(() => setGeoError('Could not resolve your location. Please type the address.'))
          .finally(() => setLocating(false))
      },
      err => {
        setLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission denied. Please type your address.')
        } else {
          setGeoError('Could not get your location. Please type the address.')
        }
      },
      { timeout: 10000 }
    )
  }

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>
        Address / Location
      </label>

      <div style={{ position: 'relative' }}>
        {/* Input row */}
        <div
          style={{
            display: 'flex', alignItems: 'stretch',
            border: `1px solid ${C.border}`, borderRadius: radius.sm,
            background: disabled ? C.bg : '#fff',
            overflow: 'hidden',
          }}
        >
          {/* Map pin icon */}
          <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', background: disabled ? C.bg : '#fff', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1C4.8 1 3 2.8 3 5c0 3.2 4 8 4 8s4-4.8 4-8c0-2.2-1.8-4-4-4z" stroke={C.blue500} strokeWidth="1.3"/>
              <circle cx="7" cy="5" r="1.5" stroke={C.blue500} strokeWidth="1.2"/>
            </svg>
          </div>

          <input
            value={query}
            onChange={handleInput}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="e.g. 14 Samora Machel Ave, Harare, Zimbabwe"
            disabled={disabled}
            autoComplete="off"
            style={{
              flex: 1, padding: '10px 0', border: 'none', outline: 'none',
              fontSize: '13px', fontFamily: font.family,
              background: 'transparent', color: C.text, minWidth: 0,
            }}
          />

          {/* Loading spinner / clear indicator */}
          {fetching && (
            <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                border: `2px solid ${C.border}`, borderTopColor: C.blue500,
                animation: 'spin 0.6s linear infinite',
              }} />
            </div>
          )}

          {/* Divider */}
          <div style={{ width: 1, background: C.border, margin: '8px 0', flexShrink: 0 }} />

          {/* Use current location button */}
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={disabled || locating}
            title="Use my current location"
            style={{
              padding: '0 12px', border: 'none', cursor: disabled || locating ? 'default' : 'pointer',
              background: 'transparent', display: 'flex', alignItems: 'center', gap: '5px',
              flexShrink: 0, opacity: disabled ? 0.5 : 1,
            }}
          >
            {locating ? (
              <div style={{
                width: 13, height: 13, borderRadius: '50%',
                border: `2px solid ${C.border}`, borderTopColor: C.blue500,
                animation: 'spin 0.6s linear infinite',
              }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="3" stroke={C.blue500} strokeWidth="1.3"/>
                <line x1="7" y1="1" x2="7" y2="3.5" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="7" y1="10.5" x2="7" y2="13" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="1" y1="7" x2="3.5" y2="7" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="10.5" y1="7" x2="13" y2="7" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            )}
            <span style={{ fontSize: '11px', fontWeight: 600, color: C.blue500, fontFamily: font.family, whiteSpace: 'nowrap' }}>
              {locating ? 'Locating…' : 'My Location'}
            </span>
          </button>
        </div>

        {/* Suggestions dropdown */}
        {open && suggestions.length > 0 && (
          <div
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.sm,
              boxShadow: '0 6px 20px rgba(13,30,66,0.12)', marginTop: '4px',
              overflow: 'hidden',
            }}
          >
            {suggestions.map((place, i) => (
              <div
                key={place.place_id}
                onMouseDown={() => handleSelect(place)}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  borderBottom: i < suggestions.length - 1 ? `1px solid ${C.border}` : 'none',
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = C.blue100)}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <path d="M7 1C4.8 1 3 2.8 3 5c0 3.2 4 8 4 8s4-4.8 4-8c0-2.2-1.8-4-4-4z" stroke={C.textSub} strokeWidth="1.3"/>
                  <circle cx="7" cy="5" r="1.5" stroke={C.textSub} strokeWidth="1.2"/>
                </svg>
                <span style={{ fontSize: '12px', color: C.text, fontFamily: font.family, lineHeight: 1.5 }}>
                  {place.display_name}
                </span>
              </div>
            ))}
            <div style={{ padding: '6px 14px', borderTop: `1px solid ${C.border}`, background: C.bg }}>
              <span style={{ fontSize: '10px', color: C.textLight, fontFamily: font.family }}>
                Powered by OpenStreetMap
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Helper / error text */}
      {geoError ? (
        <div style={{ fontSize: '11px', color: C.error, fontFamily: font.family }}>{geoError}</div>
      ) : (
        <div style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family }}>
          Shown on your patient-facing profile and used for map directions.{' '}
          <span style={{ color: C.blue500 }}>Type to search</span> or use{' '}
          <span style={{ color: C.blue500 }}>My Location</span>.
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
