import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { GGAvatar, GGCard, StarRating } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { COUNTRIES, getCountryByCode, getCountryByName } from '@/config/countries'
import { useProvider, useProviderReviews, usePatientInvoices, useSubmitReviewMutation } from '@/hooks/api'
import { useResponsive } from '@/hooks/useResponsive'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { isMockApi } from '@/api/config'
import { DEMO_SP_PROVIDER_ID, useSPProfileStore } from '@/store/sp-profile.store'
import { providerHasCategory, type Provider } from '@/types/provider.types'
import { useUserStore } from '@/store/user.store'
import { formatAmount } from '@/utils/format'
import { useLocationStore } from '@/store/location.store'
import { ProviderReviewForm } from '@/features/patient/components/ProviderReviewForm'
import { ProviderLocationMap } from '@/features/patient/components/ProviderLocationMap'
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

const CYAN_DEEP = '#0B7BC0'
const CYAN_MID = '#1A9BE6'
const REVIEW_PREVIEW = 3
const DAY_NAMES: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }

function to12h(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h)) return hhmm
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m || 0).padStart(2, '0')} ${suffix}`
}

/** "Open now · until 5:00 PM" style status from the weekly hours; falls back to the provider's manual status. */
function describeOpenNow(rows: DayRow[] | null, manualStatus: string): { text: string; open: boolean } {
  if (!rows) return { text: manualStatus === 'open' ? 'Open' : 'Closed', open: manualStatus === 'open' }
  if (rows.every(r => r.open && r.from === '00:00' && r.to === '23:59')) return { text: 'Open 24 hours', open: true }

  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + (m || 0)
  }
  const todayIdx = DAYS_ORDER.indexOf(getTodayAbbr())
  const today = rows[todayIdx]

  if (today?.open && today.from && today.to) {
    if (minutes >= toMin(today.from) && minutes < toMin(today.to)) {
      return { text: `Open now · until ${to12h(today.to)}`, open: true }
    }
    if (minutes < toMin(today.from)) {
      return { text: `Closed · opens today at ${to12h(today.from)}`, open: false }
    }
  }
  for (let step = 1; step <= 7; step++) {
    const row = rows[(todayIdx + step) % 7]
    if (row?.open && row.from) {
      const when = step === 1 ? 'tomorrow' : DAY_NAMES[row.day] ?? row.day
      return { text: `Closed · opens ${when} at ${to12h(row.from)}`, open: false }
    }
  }
  return { text: 'Closed', open: false }
}

/** "Fannon Benjamin" → "Fannon B." so reviews don't publish full names. */
function shortName(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return parts[0] ?? 'Patient'
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

const primaryBtn: React.CSSProperties = {
  width: '100%',
  height: 46,
  borderRadius: radius.sm,
  border: 'none',
  background: `linear-gradient(135deg, ${CYAN_MID} 0%, ${CYAN_DEEP} 100%)`,
  boxShadow: '0 6px 16px rgba(11,123,192,0.28)',
  color: '#fff',
  fontSize: 15,
  fontWeight: 700,
  fontFamily: font.family,
  cursor: 'pointer',
}

const secondaryBtn: React.CSSProperties = {
  ...primaryBtn,
  height: 44,
  background: '#fff',
  boxShadow: 'none',
  border: '1px solid rgba(11,123,192,0.35)',
  color: CYAN_DEEP,
  fontSize: 14,
}

export function ProviderProfileScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const position = useLocationStore(s => s.position)
  const user = useUserStore(s => s.user)
  const { id } = useParams<{ id: string }>()
  const { state } = useLocation() as { state?: { provider?: Provider } }
  const { data: fetchedProvider, isLoading } = useProvider(id)
  const provider = fetchedProvider ?? state?.provider ?? null
  const { data: reviews = [], isLoading: reviewsLoading } = useProviderReviews(provider?.id)
  const { data: patientInvoices = [] } = usePatientInvoices()
  const submitReviewMutation = useSubmitReviewMutation()
  const mockReviewedInvoiceIds = useReviewsStore(s => s.reviewedInvoiceIds)
  // Remember which invoice's review prompt was dismissed so a newer paid visit can prompt again.
  const [dismissedReviewInvoiceId, setDismissedReviewInvoiceId] = useState<string | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [logoPopupOpen, setLogoPopupOpen] = useState(false)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [showHours, setShowHours] = useState(false)

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

  const showReviewForm = Boolean(reviewableInvoice) && dismissedReviewInvoiceId !== reviewableInvoice?.id

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
      <AppLayout title="Provider" back notifCount={1}>
        <GGCard padding="28px">
          <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>Loading provider profile…</div>
        </GGCard>
      </AppLayout>
    )
  }

  if (!provider) {
    return (
      <AppLayout title="Provider" back notifCount={1}>
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
  const displayEstablishedYear = isDemoSP ? spStore.establishedYear : provider.establishedYear ?? 2009
  const displayAbout = provider.about?.trim() ? provider.about : ABOUT_FALLBACK
  const displayLanguages = provider.languages && provider.languages.length > 0
    ? provider.languages.join(' · ')
    : 'Languages not added yet'
  const mapLocation = {
    name: provider.name,
    address: displayAddress,
    lat: isDemoSP ? spStore.lat : provider.lat,
    lng: isDemoSP ? spStore.lng : provider.lng,
  }

  const categoryLabels = Array.from(new Set([provider.category, ...(provider.categories ?? [])]))
  // Pharmacy can be the main category or one of several (e.g. a hospital with an in-house pharmacy).
  const offersPharmacy = providerHasCategory(provider, 'pharmacy')
    || provider.services.some(service => /pharmac/i.test(service))
  const pharmacyOnly = provider.category === 'pharmacy' && (provider.categories ?? []).every(c => c === 'pharmacy')
  const services = provider.services.filter(service =>
    !categoryLabels.some(cat => cat.toLowerCase() === service.toLowerCase()))

  const hourRows = parseOpeningHours(provider.openingHours, provider.hours)
  const is24h = provider.hours?.toLowerCase() === '24/7'
    || (hourRows?.every(r => r.open && r.from === '00:00' && r.to === '23:59') ?? false)
  const openNow = describeOpenNow(hourRows, displayStatus)
  const todayRow = hourRows?.find(r => r.day === getTodayAbbr())

  const avgRating = reviews.length
    ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10
    : provider.rating
  const reviewCount = reviews.length > 0 ? reviews.length : provider.reviews
  const starCounts = [5, 4, 3, 2, 1].map(star => ({ star, count: reviews.filter(r => Math.round(r.rating) === star).length }))
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, REVIEW_PREVIEW)

  const userCountry = getCountryByCode(user.countryCode)
  const hasCredit = user.creditStatus === 'approved'

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
      setDismissedReviewInvoiceId(reviewableInvoice?.id ?? null)
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Unable to submit review. Please try again.')
    }
  }

  const bookVisit = () => navigate('/app/booking', { state: { provider, intent: 'appointment' } })
  const sendPrescription = () => navigate('/app/booking', { state: { provider, intent: 'prescription' } })

  const actionPanel = (
    <GGCard padding="22px" style={{ position: isMobile ? 'static' : 'sticky', top: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: openNow.open ? '#16A34A' : '#B45309', flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: openNow.open ? '#15803D' : '#B45309' }}>{openNow.text}</span>
      </div>

      <div style={{ marginTop: 14, padding: '12px 14px', background: C.blue100, borderRadius: radius.sm, fontSize: 13, color: '#1A5D8A', lineHeight: 1.5 }}>
        <strong>GG&apos;APP credit accepted.</strong> No payment at the counter.
        {hasCredit && (
          <div style={{ marginTop: 2 }}>
            You have <strong>{formatAmount(user.creditAvailable, userCountry?.currencySymbol ?? '')}</strong> available.
          </div>
        )}
      </div>

      {!isMobile && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        {!pharmacyOnly && (
          <button type="button" style={primaryBtn} onClick={bookVisit}>
            Book a visit
          </button>
        )}
        {offersPharmacy && (
          <button type="button" style={pharmacyOnly ? primaryBtn : secondaryBtn} onClick={sendPrescription}>
            Send a prescription
          </button>
        )}
      </div>
      )}

      {hourRows && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          <button
            type="button"
            onClick={() => setShowHours(v => !v)}
            aria-expanded={showHours}
            style={{ all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: font.family }}
          >
            <span style={{ fontSize: 13, color: C.textSub }}>
              Hours today:{' '}
              <strong style={{ color: C.text }}>
                {is24h ? 'Open 24 hours' : todayRow?.open ? `${to12h(todayRow.from)} – ${to12h(todayRow.to)}` : 'Closed'}
              </strong>
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: CYAN_DEEP }}>{showHours ? 'Hide' : 'All hours'}</span>
          </button>
          {showHours && <div style={{ marginTop: 10 }}><HoursTable rows={hourRows} is24h={is24h} /></div>}
        </div>
      )}
    </GGCard>
  )

  return (
    <AppLayout title="Provider" back notifCount={1}>
      {logoPopupOpen && provider.logoUrl && (
        <div
          onClick={() => setLogoPopupOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(8,21,40,0.72)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(8,21,40,0.30)', maxWidth: 480, width: '100%' }}>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setLogoPopupOpen(false)}
              style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1 }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
            <img src={provider.logoUrl} alt={provider.name} style={{ width: '100%', display: 'block', maxHeight: '70vh', objectFit: 'contain' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 2fr) minmax(300px, 1fr)', gap: 24, alignItems: 'start', fontFamily: font.family }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <GGCard padding={isMobile ? '20px' : '24px'}>
            <div style={{ display: 'flex', gap: isMobile ? 14 : 20, alignItems: 'flex-start' }}>
              <button
                type="button"
                onClick={() => provider.logoUrl && setLogoPopupOpen(true)}
                aria-label={provider.logoUrl ? `View ${provider.name} logo` : undefined}
                style={{ all: 'unset', width: isMobile ? 72 : 88, height: isMobile ? 72 : 88, borderRadius: 18, background: `linear-gradient(135deg, ${C.blue100}, ${C.bg})`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}`, flexShrink: 0, overflow: 'hidden', cursor: provider.logoUrl ? 'zoom-in' : 'default' }}
              >
                {provider.logoUrl
                  ? <img src={provider.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 32, fontWeight: 800, color: CYAN_DEEP }}>{provider.name[0]}</span>}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h1 style={{ margin: 0, fontSize: isMobile ? 19 : 22, fontWeight: 800, color: C.text, letterSpacing: '-0.015em' }}>{provider.name}</h1>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: radius.full, color: '#15803D', background: 'rgba(34,197,94,0.12)' }}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M3 7.25l2.5 2.5L11 4.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Verified
                  </span>
                </div>
                <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, lineHeight: 1.5 }}>
                  <span style={{ textTransform: 'capitalize' }}>{categoryLabels.join(', ')}</span> · {displayAddress}
                  {drivingDistanceLabel && drivingDistanceLabel !== '—' ? ` · ${drivingDistanceLabel}` : ''}
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <a href="#reviews" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <StarRating rating={avgRating} count={reviewCount} />
                  </a>
                  {dialPhone && (
                    <a href={`tel:${dialPhone}`} style={{ fontSize: 13, color: CYAN_DEEP, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M2 1h2.5l1 2.5-1.5 1c.5 1 1.5 2 2.5 2.5l1-1.5L10 7.5V10c-4 .5-8.5-3-8-9z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" /></svg>
                      {displayPhone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </GGCard>

          {isMobile && actionPanel}

          <GGCard padding="24px">
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>About</div>
            <div style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7, marginBottom: 14 }}>{displayAbout}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, color: C.textSub }}>
              {[`Established ${displayEstablishedYear}`, displayLanguages, `Licence ${provider.license ?? 'not added'}`].map(label => (
                <span key={label} style={{ padding: '5px 11px', borderRadius: radius.full, background: C.bg, fontWeight: 600 }}>{label}</span>
              ))}
            </div>
            {services.length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '18px 0 8px' }}>Services</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {services.map(service => (
                    <span key={service} style={{ padding: '6px 14px', background: C.blue100, borderRadius: radius.full, fontSize: 13, color: CYAN_DEEP, fontWeight: 600 }}>
                      {service}
                    </span>
                  ))}
                </div>
              </>
            )}
          </GGCard>

          <ProviderLocationMap location={mapLocation} />

          <GGCard padding="24px">
            <div id="reviews" style={{ scrollMarginTop: 80 }} />
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 14 }}>Patient reviews</div>
            {reviewsLoading ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: C.textSub, fontSize: 13 }}>Loading reviews…</div>
            ) : (
              <>
                {reviews.length > 0 && (
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 16, marginBottom: 4, borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontSize: 36, fontWeight: 800, color: C.text, lineHeight: 1 }}>{avgRating.toFixed(1)}</div>
                      <div style={{ marginTop: 6 }}><StarRating rating={avgRating} /></div>
                      <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {starCounts.map(({ star, count }) => (
                        <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.textSub }}>
                          <span style={{ width: 22 }}>{star}★</span>
                          <div style={{ flex: 1, height: 6, borderRadius: radius.full, background: C.bg, overflow: 'hidden' }}>
                            <div style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%`, height: '100%', background: '#F59E0B', borderRadius: radius.full }} />
                          </div>
                          <span style={{ width: 18, textAlign: 'right' }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showReviewForm && (
                  <div style={{ margin: '12px 0' }}>
                    <ProviderReviewForm
                      providerName={provider.name}
                      compact
                      isSubmitting={submitReviewMutation.isPending}
                      error={reviewError}
                      onSubmit={handleProfileReviewSubmit}
                      onSkip={() => setDismissedReviewInvoiceId(reviewableInvoice?.id ?? null)}
                    />
                  </div>
                )}

                {reviews.length > 0 ? (
                  <div>
                    {visibleReviews.map((review, index) => (
                      <div key={review.id} style={{ padding: '14px 0', borderBottom: index < visibleReviews.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <GGAvatar name={review.name} size={32} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{shortName(review.name)}</div>
                              <div style={{ fontSize: 11, color: C.textSub }}>
                                {review.date} · <span style={{ color: '#15803D', fontWeight: 600 }}>Verified visit</span>
                              </div>
                            </div>
                          </div>
                          <StarRating rating={review.rating} />
                        </div>
                        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{review.text}</div>
                      </div>
                    ))}
                    {reviews.length > REVIEW_PREVIEW && (
                      <button
                        type="button"
                        onClick={() => setShowAllReviews(v => !v)}
                        style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, color: CYAN_DEEP, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}
                      >
                        {showAllReviews ? 'Show fewer reviews' : `See all ${reviews.length} reviews`}
                      </button>
                    )}
                  </div>
                ) : !showReviewForm ? (
                  <div style={{ padding: '16px 0', textAlign: 'center', color: C.textSub, fontSize: 13 }}>
                    No reviews yet. Patients can review after a paid visit.
                  </div>
                ) : null}
              </>
            )}
          </GGCard>
        </div>

        {!isMobile && actionPanel}
      </div>

      {isMobile && (
        <>
          {/* Keeps the last card clear of the fixed action bar. */}
          <div aria-hidden style={{ height: 76 }} />
          <div
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 54,
              zIndex: 29,
              display: 'flex',
              gap: 8,
              padding: '10px 16px',
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(6px)',
              borderTop: `1px solid ${C.border}`,
            }}
          >
            {!pharmacyOnly && (
              <button type="button" style={{ ...primaryBtn, height: 44, flex: 1 }} onClick={bookVisit}>
                Book a visit
              </button>
            )}
            {offersPharmacy && (
              <button type="button" style={{ ...(pharmacyOnly ? primaryBtn : secondaryBtn), height: 44, flex: 1 }} onClick={sendPrescription}>
                Send a prescription
              </button>
            )}
          </div>
        </>
      )}
    </AppLayout>
  )
}
