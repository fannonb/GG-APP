import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GGCard, GGBadge, StarRating } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useProviders } from '@/hooks/api'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useLocationStore } from '@/store/location.store'
import { useDrivingDistances } from '@/hooks/useDrivingDistances'
import { getProviderHoursSummary } from '@/utils/provider-hours'
import { route } from '@/router/routes'
import type { Provider } from '@/types/provider.types'

const NEARBY_PREVIEW = 3

const categories: Array<{
  id: string
  label: string
  desc: string
  icon: ReactNode
  isComingSoon?: boolean
}> = [
  { id: 'doctor', label: 'Doctor', desc: 'General & specialist consultations',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="10" r="5" stroke="currentColor" strokeWidth="1.8"/><path d="M6 28c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="22" cy="22" r="4" fill="white" stroke="currentColor" strokeWidth="1.5"/><path d="M22 20.5v1.5h1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
  { id: 'pharmacy', label: 'Pharmacy', desc: 'Prescriptions & medications',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="5" y="5" width="22" height="22" rx="5" stroke="currentColor" strokeWidth="1.8"/><line x1="16" y1="9" x2="16" y2="23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><line x1="9" y1="16" x2="23" y2="16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg> },
  { id: 'laboratory', label: 'Laboratory', desc: 'Blood tests, pathology & diagnostics',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M12 4v12L6 24a3 3 0 002.7 4.3h14.6A3 3 0 0026 24l-6-8V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="12" y1="4" x2="20" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { id: 'radiology', label: 'Radiology', desc: 'X-Ray, MRI, CT Scan & ultrasound',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.8"/><circle cx="16" cy="16" r="3" fill="currentColor" opacity="0.25"/><line x1="16" y1="5" x2="16" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="16" y1="23" x2="16" y2="27" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="5" y1="16" x2="9" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="23" y1="16" x2="27" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { id: 'hospital', label: 'Hospital', desc: 'Emergency, surgery & inpatient care',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="8" width="24" height="20" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M12 28V18h8v10" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><line x1="16" y1="12" x2="16" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="13" y1="15" x2="19" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M4 16h24" stroke="currentColor" strokeWidth="1.8"/></svg> },
  { id: 'clinic', label: 'Clinic', desc: 'General practice & wellness checks',
    icon: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 4L5 11v17h7V20h8v8h7V11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><line x1="16" y1="11" x2="16" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="13" y1="14" x2="19" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
]

const globalSpecialists = {
  id: 'global_specialists',
  label: 'Global Medical Specialist Centers',
  desc: 'International tertiary care and medical tourism — coming to GG\'APP soon.',
  icon: <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.8"/><path d="M16 5a15 15 0 000 22M5 16h22M8 10a18 18 0 0016 0M8 22a18 18 0 0016 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
}

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

function ProviderRow({
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
  const hoursLabel = getProviderHoursSummary(provider)

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        width: '100%',
        padding: '12px 8px',
        border: 'none',
        borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: font.family,
        borderRadius: radius.sm,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = C.bg }}
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
        <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
          {provider.category} · {distanceLabel}
        </div>
        <div style={{ fontSize: '12px', color: provider.status === 'open' ? C.blue500 : C.textLight, marginTop: '3px', fontWeight: 600 }}>
          {hoursLabel}
        </div>
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
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [focused, setFocused] = useState(false)
  const [openNowOnly, setOpenNowOnly] = useState(false)
  const [nearbyExpanded, setNearbyExpanded] = useState(false)
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
      cat => cat.label.toLowerCase().includes(q) || cat.id.includes(q) || cat.desc.toLowerCase().includes(q),
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

  const nearbySorted = useMemo(() => {
    let list = [...providers]
    if (openNowOnly) list = list.filter(provider => provider.status === 'open')
    if (position) {
      list = list
        .map(provider => ({
          ...provider,
          _distKm: getKm(provider) ?? Number.MAX_SAFE_INTEGER,
        }))
        .sort((a, b) => a._distKm - b._distKm)
    }
    return list
  }, [providers, position, getKm, openNowOnly])

  const nearbyVisible = nearbyExpanded ? nearbySorted : nearbySorted.slice(0, NEARBY_PREVIEW)
  const canExpandNearby = nearbySorted.length > NEARBY_PREVIEW

  const openProvider = (provider: Provider) => {
    navigate(`/app/services/provider/${provider.id}`, { state: { provider } })
  }

  return (
    <AppLayout title="Find a Service">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        <GGCard padding={isMobile ? '14px' : '16px 18px'}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: C.bg,
              border: focused ? `1.5px solid ${C.blue500}` : `1.5px solid ${C.border}`,
              borderRadius: radius.sm,
              padding: '0 14px',
              cursor: 'text',
            }}
            onClick={() => inputRef.current?.focus()}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="4.5" stroke={C.textLight} strokeWidth="1.4" />
              <line x1="10.5" y1="10.5" x2="13.5" y2="13.5" stroke={C.textLight} strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={e => updateQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Provider, service, or area"
              aria-label="Search providers, services, and locations"
              style={{
                flex: 1,
                minWidth: 0,
                height: 44,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: C.text,
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
                  background: C.border, color: C.textSub,
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

          {isSearching && (
            <div style={{ marginTop: 12 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '4px 0 10px', borderBottom: `1px solid ${C.border}`, marginBottom: 4,
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
                        onClick={() => navigate(route.providerList(cat.id))}
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
                  <ProviderRow
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
        </GGCard>

        {!isSearching && (
          <>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '14px' }}>
                Select a category
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: '12px' }}>
                {categories.map(cat => {
                  const providerCount = categoryCounts.get(cat.id) ?? 0
                  const isEmpty = !isLoading && providerCount === 0

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      disabled={isEmpty}
                      onClick={() => { if (!isEmpty) navigate(route.providerList(cat.id)) }}
                      style={{
                        all: 'unset',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        padding: isMobile ? '16px' : '20px',
                        background: '#fff',
                        borderRadius: radius.lg,
                        border: `1px solid ${C.border}`,
                        boxSizing: 'border-box',
                        cursor: isEmpty ? 'default' : 'pointer',
                        opacity: isEmpty ? 0.62 : 1,
                        fontFamily: font.family,
                      }}
                    >
                      <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: isEmpty ? C.bg : 'rgba(56, 182, 255, 0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isEmpty ? C.textLight : C.blue500,
                      }}>
                        {cat.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>{cat.label}</div>
                        <div style={{ fontSize: '12px', color: C.textSub, marginTop: '3px', lineHeight: 1.4 }}>{cat.desc}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <span style={{ fontSize: '12px', color: isEmpty ? C.textLight : C.blue500, fontWeight: 700 }}>
                          {isLoading ? 'Loading…' : isEmpty ? 'None nearby' : `${providerCount} provider${providerCount === 1 ? '' : 's'}`}
                        </span>
                        {!isEmpty && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke={C.textSub} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: isMobile ? '14px 16px' : '16px 18px',
                background: C.bg,
                borderRadius: radius.lg,
                border: `1px solid ${C.border}`,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: 'rgba(153, 157, 173, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textLight, flexShrink: 0,
              }}>
                {globalSpecialists.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{globalSpecialists.label}</div>
                <div style={{ fontSize: 12, color: C.textSub, marginTop: 2, lineHeight: 1.4 }}>{globalSpecialists.desc}</div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: radius.full,
                background: 'rgba(153, 157, 173, 0.12)', color: C.textLight, whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                Soon
              </span>
            </div>

            <GGCard padding="20px 22px">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Nearby verified providers</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setOpenNowOnly(v => !v)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: radius.full,
                      border: `1.5px solid ${openNowOnly ? C.blue500 : C.border}`,
                      background: openNowOnly ? C.blue100 : '#fff',
                      color: openNowOnly ? C.blue500 : C.textSub,
                      fontSize: 12,
                      fontWeight: openNowOnly ? 700 : 600,
                      fontFamily: font.family,
                      cursor: 'pointer',
                    }}
                  >
                    Open now
                  </button>
                  {canExpandNearby && (
                    <button
                      type="button"
                      onClick={() => setNearbyExpanded(v => !v)}
                      style={{ all: 'unset', fontSize: 13, color: C.blue500, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}
                    >
                      {nearbyExpanded ? 'Show less' : 'See all →'}
                    </button>
                  )}
                </div>
              </div>

              {isError ? (
                <div style={{ fontSize: '13px', color: C.error }}>
                  We could not load providers right now.
                </div>
              ) : nearbyVisible.length === 0 ? (
                <div style={{ fontSize: '13px', color: C.textSub }}>
                  {isLoading
                    ? 'Loading providers…'
                    : openNowOnly
                      ? 'No providers are open right now. Turn off Open now to see the full shortlist.'
                      : 'No verified providers are available yet.'}
                </div>
              ) : (
                nearbyVisible.map((provider, index) => (
                  <ProviderRow
                    key={provider.id}
                    provider={provider}
                    distanceLabel={getLabel(provider)}
                    onOpen={() => openProvider(provider)}
                    isLast={index === nearbyVisible.length - 1}
                  />
                ))
              )}
            </GGCard>
          </>
        )}
      </div>
    </AppLayout>
  )
}
