import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGBadge } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency } from '@/utils/format'
import { getCountryByCode } from '@/config/countries'
import { AdBannerStrip } from '@/components/AdBanner'
import { HealthNewsSection } from '@/components/HealthNewsSection'
import { FlagImg } from '@/components/FlagImg'
import { DashboardAppointmentsCard } from '@/features/patient/components/DashboardAppointmentsCard'
import { PrescriptionStatusBanner } from '@/components/PrescriptionStatusBanner'
import { ROUTES, route } from '@/router/routes'
import {
  useAuthStore,
  deriveOnboardingStepStatus,
  isOnboardingComplete,
  ONBOARDING_STEP_COUNT,
} from '@/store/auth.store'
import { useAdsStore } from '@/store/ads.store'
import { EMPTY_PATIENT, getPatientFirstName } from '@/features/patient/patientAccount'
import { useMarkPatientNotificationReadMutation, usePatientInvoices, usePatientPrescriptionRequests } from '@/hooks/api'
import { useNotificationsStore } from '@/store/notifications.store'
import {
  buildPrescriptionQuoteBannerItems,
  isSyntheticPrescriptionBannerId,
} from '@/utils/prescription-notifications'
import type { Patient } from '@/types/user.types'

const SEEN_PRESCRIPTION_QUOTE_KEY = 'ggapp.seenPrescriptionQuoteNotifications'

function loadSeenPrescriptionQuotes(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(SEEN_PRESCRIPTION_QUOTE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((id: unknown) => typeof id === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function saveSeenPrescriptionQuotes(ids: Set<string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SEEN_PRESCRIPTION_QUOTE_KEY, JSON.stringify(Array.from(ids)))
}

// ─── Service categories ───────────────────────────────────────────────────────
const categories = [
  { id: 'pharmacy',           label: 'Pharmacy',           isComingSoon: false },
  { id: 'laboratory',         label: 'Laboratory',         isComingSoon: false },
  { id: 'doctor',             label: 'Doctor',             isComingSoon: false },
  { id: 'radiology',          label: 'Radiology',          isComingSoon: false },
  { id: 'hospital',           label: 'Hospital',           isComingSoon: false },
  { id: 'clinic',             label: 'Clinic',             isComingSoon: false },
  { id: 'global_specialists', label: 'Global Specialists', isComingSoon: true  },
]

const catIcons: Record<string, React.ReactNode> = {
  pharmacy:           <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="4" y="4" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5"/><line x1="13" y1="8" x2="13" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="8" y1="13" x2="18" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  laboratory:         <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M10 4v9L5 20a2 2 0 001.8 2.9h12.4A2 2 0 0021 20l-5-7V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="10" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  doctor:             <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="9" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M5 22c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="18" cy="18" r="3" fill="white" stroke="currentColor" strokeWidth="1.5"/><path d="M18 16.5v1.5h1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  radiology:          <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M13 8v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="13" cy="13" r="1.5" fill="currentColor"/></svg>,
  hospital:           <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="4" y="6" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M10 22V14h6v8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><line x1="13" y1="10" x2="13" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="11" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M4 12h18" stroke="currentColor" strokeWidth="1.5"/></svg>,
  clinic:             <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M13 4L5 9v13h5v-5h6v5h5V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><line x1="13" y1="9" x2="13" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="10.5" y1="11.5" x2="15.5" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  global_specialists: <svg width="26" height="26" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.8"/><path d="M16 5a15 15 0 000 22M5 16h22M8 10a18 18 0 0016 0M8 22a18 18 0 0016 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
}

// ─── Onboarding steps ─────────────────────────────────────────────────────────
const SETUP_STEP_DEFS = [
  { n: 1, label: 'Create Account',         desc: 'Personal details, email and password registered.',             cta: null,               ctaPath: null },
  { n: 2, label: 'Verify Email',           desc: 'Your email address has been confirmed.',                       cta: null,               ctaPath: null },
  { n: 3, label: 'Set Payment PIN',        desc: 'A 4–6 digit PIN required before you can authorise payments.',  cta: 'Set Up PIN →',     ctaPath: null },
  { n: 4, label: 'Apply for Credit',       desc: 'Submit your application so funds can be loaded to your wallet.', cta: 'Apply Now →',      ctaPath: '/app/credit/disclaimer' },
  { n: 5, label: 'Book First Appointment', desc: 'Find a verified provider near you and book your first visit.', cta: 'Browse Providers →', ctaPath: '/app/services' },
] as const

// ─── Component ────────────────────────────────────────────────────────────────
interface NewUserDashboardScreenProps {
  user?: Patient
}

export function NewUserDashboardScreen({
  user = EMPTY_PATIENT,
}: NewUserDashboardScreenProps) {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const { onboardingCompletedSteps, completeOnboardingStep } = useAuthStore()
  const adVersion = useAdsStore(s => s.version)
  const u = user
  const country = getCountryByCode(u.countryCode)
  const currency = country?.currencySymbol ?? 'Z$'
  const patientNotifs = useNotificationsStore(s => s.patientNotifs)
  const markNotificationRead = useMarkPatientNotificationReadMutation()
  const { data: invoices = [] } = usePatientInvoices()
  const { data: prescriptionRequests = [] } = usePatientPrescriptionRequests()
  const [seenPrescriptionQuoteIds, setSeenPrescriptionQuoteIds] = useState<Set<string>>(
    () => loadSeenPrescriptionQuotes(),
  )
  const prescriptionQuoteItems = buildPrescriptionQuoteBannerItems(
    patientNotifs,
    prescriptionRequests,
    seenPrescriptionQuoteIds,
  )
  const pendingInvoices = invoices.filter(inv => {
    if (inv.status !== 'pending_auth') return false
    if (inv.isPrescription && !inv.prescriptionQuoteReviewed) return false
    return true
  })
  const pendingInvoice = pendingInvoices[0]
  const pendingInvoiceCount = pendingInvoices.length
  const effectiveCompletedSteps =
    u.hasPaymentPin && !onboardingCompletedSteps.includes(3)
      ? [...onboardingCompletedSteps, 3]
      : onboardingCompletedSteps

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const today    = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const setupSteps = SETUP_STEP_DEFS.map(step => ({
    ...step,
    status: deriveOnboardingStepStatus(step.n, effectiveCompletedSteps),
  }))
  const doneCount = setupSteps.filter(s => s.status === 'done').length
  const onboardingComplete = isOnboardingComplete(effectiveCompletedSteps)
  const pinStepDone = u.hasPaymentPin || onboardingCompletedSteps.includes(3)

  const markPrescriptionQuoteSeen = (id: string) => {
    setSeenPrescriptionQuoteIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveSeenPrescriptionQuotes(next)
      return next
    })
  }

  const handlePrescriptionQuoteDismiss = (items: { id: string }[]) => {
    items.forEach(item => {
      markPrescriptionQuoteSeen(item.id)
      if (!isSyntheticPrescriptionBannerId(item.id)) {
        markNotificationRead.mutate(item.id)
      }
    })
  }

  const handlePrescriptionQuoteAction = (items: { id: string; screen?: string }[]) => {
    items.forEach(item => {
      markPrescriptionQuoteSeen(item.id)
      if (!isSyntheticPrescriptionBannerId(item.id)) {
        markNotificationRead.mutate(item.id)
      }
    })
    navigate(items[0]?.screen ?? ROUTES.PRESCRIPTION_REQUESTS)
  }

  const handleStepAction = (stepN: number, ctaPath: string | null) => {
    if (stepN === 3) {
      navigate(ROUTES.SECURITY_PIN, {
        state: {
          returnTo: ROUTES.DASHBOARD,
        },
      })
      return
    }
    completeOnboardingStep(stepN)
    if (ctaPath) navigate(ctaPath)
  }

  return (
    <AppLayout title="Dashboard" subtitle="Get started with GG'APP" notifCount={1}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* ── 1. Greeting ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>
                {greeting}, {getPatientFirstName(u)}!
              </div>
              {country && (
                <FlagImg
                  code={country.code}
                  size={isMobile ? 18 : 20}
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.12)', borderRadius: '3px' }}
                />
              )}
            </div>
            <div style={{ fontSize: '14px', color: C.textSub, marginTop: '4px' }}>{today}</div>
          </div>
          <GGBadge type={onboardingComplete ? 'success' : 'info'}>
            {onboardingComplete ? 'Setup Complete' : 'Getting Started'}
          </GGBadge>
        </div>

        {/* ── 2. Stat tiles ────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: '12px' }}>
          <div style={{ padding: isMobile ? '14px 16px' : '20px 22px', background: '#fff', borderRadius: radius.lg, border: `1px dashed ${C.border}`, boxShadow: shadow.sm, gridColumn: isMobile ? 'span 2' : 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <div style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Available Balance</div>
              {country && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '1px 6px', borderRadius: '20px', background: C.bg, border: `1px solid ${C.border}`, flexShrink: 0 }}>
                  <FlagImg code={country.code} size={12} />
                  <span style={{ fontSize: '9px', fontWeight: 700, color: C.textSub, fontFamily: font.family }}>{country.currencyCode}</span>
                </div>
              )}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: C.textLight, letterSpacing: '-0.03em', lineHeight: 1 }}>Not Applied</div>
            <div style={{ marginTop: '8px' }}>
              <span onClick={() => navigate('/app/credit/disclaimer')} style={{ fontSize: '12px', color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>Apply for credit →</span>
            </div>
          </div>
          <div style={{ padding: isMobile ? '14px 16px' : '20px 22px', background: '#fff', borderRadius: radius.lg, border: `1px dashed ${C.border}`, boxShadow: shadow.sm }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Spent This Month</div>
            <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 800, color: C.textLight, letterSpacing: '-0.04em', lineHeight: 1 }}>—</div>
            <div style={{ fontSize: '12px', color: C.textLight, marginTop: '6px' }}>No transactions yet</div>
          </div>
          <div style={{ padding: isMobile ? '14px 16px' : '20px 22px', background: '#fff', borderRadius: radius.lg, border: `1px dashed ${C.border}`, boxShadow: shadow.sm }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Next Appointment</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: C.textLight, letterSpacing: '-0.03em', lineHeight: 1 }}>None booked</div>
            <div style={{ marginTop: '8px' }}>
              <span onClick={() => navigate('/app/services')} style={{ fontSize: '12px', color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>Find a service →</span>
            </div>
          </div>
        </div>

        {/* ── 3. Action banner — Set Payment PIN ───────────────────────────── */}
        {!pinStepDone && (
          <div style={{ padding: '18px 22px', background: `linear-gradient(90deg, ${C.warningBg}, #FFFAE8)`, borderRadius: radius.lg, border: '1.5px solid rgba(245,166,35,0.35)', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 10px rgba(245,166,35,0.12)' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(245,166,35,0.35)' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="9" width="14" height="9" rx="2" stroke="#fff" strokeWidth="1.5"/>
                <path d="M7 9V6a3 3 0 016 0v3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="10" cy="13.5" r="1.2" fill="#fff"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#8A4D00', marginBottom: '2px' }}>Action Required: Set Your Payment PIN</div>
              <div style={{ fontSize: '13px', color: '#8A4D00', lineHeight: 1.5 }}>Create a 4–6 digit PIN — required before you can authorise any healthcare payment.</div>
            </div>
            <GGButton
              variant="warning"
              size="sm"
              style={{ background: '#F59E0B', color: '#fff', boxShadow: '0 2px 8px rgba(245,166,35,0.3)', flexShrink: 0 }}
              onClick={() => handleStepAction(3, ROUTES.SECURITY_PIN)}
            >
              Set Up PIN →
            </GGButton>
          </div>
        )}

        {prescriptionQuoteItems.length > 0 && (
          <PrescriptionStatusBanner
            variant="quote"
            items={prescriptionQuoteItems}
            onAction={handlePrescriptionQuoteAction}
            onDismiss={handlePrescriptionQuoteDismiss}
          />
        )}

        {/* ── Pending invoice banner ───────────────────────────────────────── */}
        {pendingInvoice && (
          <div style={{ padding: '14px 20px', background: `linear-gradient(90deg, ${C.warningBg}, #FFF8E0)`, borderRadius: radius.sm, border: `1px solid rgba(245,166,35,0.25)`, display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3l6 10H2z" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinejoin="round" /><line x1="8" y1="7.5" x2="8" y2="10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /><circle cx="8" cy="11.5" r="0.8" fill="#fff" /></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#8A4D00' }}>{pendingInvoiceCount} invoice{pendingInvoiceCount > 1 ? 's require' : ' requires'} your authorization</div>
              <div style={{ fontSize: '12px', color: '#A06000', marginTop: '2px' }}>
                {pendingInvoice.id} from {pendingInvoice.provider.name} — {formatCurrency(pendingInvoice.amount, currency)}
              </div>
            </div>
            <GGButton variant="warning" size="sm" onClick={() => navigate(route.patientInvoice(pendingInvoice.id))} style={{ background: C.warning, color: '#fff', flexShrink: 0 }}>
              Authorize Now
            </GGButton>
          </div>
        )}

        {/* ── 4. Service grid + Getting Started stepper ────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap: '20px' }}>

          {/* Service grid */}
          <GGCard padding="22px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Find a Service</div>
              <span onClick={() => navigate('/app/services')} style={{ fontSize: '13px', color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>See all →</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: '12px' }}>
              {categories.map(cat => {
                if (cat.isComingSoon) {
                  return (
                    <div key={cat.id} onClick={() => navigate('/app/services')}
                      style={{ gridColumn: isMobile ? 'span 2' : 'span 3', padding: '12px 18px', borderRadius: radius.sm, background: C.bg, cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '12px', transition: 'all 0.18s ease' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = shadow.sm }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '8px', background: 'rgba(153,157,173,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textLight }}>{catIcons[cat.id]}</div>
                        <div><div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{cat.label}</div><div style={{ fontSize: '11px', color: C.textSub, marginTop: '1px' }}>International tertiary care & medical tourism</div></div>
                      </div>
                      <span style={{ display: 'inline-flex', fontSize: '10px', padding: '3px 8px', fontWeight: 600, borderRadius: radius.full, background: 'rgba(153,157,173,0.12)', color: C.textLight, whiteSpace: 'nowrap' }}>Coming Soon</span>
                    </div>
                  )
                }
                return (
                  <div key={cat.id} onClick={() => navigate(`/app/services/${cat.id}`)}
                    style={{ padding: '18px 12px', borderRadius: radius.sm, background: C.bg, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.18s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = shadow.sm }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(56,182,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.blue500 }}>{catIcons[cat.id]}</div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: C.text, textAlign: 'center' }}>{cat.label}</span>
                  </div>
                )
              })}
            </div>
          </GGCard>

          {onboardingComplete ? (
            <DashboardAppointmentsCard appointments={[]} emptyVariant="first-time" />
          ) : (
          /* Getting Started — vertical stepper */
          <GGCard padding="24px">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Getting Started</div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: C.blue500, background: 'rgba(56,182,255,0.1)', padding: '3px 10px', borderRadius: '20px' }}>
                {doneCount}/{ONBOARDING_STEP_COUNT} done
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: '4px', background: 'rgba(9,28,68,0.07)', borderRadius: '2px', marginBottom: '22px', overflow: 'hidden' }}>
              <div style={{ width: `${(doneCount / ONBOARDING_STEP_COUNT) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.navy800}, ${C.blue500})`, borderRadius: '2px', transition: 'width 0.5s ease' }} />
            </div>

            {/* Steps */}
            <div style={{ position: 'relative' }}>
              {/* Vertical connecting track */}
              <div style={{ position: 'absolute', left: '16px', top: '17px', bottom: '17px', width: '2px', background: C.border, zIndex: 0 }} />

              {setupSteps.map((step, i) => {
                const isLast = i === setupSteps.length - 1
                const isAction = step.status === 'action'
                const nodeBg =
                  step.status === 'done'    ? C.navy800 :
                  step.status === 'action'  ? '#F59E0B'  :
                  step.status === 'next'    ? C.blue500  : 'transparent'
                const nodeBorder = step.status === 'pending' ? `2px solid ${C.border}` : 'none'
                const nodeShadow =
                  step.status === 'action' ? '0 3px 12px rgba(245,158,11,0.35)' :
                  step.status === 'next'   ? '0 2px 10px rgba(56,182,255,0.25)' :
                  step.status === 'done'   ? '0 2px 8px rgba(9,28,68,0.15)' : 'none'

                return (
                  <div key={step.n} style={{ display: 'flex', gap: '14px', paddingTop: i === 0 ? '0' : '12px', paddingBottom: isLast ? '0' : '0', position: 'relative' }}>
                    {/* Circle node */}
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: nodeBg, border: nodeBorder, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1, boxShadow: nodeShadow, marginTop: i === 0 ? '0' : '0' }}>
                      {step.status === 'done' && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {step.status === 'action' && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M7 1L8.5 5.2H13L9.6 7.6 11 12 7 9.4 3 12l1.4-4.4L1 5.2h4.5z" fill="rgba(255,255,255,0.3)" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {(step.status === 'next' || step.status === 'pending') && (
                        <span style={{ fontSize: '12px', fontWeight: 800, color: step.status === 'next' ? '#fff' : C.textLight }}>{step.n}</span>
                      )}
                    </div>

                    {/* Content — action step gets amber accent panel */}
                    <div style={{
                      flex: 1, minWidth: 0,
                      paddingTop: '4px',
                      paddingBottom: isLast ? '0' : '12px',
                      paddingLeft: isAction ? '10px' : '0',
                      paddingRight: isAction ? '10px' : '0',
                      marginLeft: isAction ? '-4px' : '0',
                      marginRight: isAction ? '-4px' : '0',
                      background: isAction ? 'rgba(245,158,11,0.06)' : 'transparent',
                      borderLeft: isAction ? '3px solid #F59E0B' : 'none',
                      borderRadius: isAction ? `0 ${radius.sm} ${radius.sm} 0` : '0',
                      borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: step.status === 'pending' ? 500 : 700, color: step.status === 'pending' ? C.textLight : C.text, letterSpacing: '-0.01em' }}>
                          {step.label}
                        </span>
                        {step.status === 'done' && (
                          <span style={{ fontSize: '9px', fontWeight: 800, color: C.navy800, background: 'rgba(9,28,68,0.07)', padding: '1px 7px', borderRadius: '20px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Done</span>
                        )}
                        {step.status === 'action' && (
                          <span style={{ fontSize: '9px', fontWeight: 800, color: '#B45309', background: 'rgba(245,158,11,0.12)', padding: '1px 7px', borderRadius: '20px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Required</span>
                        )}
                        {step.status === 'next' && (
                          <span style={{ fontSize: '9px', fontWeight: 800, color: C.blue500, background: 'rgba(56,182,255,0.1)', padding: '1px 7px', borderRadius: '20px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Up Next</span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: isAction ? '#92400E' : C.textSub, lineHeight: 1.5, opacity: step.status === 'pending' ? 0.5 : 1 }}>
                        {step.desc}
                      </div>
                      {step.cta && step.status !== 'pending' && (
                        <span
                          onClick={() => handleStepAction(step.n, step.ctaPath)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: isAction ? '#D97706' : C.blue500, cursor: 'pointer', marginTop: '6px' }}>
                          {step.cta}
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </GGCard>
          )}
        </div>

        <AdBannerStrip key={adVersion} countryName={country?.name} />

        <HealthNewsSection />

      </div>
    </AppLayout>
  )
}
