import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GGCard, GGButton, GGBadge, StarRating } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useProvidersByCategory } from '@/hooks/api'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useLocationStore } from '@/store/location.store'
import { useDrivingDistances } from '@/hooks/useDrivingDistances'
import { truncate } from '@/utils/format'

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
      <circle cx="7" cy="7" r="5.5" stroke="#fff" strokeWidth="1.5" strokeDasharray="12 20" />
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </svg>
  )
}

function LocationBanner({ loading, onAllow, onSkip }: { loading: boolean; onAllow: () => void; onSkip: () => void }) {
  return (
    <div style={{ background: C.blue100, border: `1px solid ${C.blue500}33`, borderRadius: radius.sm, padding: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
      <div style={{ width: 40, height: 40, borderRadius: radius.sm, background: '#fff', border: `1px solid ${C.blue500}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 1.5A5.5 5.5 0 019 12.5S3.5 17 3.5 7A5.5 5.5 0 019 1.5z" stroke={C.blue500} strokeWidth="1.4" fill={`${C.blue500}18`} />
          <circle cx="9" cy="7" r="2" fill={C.blue500} />
          <path d="M9 13.5v3M5 15.5h8" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: C.navy800, fontFamily: font.family, marginBottom: '3px' }}>
          Find providers near you
        </div>
        <div style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family, lineHeight: 1.5 }}>
          Allow location access to see real distances and sort by nearest provider.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
          <button
            onClick={onAllow}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: loading ? `${C.blue500}aa` : C.blue500, color: '#fff', border: 'none', borderRadius: radius.full, fontSize: '12px', fontWeight: 700, fontFamily: font.family, cursor: loading ? 'default' : 'pointer' }}
          >
            {loading && <Spinner />}
            {loading ? 'Detecting…' : 'Allow Location'}
          </button>
          <button onClick={onSkip} style={{ fontSize: '12px', color: C.textSub, background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family, padding: '4px 0' }}>
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}

function ActiveStrip({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', background: '#F0FDF4', border: '1px solid #22C55E44', borderRadius: radius.sm }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
      <span style={{ fontSize: '12px', fontWeight: 600, color: '#15803D', fontFamily: font.family }}>Location active</span>
      <span style={{ fontSize: '12px', color: '#166534', fontFamily: font.family, opacity: 0.7 }}>· Showing driving distances</span>
      <button onClick={onDismiss} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#16A34A', padding: '2px', display: 'flex', flexShrink: 0 }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
      </button>
    </div>
  )
}

function DeniedStrip({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: '#FFFBEB', border: '1px solid #F59E0B44', borderRadius: radius.sm }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
        <path d="M7 1.5L12.5 11H1.5L7 1.5z" stroke="#D97706" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M7 5.5v2.5M7 9.5v.5" stroke="#D97706" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <span style={{ fontSize: '12px', color: '#92400E', fontFamily: font.family, flex: 1 }}>
        Location unavailable — distances are approximate
      </span>
      <button onClick={onRetry} style={{ fontSize: '12px', fontWeight: 600, color: '#D97706', background: 'none', border: 'none', cursor: 'pointer', fontFamily: font.family, flexShrink: 0 }}>
        Try again
      </button>
    </div>
  )
}

export function ProviderListScreen() {
  const navigate = useNavigate()
  const { category = 'doctor' } = useParams<{ category: string }>()
  const { data: providers = [], isLoading, isError } = useProvidersByCategory(category)
  const [filter, setFilter] = useState('all')
  const position = useLocationStore(s => s.position)
  const locState = useLocationStore(s => s.locState)
  const requestLocation = useLocationStore(s => s.requestLocation)
  const skipLocation = useLocationStore(s => s.skipLocation)

  const catName = category.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())

  const handleFilterClick = (nextFilter: string) => {
    if (nextFilter === 'nearest' && locState !== 'active') {
      requestLocation(true)
      return
    }
    setFilter(nextFilter)
  }

  const { getLabel, getKm } = useDrivingDistances(position, providers)

  const enrichedProviders = useMemo(
    () =>
      providers.map(provider => ({
        ...provider,
        distance: getLabel(provider),
        _distKm: getKm(provider),
      })),
    [getKm, getLabel, providers],
  )

  const filteredProviders = useMemo(() => {
    let list = enrichedProviders.filter(provider => filter !== 'open' || provider.status === 'open')
    if (filter === 'nearest' && position) {
      list = [...list].sort((left, right) => (left._distKm ?? Number.MAX_SAFE_INTEGER) - (right._distKm ?? Number.MAX_SAFE_INTEGER))
    }
    if (filter === 'top-rated') {
      list = [...list].sort((left, right) => right.rating - left.rating)
    }
    return list
  }, [enrichedProviders, filter, position])

  const locationActive = locState === 'active'

  return (
    <AppLayout
      title={`${catName}s Near You`}
      status={providers.length > 0 ? `${providers.length} verified` : undefined}
      back
      notifCount={1}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: font.family }}>
        {(locState === 'idle' || locState === 'loading') && (
          <LocationBanner loading={locState === 'loading'} onAllow={() => requestLocation(true)} onSkip={skipLocation} />
        )}
        {locState === 'active' && <ActiveStrip onDismiss={skipLocation} />}
        {locState === 'denied' && <DeniedStrip onRetry={() => requestLocation(true)} />}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'open', 'top-rated', 'nearest'].map(option => {
            const isNearest = option === 'nearest'
            const isDisabled = isNearest && !locationActive
            const isActive = filter === option
            return (
              <button
                key={option}
                onClick={() => handleFilterClick(option)}
                title={isDisabled ? 'Allow location to sort by nearest' : undefined}
                style={{ padding: '7px 16px', borderRadius: radius.full, border: `1.5px solid ${isActive ? C.blue500 : C.border}`, background: isActive ? C.blue100 : '#fff', color: isActive ? C.blue500 : isDisabled ? C.textLight : C.textSub, fontSize: '13px', fontWeight: isActive ? 700 : 500, cursor: 'pointer', fontFamily: font.family, display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                {option === 'all' ? 'All Providers' : option === 'open' ? 'Open Now' : option === 'top-rated' ? 'Top Rated' : 'Nearest First'}
                {isNearest && locationActive && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <circle cx="5" cy="5" r="3" stroke={C.blue500} strokeWidth="1.2" />
                    <path d="M5 1v1M5 8v1M1 5h1M8 5h1" stroke={C.blue500} strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        {isLoading ? (
          <GGCard padding="32px">
            <div style={{ fontSize: '14px', color: C.textSub }}>Loading providers…</div>
          </GGCard>
        ) : isError ? (
          <GGCard padding="32px">
            <div style={{ fontSize: '14px', color: C.error }}>We could not load providers for this category.</div>
          </GGCard>
        ) : filteredProviders.length === 0 ? (
          <GGCard padding="48px" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', color: C.textSub }}>No {catName.toLowerCase()} providers found right now.</div>
            <GGButton variant="secondary" size="sm" onClick={() => navigate('/app/services')} style={{ marginTop: '16px' }}>
              Browse Other Categories
            </GGButton>
          </GGCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredProviders.map(provider => (
              <GGCard key={provider.id} padding="20px" onClick={() => navigate(`/app/services/provider/${provider.id}`, { state: { provider } })}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '14px', background: `linear-gradient(135deg, ${C.blue100}, ${C.bg})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                    {provider.logoUrl ? (
                      <img src={provider.logoUrl} alt={provider.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '22px', fontWeight: 800, color: C.blue500, fontFamily: font.family }}>{provider.name[0]}</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>{provider.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', minWidth: 0 }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}><path d="M6 1.5C4.07 1.5 2.5 3.07 2.5 5c0 2.5 3.5 6 3.5 6s3.5-3.5 3.5-6c0-1.93-1.57-3.5-3.5-3.5z" stroke={C.textSub} strokeWidth="1.1" /><circle cx="6" cy="5" r="1.5" stroke={C.textSub} strokeWidth="1.1" /></svg>
                          <span style={{ fontSize: '12px', color: C.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={provider.address}>
                            {truncate(provider.address, 52)}
                          </span>
                        </div>
                      </div>
                      <GGBadge type={provider.status === 'open' ? 'open' : 'closed'}>{provider.status}</GGBadge>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <StarRating rating={provider.rating} count={provider.reviews} />
                      {provider.distance && (
                        <span style={{ fontSize: '12px', color: C.blue500, fontWeight: 700 }}>{provider.distance}</span>
                      )}
                    </div>
                    {provider.services.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                        {provider.services.slice(0, 2).map(service => (
                          <span key={service} style={{ fontSize: '11px', color: C.textSub, background: C.bg, border: `1px solid ${C.border}`, padding: '3px 10px', borderRadius: radius.full, fontFamily: font.family }}>
                            {service}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </GGCard>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
