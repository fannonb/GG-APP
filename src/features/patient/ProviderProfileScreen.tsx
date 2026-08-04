import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { GGAvatar, GGBadge, GGButton, GGCard, StarRating } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { COUNTRIES, getCountryByName } from '@/config/countries'
import { useProvider, useProviderReviews, usePatientInvoices, useSubmitReviewMutation } from '@/hooks/api'
import { useResponsive } from '@/hooks/useResponsive'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { isMockApi } from '@/api/config'
import { DEMO_SP_PROVIDER_ID, useSPProfileStore } from '@/store/sp-profile.store'
import type { Provider } from '@/types/provider.types'
import { useLocationStore } from '@/store/location.store'
import { ProviderReviewForm } from '@/features/patient/components/ProviderReviewForm'
import { ProviderLocationMap } from '@/features/patient/components/ProviderLocationMap'
import { PharmacyPrescriptionUpload } from '@/features/patient/components/PharmacyPrescriptionUpload'
import { useReviewsStore } from '@/store/reviews.store'
import { useDrivingDistance } from '@/hooks/useDrivingDistance'
import { toGeoCoord } from '@/services/driving-distance'

function resolveCountryFromAddress(address: string): string | undefined {
  if (!address) return undefined
  const lower = address.toLowerCase()
  return COUNTRIES.find(c => lower.includes(c.name.toLowerCase()))?.name
}

function formatPhone(phone: string, country?: string, address?: string): { display: string; tel: string } {
  const raw = phone?.trim() ?? ''
  if (!raw) return { display: '—', tel: '' }
  // Already has a dial prefix — pass through
  if (raw.startsWith('+')) {
    return { display: raw, tel: raw.replace(/[\s\-(). ]/g, '') }
  }
  // Resolve country: explicit param first, then infer from address string
  const resolvedCountry = country || (address ? resolveCountryFromAddress(address) : undefined)
  const cfg = resolvedCountry ? getCountryByName(resolvedCountry) : undefined
  const display = cfg?.dial ? `${cfg.dial} ${raw}` : raw
  return { display, tel: display.replace(/[\s\-(). ]/g, '') }
}

const DAYS_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getTodayAbbr(): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]
}

type DayRow = { day: string; open: boolean; from: string; to: string }

function parseOpeningHours(
  openingHours?: Record<string, { open: boolean; from: string; to: string }>,
  hoursStr?: string,
): DayRow[] | null {
  if (openingHours) {
    return DAYS_ORDER.map(d => {
      const h = openingHours[d]
      return h ? { day: d, open: h.open, from: h.from, to: h.to } : { day: d, open: false, from: '', to: '' }
    })
  }
  if (!hoursStr || hoursStr === '—') return null
  if (hoursStr.toLowerCase() === '24/7') {
    return DAYS_ORDER.map(d => ({ day: d, open: true, from: '00:00', to: '23:59' }))
  }
  // Parse "Mon: 08:00-17:00, Tue: 08:00-17:00, ..." format
  if (hoursStr.includes(',')) {
    const map: Record<string, { from: string; to: string }> = {}
    for (const part of hoursStr.split(',')) {
      const colon = part.indexOf(':')
      if (colon === -1) continue
      const day = part.slice(0, colon).trim()
      const times = part.slice(colon + 1).trim()
      const [from, to] = times.replace('–', '-').split('-').map(s => s.trim())
      if (from && to) map[day] = { from, to }
    }
    return DAYS_ORDER.map(d => map[d]
      ? { day: d, open: true, from: map[d].from, to: map[d].to }
      : { day: d, open: false, from: '', to: '' }
    )
  }
  return null
}

function HoursTable({ rows, is24h }: { rows: DayRow[]; is24h?: boolean }) {
  const today = getTodayAbbr()
  if (is24h) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: C.blue100, borderRadius: radius.sm }}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke={C.blue500} strokeWidth="1.2"/><path d="M6.5 3.5v3l2 1.5" stroke={C.blue500} strokeWidth="1.2" strokeLinecap="round"/></svg>
        <span style={{ fontSize: '12px', fontWeight: 700, color: C.blue500, fontFamily: font.family }}>Open 24 hours, 7 days a week</span>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      {rows.map((row, i) => {
        const isToday = row.day === today
        return (
          <div
            key={row.day}
            style={{
              display: 'grid', gridTemplateColumns: '36px 1fr',
              gap: '8px', alignItems: 'center',
              padding: '5px 8px',
              borderRadius: '6px',
              background: isToday ? C.blue100 : 'transparent',
              borderBottom: i < rows.length - 1 && !isToday && rows[i + 1]?.day !== today
                ? `1px solid ${C.border}` : 'none',
            }}
          >
            <span style={{
              fontSize: '11px', fontWeight: isToday ? 800 : 600,
              color: isToday ? C.blue500 : C.textSub,
              fontFamily: font.family,
            }}>
              {row.day}
            </span>
            <span style={{
              fontSize: '12px', fontWeight: isToday ? 700 : 400,
              color: row.open ? (isToday ? C.blue500 : C.text) : C.textLight,
              fontFamily: font.family,
            }}>
              {row.open
                ? (row.from === '00:00' && row.to === '23:59' ? '24 hrs' : `${row.from} – ${row.to}`)
                : 'Closed'
              }
            </span>
          </div>
        )
      })}
    </div>
  )
}

const ABOUT_FALLBACK =
  'This provider is part of the GG’APP verified network. Profile details will appear here as soon as the practice completes its public profile.'

export function ProviderProfileScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const position = useLocationStore(s => s.position)
  const { id } = useParams<{ id: string }>()
  const { state } = useLocation() as { state?: { provider?: Provider } }
  const { data: fetchedProvider, isLoading } = useProvider(id)
  const provider = fetchedProvider ?? state?.provider ?? null
  const { data: reviews = [], isLoading: reviewsLoading } = useProviderReviews(provider?.id)
  const { data: patientInvoices = [] } = usePatientInvoices()
  const submitReviewMutation = useSubmitReviewMutation()
  const mockReviewedInvoiceIds = useReviewsStore(s => s.reviewedInvoiceIds)
  const [reviewFormDismissed, setReviewFormDismissed] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [logoPopupOpen, setLogoPopupOpen] = useState(false)

  const latestProviderInvoice = useMemo(() => {
    if (!provider) return null

    return patientInvoices.find(invoice =>
      invoice.providerId === provider.id
      && (invoice.status === 'authorized' || invoice.status === 'paid'),
    ) ?? null
  }, [patientInvoices, provider])

  const reviewableInvoice = useMemo(() => {
    if (!latestProviderInvoice) return null

    const alreadyReviewed = latestProviderInvoice.reviewSubmitted
      || (isMockApi && mockReviewedInvoiceIds.includes(latestProviderInvoice.id))

    return alreadyReviewed ? null : latestProviderInvoice
  }, [latestProviderInvoice, mockReviewedInvoiceIds])

  const showReviewForm = Boolean(reviewableInvoice) && !reviewFormDismissed

  useEffect(() => {
    setReviewFormDismissed(false)
    setReviewError(null)
  }, [reviewableInvoice?.id])

  const spStore = useSPProfileStore()
  const isDemoSP = isMockApi && provider?.id === DEMO_SP_PROVIDER_ID

  const providerCoord = useMemo(() => {
    if (!provider) return null
    const lat = isDemoSP ? spStore.lat : provider.lat
    const lng = isDemoSP ? spStore.lng : provider.lng
    return toGeoCoord(lat, lng)
  }, [provider, isDemoSP, spStore.lat, spStore.lng])

  const { label: drivingDistanceLabel } = useDrivingDistance(position, providerCoord, provider)

  if (isLoading && !provider) {
    return (
      <AppLayout title="Provider Profile" subtitle="Loading…" back notifCount={1}>
        <GGCard padding="28px">
          <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>Loading provider profile…</div>
        </GGCard>
      </AppLayout>
    )
  }

  if (!provider) {
    return (
      <AppLayout title="Provider Profile" subtitle="Not found" back notifCount={1}>
        <GGCard padding="28px">
          <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>This provider could not be found.</div>
        </GGCard>
      </AppLayout>
    )
  }

  const displayStatus = isDemoSP ? spStore.status : provider.status
  const displayAddress = isDemoSP ? spStore.address : provider.address
  const displayCountry = isDemoSP ? spStore.country : provider.country
  const rawPhone = isDemoSP ? spStore.phone : provider.phone
  const { display: displayPhone, tel: dialPhone } = formatPhone(rawPhone, displayCountry, displayAddress)
  const displayEstablishedYear = isDemoSP
    ? spStore.establishedYear
    : provider.establishedYear ?? 2009
  const displayAbout = provider.about?.trim() ? provider.about : ABOUT_FALLBACK
  const displayLanguages =
    provider.languages && provider.languages.length > 0
      ? provider.languages.join(' · ')
      : 'Languages not added yet'
  const mapLocation = {
    name: provider.name,
    address: displayAddress,
    lat: isDemoSP ? spStore.lat : provider.lat,
    lng: isDemoSP ? spStore.lng : provider.lng,
  }

  const avgRating = reviews.length
    ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10
    : provider.rating
  const reviewCount = reviews.length > 0 ? reviews.length : provider.reviews
  const isPharmacy = provider.category === 'pharmacy'

  const handleProfileReviewSubmit = async (rating: number, text: string) => {
    if (!provider || !reviewableInvoice) return

    setReviewError(null)

    try {
      await submitReviewMutation.mutateAsync({
        providerId: provider.id,
        invoiceId: reviewableInvoice.id,
        rating,
        text,
        providerName: provider.name,
      })
      setReviewFormDismissed(true)
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Unable to submit review. Please try again.')
    }
  }

  return (
    <AppLayout title={provider.name} subtitle={displayAddress} back notifCount={1}>
      {/* Logo popup */}
      {logoPopupOpen && provider.logoUrl && (
        <div
          onClick={() => setLogoPopupOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(8,21,40,0.72)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              background: '#fff',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(8,21,40,0.30)',
              maxWidth: 480,
              width: '100%',
            }}
          >
            <button
              type="button"
              onClick={() => setLogoPopupOpen(false)}
              style={{
                position: 'absolute', top: 12, right: 12,
                width: 32, height: 32,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 1,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
            <img
              src={provider.logoUrl}
              alt={provider.name}
              style={{ width: '100%', display: 'block', maxHeight: '70vh', objectFit: 'contain' }}
            />
            <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family }}>{provider.name}</div>
              <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', fontFamily: font.family, textTransform: 'capitalize' }}>{provider.category}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '24px', alignItems: 'start', fontFamily: font.family }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <GGCard padding="28px">
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div
                onClick={() => provider.logoUrl && setLogoPopupOpen(true)}
                style={{
                  width: 96, height: 96,
                  borderRadius: '20px',
                  background: `linear-gradient(135deg, ${C.blue100}, ${C.bg})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${C.border}`,
                  flexShrink: 0, overflow: 'hidden',
                  cursor: provider.logoUrl ? 'zoom-in' : 'default',
                  position: 'relative',
                  transition: 'box-shadow 0.18s',
                  boxShadow: '0 2px 10px rgba(9,28,68,0.06)',
                }}
                onMouseEnter={e => { if (provider.logoUrl) e.currentTarget.style.boxShadow = '0 4px 18px rgba(56,182,255,0.22)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(9,28,68,0.06)' }}
              >
                {provider.logoUrl ? (
                  <>
                    <img src={provider.logoUrl} alt={provider.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(56,182,255,0)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.18s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,182,255,0.12)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(56,182,255,0)' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ opacity: 0, transition: 'opacity 0.18s' }}
                        className="logo-zoom-icon">
                        <circle cx="10" cy="10" r="9" fill="rgba(0,0,0,0.38)"/>
                        <path d="M7 7h6M7 7v6M13 7l-6 6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: '36px', fontWeight: 800, color: C.blue500, fontFamily: font.family }}>{provider.name[0]}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>{provider.name}</div>
                    <div style={{ fontSize: '13px', color: C.textSub, marginTop: '4px', textTransform: 'capitalize' }}>{provider.category} · {displayAddress}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <GGBadge type={displayStatus === 'open' ? 'open' : 'closed'}>{displayStatus}</GGBadge>
                    <GGBadge type="info">Verified</GGBadge>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <StarRating rating={avgRating} count={reviewCount} />
                  <a
                    href={dialPhone ? `tel:${dialPhone}` : undefined}
                    style={{ fontSize: '13px', color: C.blue500, fontWeight: 600, textDecoration: 'none', fontFamily: font.family, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 1h2.5l1 2.5-1.5 1c.5 1 1.5 2 2.5 2.5l1-1.5L10 7.5V10c-4 .5-8.5-3-8-9z" stroke={C.blue500} strokeWidth="1.1" strokeLinejoin="round"/></svg>
                    {displayPhone}
                  </a>
                </div>
              </div>
            </div>
          </GGCard>

          <GGCard padding="24px">
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '12px' }}>About Us</div>
            <div style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.7, marginBottom: '16px', fontFamily: font.family }}>
              {displayAbout}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {[
                {
                  label: `Established ${displayEstablishedYear}`,
                  icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="10" rx="1.5" stroke={C.blue500} strokeWidth="1.2" /><path d="M1 6h12" stroke={C.blue500} strokeWidth="1.1" /><line x1="4" y1="2" x2="4" y2="4" stroke={C.blue500} strokeWidth="1.2" strokeLinecap="round" /><line x1="10" y1="2" x2="10" y2="4" stroke={C.blue500} strokeWidth="1.2" strokeLinecap="round" /></svg>,
                },
                {
                  label: displayLanguages,
                  icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke={C.blue500} strokeWidth="1.2" /><path d="M7 1.5c-2 1.5-3 3.2-3 5.5s1 4 3 5.5" stroke={C.blue500} strokeWidth="1.1" strokeLinecap="round" /><path d="M7 1.5c2 1.5 3 3.2 3 5.5s-1 4-3 5.5" stroke={C.blue500} strokeWidth="1.1" strokeLinecap="round" /><path d="M1.5 7h11" stroke={C.blue500} strokeWidth="1.1" /></svg>,
                },
                {
                  label: `Lic: ${provider.license ?? 'Not assigned'}`,
                  icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L2 3.5v4c0 3 2.2 5.3 5 5.8 2.8-.5 5-2.8 5-5.8v-4L7 1z" stroke={C.blue500} strokeWidth="1.2" fill="none" /><path d="M4.5 7l2 2 3-3" stroke={C.success} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
                },
              ].map(item => (
                <div key={item.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: radius.full, background: C.blue100, border: '1px solid rgba(74,173,223,0.2)', fontSize: '12px', color: C.blue500, fontFamily: font.family, fontWeight: 600 }}>
                  {item.icon}
                  {item.label}
                </div>
              ))}
            </div>
          </GGCard>

          <GGCard padding="24px">
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '16px' }}>Services Offered</div>
            {provider.services.length === 0 ? (
              <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>No services listed yet.</div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {provider.services.map(service => (
                  <div key={service} style={{ padding: '8px 16px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: radius.full, fontSize: '13px', color: C.text, fontWeight: 500, fontFamily: font.family }}>
                    {service}
                  </div>
                ))}
              </div>
            )}
          </GGCard>

          <ProviderLocationMap location={mapLocation} />

          <GGCard padding="24px">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Patient Reviews</div>
              {reviewCount > 0 && (
                <div style={{ fontSize: '12px', color: C.textSub, fontWeight: 500 }}>
                  {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                </div>
              )}
            </div>
            {reviewsLoading ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: C.textSub, fontSize: '13px' }}>
                Loading reviews…
              </div>
            ) : (
              <>
                {showReviewForm && (
                  <div style={{ marginBottom: reviews.length > 0 ? '20px' : 0 }}>
                    <ProviderReviewForm
                      providerName={provider.name}
                      compact
                      isSubmitting={submitReviewMutation.isPending}
                      error={reviewError}
                      onSubmit={handleProfileReviewSubmit}
                      onSkip={() => setReviewFormDismissed(true)}
                    />
                  </div>
                )}
                {reviews.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', borderTop: showReviewForm ? `1px solid ${C.border}` : 'none', paddingTop: showReviewForm ? '16px' : 0 }}>
                    {reviews.map((review, index) => (
                      <div key={review.id} style={{ padding: '16px 0', borderBottom: index < reviews.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <GGAvatar name={review.name} size={32} />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{review.name}</div>
                              <div style={{ fontSize: '11px', color: C.textSub }}>{review.date}</div>
                            </div>
                          </div>
                          <StarRating rating={review.rating} />
                        </div>
                        <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6 }}>{review.text}</div>
                      </div>
                    ))}
                  </div>
                ) : !showReviewForm ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: C.textSub, fontSize: '13px' }}>
                    No reviews yet. Be the first to share your experience.
                  </div>
                ) : null}
              </>
            )}
          </GGCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <GGCard padding="24px" style={{ position: isMobile ? 'static' : 'sticky', top: '20px' }}>
            {isPharmacy ? (
              <PharmacyPrescriptionUpload provider={provider} />
            ) : (
              <>
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '16px' }}>Request Appointment</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '20px' }}>
                  {[
                    { label: 'Status', val: <GGBadge type={displayStatus === 'open' ? 'open' : 'closed'}>{displayStatus}</GGBadge> },
                    { label: 'Distance', val: drivingDistanceLabel },
                    { label: 'Phone', val: (
                      <a
                        href={dialPhone ? `tel:${dialPhone}` : undefined}
                        style={{ color: C.blue500, fontWeight: 700, textDecoration: 'none', fontFamily: font.family, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M2 1h2.5l1 2.5-1.5 1c.5 1 1.5 2 2.5 2.5l1-1.5L10 7.5V10c-4 .5-8.5-3-8-9z" stroke={C.blue500} strokeWidth="1.2" strokeLinejoin="round"/></svg>
                        {displayPhone}
                      </a>
                    ) },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>{item.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{item.val}</span>
                    </div>
                  ))}
                </div>

                {(() => {
                  const rows = parseOpeningHours(provider.openingHours, provider.hours)
                  const is24h = provider.hours?.toLowerCase() === '24/7' ||
                    rows?.every(r => r.open && r.from === '00:00' && r.to === '23:59')
                  return (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke={C.textSub} strokeWidth="1.2"/><path d="M6.5 3.5v3l2 1.5" stroke={C.textSub} strokeWidth="1.2" strokeLinecap="round"/></svg>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: font.family }}>Opening Hours</span>
                      </div>
                      {rows
                        ? <HoursTable rows={rows} is24h={is24h} />
                        : <span style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>{provider.hours || '—'}</span>
                      }
                    </div>
                  )
                })()}
                <div style={{ padding: '12px 14px', background: C.blue100, borderRadius: radius.sm, marginBottom: '16px', fontSize: '12px', color: '#1A5D8A', lineHeight: 1.5 }}>
                  GG'APP credit accepted. No upfront payment required at this provider.
                </div>
                <GGButton variant="primary" size="md" fullWidth onClick={() => navigate('/app/booking', { state: { provider } })}>
                  Engage Provider →
                </GGButton>
              </>
            )}
          </GGCard>

          {isPharmacy && (
            <GGCard padding="24px">
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '16px' }}>Pharmacy Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '16px' }}>
                {[
                  { label: 'Status', val: <GGBadge type={displayStatus === 'open' ? 'open' : 'closed'}>{displayStatus}</GGBadge> },
                  { label: 'Distance', val: drivingDistanceLabel },
                  { label: 'Phone', val: displayPhone },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>{item.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{item.val}</span>
                  </div>
                ))}
              </div>
              {(() => {
                const rows = parseOpeningHours(provider.openingHours, provider.hours)
                const is24h = provider.hours?.toLowerCase() === '24/7' ||
                  rows?.every(r => r.open && r.from === '00:00' && r.to === '23:59')
                return rows ? <HoursTable rows={rows} is24h={is24h} /> : (
                  <span style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>{provider.hours || '—'}</span>
                )
              })()}
            </GGCard>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
