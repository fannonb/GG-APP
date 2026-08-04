import { useState, useRef, useEffect } from 'react'
import { C, font, radius } from '@/design-system/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocationSuggestion {
  id:        string
  shortName: string   // street / place name
  address:   string   // full display address
  city:      string
  country:   string
  lat:       number
  lng:       number
}

// ─── Nominatim helpers ────────────────────────────────────────────────────────

const NOMINATIM = 'https://nominatim.openstreetmap.org'
const HEADERS   = {
  'Accept-Language': 'en',
  'User-Agent': 'GGApp/1.0 (contact@ggapp.health)',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSuggestion(r: any): LocationSuggestion {
  const a = r.address ?? {}
  return {
    id:        String(r.place_id),
    shortName: a.road ?? a.neighbourhood ?? a.suburb ?? r.display_name.split(',')[0],
    address:   r.display_name,
    city:      a.city ?? a.town ?? a.village ?? a.county ?? '',
    country:   a.country ?? '',
    lat:       parseFloat(r.lat),
    lng:       parseFloat(r.lon),
  }
}

async function searchNominatim(query: string): Promise<LocationSuggestion[]> {
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(query)}&countrycodes=zw,ke,zm&format=json&addressdetails=1&limit=6`
  const res  = await fetch(url, { headers: HEADERS })
  const data = await res.json()
  return (data as unknown[]).map(toSuggestion)
}

async function reverseNominatim(lat: number, lon: number): Promise<LocationSuggestion> {
  const url = `${NOMINATIM}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`
  const res  = await fetch(url, { headers: HEADERS })
  const data = await res.json()
  return toSuggestion(data)
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PinIcon({ color = C.textSub, size = 14 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8 1.5a4.5 4.5 0 014.5 4.5c0 2.8-4.5 8.5-4.5 8.5S3.5 8.8 3.5 6A4.5 4.5 0 018 1.5z" stroke={color} strokeWidth="1.4" fill={color === C.blue500 ? `${color}22` : 'none'}/>
      <circle cx="8" cy="6" r="1.5" fill={color}/>
    </svg>
  )
}

function Spinner({ color = C.blue500 }: { color?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
      <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.4" strokeDasharray="12 20"/>
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LocationPickerInputProps {
  value:    LocationSuggestion | null
  onChange: (loc: LocationSuggestion | null) => void
  required?: boolean
}

export function LocationPickerInput({ value, onChange, required }: LocationPickerInputProps) {
  const [query,       setQuery]       = useState('')
  const [open,        setOpen]        = useState(false)
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [apiLoading,  setApiLoading]  = useState(false)
  const [geoLoading,  setGeoLoading]  = useState(false)
  const [geoError,    setGeoError]    = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced Nominatim search — fires 400 ms after the user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 3) {
      setSuggestions([])
      setApiLoading(false)
      return
    }
    setApiLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchNominatim(query)
        setSuggestions(results)
      } catch {
        setSuggestions([])
      } finally {
        setApiLoading(false)
      }
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const select = (loc: LocationSuggestion) => {
    onChange(loc)
    setQuery('')
    setOpen(false)
    setHighlighted(-1)
    setGeoError(null)
    setSuggestions([])
  }

  const clear = () => {
    onChange(null)
    setQuery('')
    setGeoError(null)
    setSuggestions([])
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by this browser.')
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const loc = await reverseNominatim(pos.coords.latitude, pos.coords.longitude)
          select(loc)
        } catch {
          setGeoError('Could not resolve your location. Please search manually.')
        } finally {
          setGeoLoading(false)
        }
      },
      () => {
        setGeoError('Location access denied. Please search for your address manually.')
        setGeoLoading(false)
      },
      { timeout: 8000 },
    )
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, -1)) }
    if (e.key === 'Enter' && highlighted >= 0 && suggestions[highlighted]) { select(suggestions[highlighted]) }
    if (e.key === 'Escape') { setOpen(false) }
  }

  const showDropdown = open && !value

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>
        Practice Location {required && <span style={{ color: C.error }}>*</span>}
      </label>
      <div style={{ fontSize: '11px', color: C.textSub, marginBottom: '4px', fontFamily: font.family }}>
        Patients use this to find nearby providers. Enter your street address or use your current location.
      </div>

      {/* ── Selected state ── */}
      {value ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', background: '#F0FDF4', border: `1.5px solid #22C55E66`, borderRadius: radius.sm }}>
          <div style={{ width: 32, height: 32, borderRadius: radius.xs, background: '#22C55E22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
            <PinIcon color="#16A34A" size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803D', fontFamily: font.family, marginBottom: '2px' }}>{value.shortName}</div>
            <div style={{ fontSize: '12px', color: '#166534', fontFamily: font.family }}>{value.address}</div>
            <div style={{ fontSize: '10px', color: '#16A34A', fontFamily: font.family, marginTop: '3px', opacity: 0.7 }}>
              {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </div>
          </div>
          <button onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803D', padding: '2px', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>
        </div>
      ) : (
        /* ── Search input ── */
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', background: '#fff', border: `1.5px solid ${open ? C.blue500 : C.border}`, borderRadius: radius.sm, transition: 'border-color 0.15s' }}>
            <PinIcon color={open ? C.blue500 : C.textSub} size={15} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true); setHighlighted(-1) }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKey}
              placeholder="Search street, area or city…"
              autoComplete="off"
              style={{ flex: 1, padding: '11px 0', fontSize: '13px', fontFamily: font.family, color: C.text, background: 'transparent', border: 'none', outline: 'none' }}
            />
            {apiLoading && <Spinner />}
            {query && !apiLoading && (
              <button onClick={() => { setQuery(''); setHighlighted(-1); setSuggestions([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textLight, padding: '2px', display: 'flex' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
            )}
          </div>

          {/* ── Dropdown ── */}
          {showDropdown && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.sm, boxShadow: '0 8px 24px rgba(9,28,68,0.12)', zIndex: 100, overflow: 'hidden' }}>

              {/* Use current location */}
              <button
                onClick={useCurrentLocation}
                disabled={geoLoading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', background: 'none', border: 'none', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', fontFamily: font.family, textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = C.blue100)}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.blue100, border: `1px solid ${C.blue500}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {geoLoading ? <Spinner /> : (
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="3" stroke={C.blue500} strokeWidth="1.4"/>
                      <path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke={C.blue500} strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.blue500 }}>{geoLoading ? 'Detecting location…' : 'Use my current location'}</div>
                  <div style={{ fontSize: '11px', color: C.textSub }}>Uses your device GPS to pinpoint your practice</div>
                </div>
              </button>

              {/* Suggestions */}
              {suggestions.length > 0 ? (
                suggestions.map((loc, i) => (
                  <button
                    key={loc.id}
                    onClick={() => select(loc)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px',
                      background: i === highlighted ? C.blue100 : 'none',
                      border: 'none', borderBottom: i < suggestions.length - 1 ? `1px solid ${C.border}` : 'none',
                      cursor: 'pointer', fontFamily: font.family, textAlign: 'left',
                    }}
                    onMouseEnter={e => { setHighlighted(i); e.currentTarget.style.background = C.blue100 }}
                    onMouseLeave={e => { if (highlighted !== i) e.currentTarget.style.background = 'none' }}
                  >
                    <div style={{ marginTop: '1px', flexShrink: 0 }}><PinIcon color={C.textLight} size={14} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{loc.shortName}</div>
                      <div style={{ fontSize: '11px', color: C.textSub, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.address}</div>
                    </div>
                  </button>
                ))
              ) : query.length >= 3 && !apiLoading ? (
                <div style={{ padding: '16px 14px', fontSize: '13px', color: C.textSub, fontFamily: font.family }}>No locations found for "{query}"</div>
              ) : query.length < 3 ? (
                <div style={{ padding: '16px 14px', fontSize: '12px', color: C.textLight, fontFamily: font.family }}>Type at least 3 characters to search…</div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Geolocation error */}
      {geoError && (
        <div style={{ fontSize: '11px', color: C.error, fontFamily: font.family, marginTop: '2px' }}>{geoError}</div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
