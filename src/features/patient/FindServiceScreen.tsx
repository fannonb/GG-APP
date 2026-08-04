import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GGCard, GGBadge, StarRating } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { useProviders } from '@/hooks/api'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useLocationStore } from '@/store/location.store'
import { useDrivingDistances } from '@/hooks/useDrivingDistances'
import type { Provider } from '@/types/provider.types'

const categories: Array<{
  id: string
  label: string
  desc: string
  color: string
  accent: string
  shadow: string
  icon: ReactNode
  isComingSoon?: boolean
}> = [
  { id: 'doctor', label: 'Doctor', desc: 'General & specialist consultations', color: 'rgba(56, 182, 255, 0.08)', accent: C.blue500, shadow: 'rgba(56, 182, 255, 0.15)',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="10" r="5" stroke="currentColor" strokeWidth="1.8"/><path d="M6 28c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="22" cy="22" r="4" fill="white" stroke="currentColor" strokeWidth="1.5"/><path d="M22 20.5v1.5h1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
  { id: 'pharmacy', label: 'Pharmacy', desc: 'Prescriptions & medications', color: 'rgba(56, 182, 255, 0.08)', accent: C.blue500, shadow: 'rgba(56, 182, 255, 0.15)',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="5" y="5" width="22" height="22" rx="5" stroke="currentColor" strokeWidth="1.8"/><line x1="16" y1="9" x2="16" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><line x1="9" y1="16" x2="23" y2="16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg> },
  { id: 'laboratory', label: 'Laboratory', desc: 'Blood tests, pathology & diagnostics', color: 'rgba(56, 182, 255, 0.08)', accent: C.blue500, shadow: 'rgba(56, 182, 255, 0.15)',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M12 4v12L6 24a3 3 0 002.7 4.3h14.6A3 3 0 0026 24l-6-8V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="12" y1="4" x2="20" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { id: 'radiology', label: 'Radiology', desc: 'X-Ray, MRI, CT Scan & ultrasound', color: 'rgba(56, 182, 255, 0.08)', accent: C.blue500, shadow: 'rgba(56, 182, 255, 0.15)',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.8"/><circle cx="16" cy="16" r="3" fill="currentColor" opacity="0.25"/><line x1="16" y1="5" x2="16" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="16" y1="23" x2="16" y2="27" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="5" y1="16" x2="9" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="23" y1="16" x2="27" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { id: 'hospital', label: 'Hospital', desc: 'Emergency, surgery & inpatient care', color: 'rgba(56, 182, 255, 0.08)', accent: C.blue500, shadow: 'rgba(56, 182, 255, 0.15)',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="8" width="24" height="20" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M12 28V18h8v10" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><line x1="16" y1="12" x2="16" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="13" y1="15" x2="19" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M4 16h24" stroke="currentColor" strokeWidth="1.8"/></svg> },
  { id: 'clinic', label: 'Clinic', desc: 'General practice & wellness checks', color: 'rgba(56, 182, 255, 0.08)', accent: C.blue500, shadow: 'rgba(56, 182, 255, 0.15)',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 4L5 11v17h7V20h8v8h7V11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><line x1="16" y1="11" x2="16" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="13" y1="14" x2="19" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { id: 'global_specialists', label: 'Global Medical Specialist Centers', desc: 'International tertiary care & medical tourism', color: 'rgba(153, 157, 173, 0.08)', accent: C.textLight, shadow: 'rgba(9, 28, 68, 0.08)', isComingSoon: true,
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.8"/><path d="M16 5a15 15 0 000 22M5 16h22M8 10a18 18 0 0016 0M8 22a18 18 0 0016 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
]

function providerSearchBlob(provider: Provider): string {
  return [
    provider.name,
    provider.category,
    ...(provider.categories ?? []),
    provider.address,
    provider.country ?? '',
    provider.about ?? '',
    ...provider.services,
  ]
    .join(' ')
    .toLowerCase()
}

function matchesProvider(provider: Provider, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false
  return providerSearchBlob(provider).includes(q)
}

function SearchProviderRow({
  provider,
  distanceLabel,
  onOpen,
  isLast,
}: {
  provider: Provider
  distanceLabel: string
  onOpen: () => void
  isLast: boolean
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        width: '100%',
        padding: '14px 4px',
        border: 'none',
        borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: font.family,
        borderRadius: radius.sm,
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = C.blue100 }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: '12px', background: C.blue100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
      }}>
        {provider.logoUrl ? (
          <img src={provider.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: '18px', fontWeight: 800, color: C.blue500 }}>{provider.name[0]}</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {provider.name}
        </div>
        <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ textTransform: 'capitalize' }}>{provider.category}</span>
          {' · '}
          {provider.address || distanceLabel}
        </div>
        {provider.services.length > 0 && (
          <div style={{ fontSize: '11px', color: C.textLight, marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {provider.services.slice(0, 3).join(' · ')}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <StarRating rating={provider.rating} />
        <div style={{ marginTop: '4px' }}>
          <GGBadge type={provider.status === 'open' ? 'open' : 'closed'}>{provider.status}</GGBadge>
        </div>
      </div>
    </button>
  )
}

export function FindServiceScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [hoveredCat, setHoveredCat] = useState<string | null>(null)
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { isMobile } = useResponsive()
  const { data: providers = [], isLoading, isError } = useProviders()

  useEffect(() => {
    const fromUrl = searchParams.get('q') ?? ''
    setQuery(prev => (prev === fromUrl ? prev : fromUrl))
  }, [searchParams])

  const trimmedQuery = query.trim()
  const isSearching = trimmedQuery.length > 0

  const updateQuery = (next: string) => {
    setQuery(next)
    const trimmed = next.trim()
    if (trimmed) {
      setSearchParams({ q: trimmed }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const provider of providers) {
      const providerCategories =
        provider.categories && provider.categories.length > 0
          ? provider.categories
          : [provider.category]

      for (const category of providerCategories) {
        counts.set(category, (counts.get(category) ?? 0) + 1)
      }
    }
    return counts
  }, [providers])

  const matchedCategories = useMemo(() => {
    if (!isSearching) return []
    const q = trimmedQuery.toLowerCase()
    return categories.filter(
      cat => !cat.isComingSoon && (cat.label.toLowerCase().includes(q) || cat.id.includes(q) || cat.desc.toLowerCase().includes(q)),
    )
  }, [isSearching, trimmedQuery])

  const searchResults = useMemo(() => {
    if (!isSearching) return []
    return providers.filter(provider => matchesProvider(provider, trimmedQuery))
  }, [isSearching, providers, trimmedQuery])

  const position = useLocationStore(s => s.position)
  const { getLabel, getKm } = useDrivingDistances(position, providers)

  useEffect(() => {
    useLocationStore.getState().requestLocation(true)
  }, [])

  const nearbyProviders = useMemo(() => {
    let list = [...providers]
    if (position) {
      list = list.map(provider => ({
        ...provider,
        _distKm: getKm(provider) ?? Number.MAX_SAFE_INTEGER,
      })).sort((a, b) => a._distKm - b._distKm)
    }
    return list.slice(0, 3)
  }, [providers, position, getKm])

  const openProvider = (provider: Provider) => {
    navigate(`/app/services/provider/${provider.id}`, { state: { provider } })
  }

  return (
    <AppLayout title="Find a Service" subtitle="Browse GG'APP-verified healthcare providers near you" notifCount={1}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: font.family }}>

        {/* Search */}
        <div
          style={{
            position: 'relative',
            borderRadius: radius.lg,
            background: `linear-gradient(145deg, ${C.navy800} 0%, #0E3575 55%, ${C.navy900} 100%)`,
            padding: isMobile ? '18px 16px' : '22px 24px',
            boxShadow: '0 12px 36px rgba(9, 28, 68, 0.18)',
            overflow: 'hidden',
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '-40%',
              right: '-8%',
              width: 220,
              height: 220,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56,182,255,0.28) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <div style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
              Find care near you
            </div>
            <div style={{ fontSize: '13px', color: '#fff', marginTop: '4px', lineHeight: 1.45 }}>
              Search by provider name, service, or location
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <style>{`
              input.gg-find-search::placeholder { color: #fff; opacity: 1; }
              input.gg-find-search::-webkit-input-placeholder { color: #fff; opacity: 1; }
              input.gg-find-search::-moz-placeholder { color: #fff; opacity: 1; }
            `}</style>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: focused ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.09)',
                border: focused ? `1.5px solid ${C.blue500}` : '1.5px solid rgba(255,255,255,0.18)',
                borderRadius: radius.sm,
                padding: '0 14px',
                boxShadow: focused ? `0 0 0 3px rgba(56,182,255,0.22)` : 'none',
                transition: 'border 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
                cursor: 'text',
              }}
              onClick={() => inputRef.current?.focus()}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="4.5" stroke="#fff" strokeWidth="1.5" />
                <line x1="10.5" y1="10.5" x2="13.5" y2="13.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                className="gg-find-search"
                type="search"
                value={query}
                onChange={e => updateQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchResults[0]) {
                    openProvider(searchResults[0])
                  }
                }}
                placeholder="Search providers, services, locations…"
                aria-label="Search providers, services, and locations"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 46,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: '#fff',
                  fontSize: '14px',
                  fontFamily: font.family,
                  fontWeight: 500,
                }}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={e => {
                    e.stopPropagation()
                    updateQuery('')
                    inputRef.current?.focus()
                  }}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', border: 'none',
                    background: 'rgba(255,255,255,0.14)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </label>
          </div>

          {isSearching && (
            <div style={{
              position: 'relative',
              marginTop: '14px',
              background: '#fff',
              borderRadius: radius.sm,
              boxShadow: shadow.lg,
              padding: '8px 16px 12px',
              maxHeight: 420,
              overflowY: 'auto',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0 10px', borderBottom: `1px solid ${C.border}`, marginBottom: '4px',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {isLoading ? 'Searching…' : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}
                </div>
                {matchedCategories.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {matchedCategories.slice(0, 3).map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => navigate(`/app/services/${cat.id}`)}
                        style={{
                          padding: '4px 10px', borderRadius: radius.full, border: `1px solid ${C.border}`,
                          background: C.bg, color: C.blue500, fontSize: '11px', fontWeight: 700,
                          fontFamily: font.family, cursor: 'pointer',
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isError ? (
                <div style={{ padding: '18px 0', fontSize: '13px', color: C.error }}>
                  We could not search providers right now.
                </div>
              ) : searchResults.length === 0 && !isLoading ? (
                <div style={{ padding: '22px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>
                    No matches for “{trimmedQuery}”
                  </div>
                  <div style={{ fontSize: '12px', color: C.textSub }}>
                    Try a provider name, service type, or city.
                  </div>
                </div>
              ) : (
                searchResults.slice(0, 12).map((provider, index) => (
                  <SearchProviderRow
                    key={provider.id}
                    provider={provider}
                    distanceLabel={getLabel(provider)}
                    onOpen={() => openProvider(provider)}
                    isLast={index === Math.min(searchResults.length, 12) - 1}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {!isSearching && (
          <>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '4px', height: '16px', background: C.blue500, borderRadius: '2px' }} />
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Select a Category</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: '16px' }}>
                {categories.map(cat => {
                  const isHovered = hoveredCat === cat.id
                  const isDisabled = !!cat.isComingSoon
                  const restingBg = `linear-gradient(135deg, #ffffff 0%, ${cat.accent}03 100%)`
                  const hoverBg = `linear-gradient(135deg, #ffffff 0%, ${cat.accent}12 100%)`
                  const restingBorder = `1.5px solid ${cat.accent}20`
                  const hoverBorder = `1.5px solid ${cat.accent}`
                  const providerCount = categoryCounts.get(cat.id) ?? 0

                  return (
                    <GGCard
                      key={cat.id}
                      onClick={() => !isDisabled ? navigate(`/app/services/${cat.id}`) : undefined}
                      onMouseEnter={() => setHoveredCat(cat.id)}
                      onMouseLeave={() => setHoveredCat(null)}
                      padding="24px"
                      style={{
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.85 : 1,
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: isHovered && !isDisabled ? hoverBorder : restingBorder,
                        boxShadow: isHovered && !isDisabled ? `0 8px 24px ${cat.shadow}` : shadow.sm,
                        transform: isHovered && !isDisabled ? 'translateY(-4px)' : 'none',
                        background: isHovered && !isDisabled ? hoverBg : restingBg,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ width: 60, height: 60, borderRadius: '16px', background: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat.accent, transform: isHovered && !isDisabled ? 'scale(1.06)' : 'none', transition: 'transform 0.22s ease' }}>
                          {cat.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>{cat.label}</div>
                          <div style={{ fontSize: '12px', color: C.textSub, marginTop: '3px', lineHeight: 1.4 }}>{cat.desc}</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {isDisabled ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '11px', padding: '3px 9px', fontFamily: font.family, fontWeight: 600, borderRadius: radius.full, background: 'rgba(180, 140, 10, 0.08)', color: '#B4900A', letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
                              Coming Soon
                            </span>
                          ) : (
                            <span style={{ fontSize: '12px', color: cat.accent, fontWeight: 700 }}>
                              {isLoading ? 'Loading…' : `${providerCount} provider${providerCount === 1 ? '' : 's'}`}
                            </span>
                          )}
                          {!isDisabled && (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke={C.textSub} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          )}
                        </div>
                      </div>
                    </GGCard>
                  )
                })}
              </div>
            </div>

            <GGCard padding="22px">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '4px', height: '16px', background: C.blue500, borderRadius: '2px' }} />
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Nearby Verified Providers</div>
              </div>

              {isError ? (
                <div style={{ fontSize: '13px', color: C.error, fontFamily: font.family }}>
                  We could not load providers right now.
                </div>
              ) : nearbyProviders.length === 0 ? (
                <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>
                  {isLoading ? 'Loading providers…' : 'No verified providers are available yet.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {nearbyProviders.map((provider, index) => (
                    <div
                      key={provider.id}
                      onClick={() => openProvider(provider)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '12px 14px',
                        margin: '0 -14px',
                        borderBottom: index < nearbyProviders.length - 1 ? `1px solid ${C.border}` : 'none',
                        borderLeft: '3px solid transparent',
                        cursor: 'pointer',
                        borderRadius: `0 ${radius.sm} ${radius.sm} 0`,
                        transition: 'all 0.18s ease',
                      }}
                      onMouseEnter={event => {
                        event.currentTarget.style.background = 'rgba(56, 182, 255, 0.05)'
                        event.currentTarget.style.borderLeftColor = C.blue500
                      }}
                      onMouseLeave={event => {
                        event.currentTarget.style.background = 'transparent'
                        event.currentTarget.style.borderLeftColor = 'transparent'
                      }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: '12px', background: C.blue100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                        {provider.logoUrl ? (
                          <img src={provider.logoUrl} alt={provider.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '18px', fontWeight: 800, color: C.blue500, fontFamily: font.family }}>{provider.name[0]}</span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{provider.name}</div>
                        <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', textTransform: 'capitalize' }}>{provider.category} · {getLabel(provider)}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <StarRating rating={provider.rating} />
                        <GGBadge type={provider.status === 'open' ? 'open' : 'closed'}>{provider.status}</GGBadge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GGCard>
          </>
        )}
      </div>
    </AppLayout>
  )
}
