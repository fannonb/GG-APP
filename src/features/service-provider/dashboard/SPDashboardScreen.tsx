import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { HealthNewsSection } from '@/components/HealthNewsSection'
import { FlagImg } from '@/components/FlagImg'
import { getCountryByName } from '@/config/countries'
import { AppointmentReminderBanner } from '@/components/AppointmentReminderBanner'
import { RejectedInvoiceAlertBanner } from '@/components/RejectedInvoiceAlertBanner'
import { PaymentAlertBanner } from '@/components/PaymentAlertBanner'
import { PrescriptionDecisionBanner } from '@/components/PrescriptionDecisionBanner'
import { SPActionBanner } from '@/components/SPActionBanner'
import { useHealthNews, useSPDashboard } from '@/hooks/api'
import { useMarkSPNotificationReadMutation } from '@/hooks/api/useSPMutations'
import { getUnreadPaymentBannerItems } from '@/utils/payment-notifications'
import {
  getUnreadCancelledAppointmentItems,
  getUnreadPrescriptionAcceptedItems,
  getUnreadPrescriptionDeclinedItems,
  getUnreadRescheduleAcceptedItems,
  getUnreadNewReviewItems,
} from '@/utils/sp-notifications'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { route, ROUTES } from '@/router/routes'
import { getAppointmentDisplayStatus, getAppointmentUrgency } from '@/utils/appointments'
import {
  useAuthStore,
} from '@/store/auth.store'
import { useSpOnboardingProgress } from '@/hooks/useSpOnboardingProgress'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency } from '@/utils/format'
import { SPNewDashboardScreen } from './SPNewDashboardScreen'
import { SPDashboardWorkspace } from './SPDashboardWorkspace'

const SEEN_CANCELLED_APPT_KEY = 'ggapp.spSeenCancelledAppointmentNotifications'

function loadSeenCancelledAppts(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(SEEN_CANCELLED_APPT_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((id: unknown) => typeof id === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function saveSeenCancelledAppts(ids: Set<string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SEEN_CANCELLED_APPT_KEY, JSON.stringify(Array.from(ids)))
}

const SEEN_PRESCRIPTION_ACCEPTED_KEY = 'ggapp.spSeenPrescriptionAcceptedNotifications'
const SEEN_PRESCRIPTION_DECLINED_KEY = 'ggapp.spSeenPrescriptionDeclinedNotifications'
const SEEN_RESCHEDULE_ACCEPTED_KEY = 'ggapp.spSeenRescheduleAcceptedNotifications'
const SEEN_NEW_REVIEW_KEY = 'ggapp.spSeenNewReviewNotifications'

function loadSeenIds(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((id: unknown) => typeof id === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function saveSeenIds(key: string, ids: Set<string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(Array.from(ids)))
}

const SETUP_STEP_DEFS = [
  { n: 1, label: 'Create Account',            desc: 'Your provider account has been registered.',                    cta: null,                  ctaPath: null },
  { n: 2, label: 'Application Approved',      desc: "GG'APP admin verified your licence and activated your account.", cta: null,                  ctaPath: null },
  { n: 3, label: 'Complete Practice Profile', desc: 'Add your facility details, services, and payout account.',       cta: 'Complete Profile →',  ctaPath: ROUTES.SP_SETTINGS },
  { n: 4, label: 'Receive First Appointment', desc: "Patients will find you on GG'APP and send booking requests.",    cta: 'View Appointments →', ctaPath: ROUTES.SP_APPOINTMENTS },
  { n: 5, label: 'Upload First Invoice',      desc: 'After a visit, submit an invoice for patient authorization.',    cta: 'Upload Invoice →',    ctaPath: ROUTES.SP_INVOICE_UPLOAD },
] as const

export function SPDashboardScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const { spMode } = useAuthStore()
  const { data, isLoading } = useSPDashboard()
  const { data: healthNews } = useHealthNews()
  const { buildSetupSteps, onboardingComplete, profileSettingsTab } = useSpOnboardingProgress()
  const markNotificationRead = useMarkSPNotificationReadMutation()
  const [seenCancelledApptIds, setSeenCancelledApptIds] = useState<Set<string>>(
    () => loadSeenCancelledAppts(),
  )
  const [seenPrescriptionAcceptedIds, setSeenPrescriptionAcceptedIds] = useState<Set<string>>(
    () => loadSeenIds(SEEN_PRESCRIPTION_ACCEPTED_KEY),
  )
  const [seenPrescriptionDeclinedIds, setSeenPrescriptionDeclinedIds] = useState<Set<string>>(
    () => loadSeenIds(SEEN_PRESCRIPTION_DECLINED_KEY),
  )
  const [seenRescheduleAcceptedIds, setSeenRescheduleAcceptedIds] = useState<Set<string>>(
    () => loadSeenIds(SEEN_RESCHEDULE_ACCEPTED_KEY),
  )
  const [seenNewReviewIds, setSeenNewReviewIds] = useState<Set<string>>(
    () => loadSeenIds(SEEN_NEW_REVIEW_KEY),
  )
  const [btnHover1, setBtnHover1] = useState(false)
  const [btnHover2, setBtnHover2] = useState(false)

  const upcomingAppointments = useMemo(
    () =>
      (data?.appointments ?? [])
        .filter(appointment => {
          const status = getAppointmentDisplayStatus(appointment)
          return status === 'new' || status === 'confirmed'
        })
        .sort((a, b) => {
          const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime()
          if (dateCompare !== 0) return dateCompare
          return a.time.localeCompare(b.time)
        })
        .slice(0, 5),
    [data],
  )

  const prescriptionRequests = data?.prescriptionRequests ?? []

  const newPrescriptionRequest = useMemo(
    () => prescriptionRequests.find(request => request.status === 'submitted'),
    [prescriptionRequests],
  )

  const newRequestAppointment = useMemo(
    () => upcomingAppointments.find(appointment => getAppointmentDisplayStatus(appointment) === 'new'),
    [upcomingAppointments],
  )

  const upcomingConfirmedAppointment = useMemo(
    () =>
      upcomingAppointments.find(appointment => {
        if (getAppointmentDisplayStatus(appointment) !== 'confirmed') return false
        return getAppointmentUrgency(appointment.date) !== null
      }),
    [upcomingAppointments],
  )

  const recentPayments = useMemo(() => (data?.payments ?? []).slice(0, 5), [data])
  const unreadCount = useMemo(
    () => (data?.notifications ?? []).filter(notification => !notification.read).length,
    [data],
  )

  if (spMode === 'new') {
    return <SPNewDashboardScreen />
  }

  if (isLoading || !data) {
    return (
      <SPLayout title="Dashboard" subtitle="Today at a glance">
        <GGCard padding="24px">
          <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
            Loading provider dashboard...
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  const { sp, patients, invoices, isPharmacy, isPharmacyOnly } = data
  const countryConfig = getCountryByName(sp?.country || '')
  const rejectedInvoices = invoices.filter(invoice => invoice.status === 'rejected')
  const rejectedInvoiceItems = rejectedInvoices.map(invoice => ({
    id: invoice.id,
    headline: `${invoice.id} · ${invoice.patient}`,
    detail: invoice.rejectionReason ? `Patient reason: ${invoice.rejectionReason}` : 'Patient rejected this invoice — edit and resubmit a corrected version.',
    amount: invoice.amount,
  }))
  const paymentItems = getUnreadPaymentBannerItems(data?.notifications ?? [])

  const handlePaymentBannerAction = (items: { id: string; screen?: string }[]) => {
    items.forEach(item => markNotificationRead.mutate(item.id))
    const target = items[0]?.screen
    if (target?.startsWith('/sp/')) {
      navigate(target)
      return
    }
    navigate(ROUTES.SP_PAYMENTS)
  }

  const cancelledApptItems = getUnreadCancelledAppointmentItems(data?.notifications ?? [])
    .filter(item => !seenCancelledApptIds.has(item.id))

  const markCancelledApptSeen = (id: string) => {
    setSeenCancelledApptIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveSeenCancelledAppts(next)
      return next
    })
    markNotificationRead.mutate(id)
  }

  const prescriptionAcceptedItems = getUnreadPrescriptionAcceptedItems(data?.notifications ?? [])
    .filter(item => !seenPrescriptionAcceptedIds.has(item.id))

  const markPrescriptionAcceptedSeen = (id: string) => {
    setSeenPrescriptionAcceptedIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveSeenIds(SEEN_PRESCRIPTION_ACCEPTED_KEY, next)
      return next
    })
    markNotificationRead.mutate(id)
  }

  const handlePrescriptionAcceptedAction = (items: { id: string; screen?: string }[]) => {
    items.forEach(item => markPrescriptionAcceptedSeen(item.id))
    const target = items[0]?.screen
    navigate(target?.startsWith('/sp/') ? target : ROUTES.SP_PRESCRIPTIONS)
  }

  const prescriptionDeclinedItems = getUnreadPrescriptionDeclinedItems(data?.notifications ?? [])
    .filter(item => !seenPrescriptionDeclinedIds.has(item.id))

  const markPrescriptionDeclinedSeen = (id: string) => {
    setSeenPrescriptionDeclinedIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveSeenIds(SEEN_PRESCRIPTION_DECLINED_KEY, next)
      return next
    })
    markNotificationRead.mutate(id)
  }

  const handlePrescriptionDeclinedAction = (items: { id: string; screen?: string }[]) => {
    items.forEach(item => markPrescriptionDeclinedSeen(item.id))
    const target = items[0]?.screen
    navigate(target?.startsWith('/sp/') ? target : ROUTES.SP_PRESCRIPTIONS)
  }

  const rescheduleAcceptedItems = getUnreadRescheduleAcceptedItems(data?.notifications ?? [])
    .filter(item => !seenRescheduleAcceptedIds.has(item.id))

  const markRescheduleAcceptedSeen = (id: string) => {
    setSeenRescheduleAcceptedIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveSeenIds(SEEN_RESCHEDULE_ACCEPTED_KEY, next)
      return next
    })
    markNotificationRead.mutate(id)
  }

  const handleRescheduleAcceptedAction = (items: { id: string; screen?: string }[]) => {
    items.forEach(item => markRescheduleAcceptedSeen(item.id))
    const target = items[0]?.screen
    navigate(target?.startsWith('/sp/') ? target : ROUTES.SP_APPOINTMENTS)
  }

  const newReviewItems = getUnreadNewReviewItems(data?.notifications ?? [])
    .filter(item => !seenNewReviewIds.has(item.id))

  const markNewReviewSeen = (id: string) => {
    setSeenNewReviewIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveSeenIds(SEEN_NEW_REVIEW_KEY, next)
      return next
    })
    markNotificationRead.mutate(id)
  }

  const handleNewReviewAction = (items: { id: string; screen?: string }[]) => {
    items.forEach(item => markNewReviewSeen(item.id))
    const target = items[0]?.screen
    navigate(target?.startsWith('/sp/') ? target : ROUTES.SP_INVOICES)
  }

  const setupSteps = buildSetupSteps(SETUP_STEP_DEFS)
  const doneCount = setupSteps.filter(step => step.status === 'done').length
  const handleStepAction = (stepN: number, ctaPath: string | null) => {
    if (!ctaPath) return

    if (stepN === 3) {
      navigate(ROUTES.SP_SETTINGS, { state: { tab: profileSettingsTab } })
      return
    }

    navigate(ctaPath)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const stats = [
    { label: 'Total Earnings', value: formatCurrency(sp.totalEarnings), helper: 'All time' },
    { label: 'This Month', value: formatCurrency(sp.monthlyEarnings), helper: 'Authorized this month' },
    { label: 'Patients', value: String(sp.totalPatients), helper: 'Unique patients served' },
  ]

  return (
    <SPLayout title="Dashboard" subtitle="Today at a glance" notifCount={unreadCount}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '20px', fontFamily: font.family }}>
        {/* Hero Card */}
        <GGCard
          padding="0"
          style={{
            background: 'linear-gradient(140deg, #091C44 0%, #12244F 52%, #050E22 100%)',
            color: '#FFFFFF',
            border: '1px solid rgba(56, 182, 255, 0.22)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background atmosphere glow */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: `
                radial-gradient(circle at 88% -10%, rgba(56, 182, 255, 0.30) 0%, transparent 58%),
                radial-gradient(circle at 6% 130%, rgba(56, 182, 255, 0.10) 0%, transparent 46%)
              `,
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1, padding: isMobile ? '20px 18px' : '28px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row' }}>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(56, 182, 255, 0.12)',
                    border: '1px solid rgba(56, 182, 255, 0.30)',
                    padding: '4px 12px',
                    borderRadius: radius.full,
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#8ADCFF',
                    marginBottom: '10px',
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    fontFamily: font.family,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8ADCFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  {today}
                </div>

                <div style={{ fontSize: isMobile ? '22px' : '30px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2, color: '#FFFFFF', fontFamily: font.family }}>
                  {greeting}, <span style={{ color: '#38B6FF' }}>{sp.name}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {(sp.categories && sp.categories.length > 0 ? sp.categories : [sp.type]).map(categoryLabel => (
                    <span
                      key={categoryLabel}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#8ADCFF',
                        background: 'rgba(56,182,255,0.14)',
                        padding: '4px 10px',
                        borderRadius: radius.sm,
                        border: '1px solid rgba(56,182,255,0.32)',
                        fontFamily: font.family,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8ADCFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                      {categoryLabel}
                    </span>
                  ))}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#E6F5FF',
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '4px 10px',
                      borderRadius: radius.sm,
                      border: '1px solid rgba(255, 255, 255, 0.16)',
                      fontFamily: font.family,
                    }}
                  >
                    {countryConfig && (
                      <FlagImg
                        code={countryConfig.code}
                        size={14}
                        style={{ borderRadius: '2px', display: 'inline-block' }}
                      />
                    )}
                    {sp.country}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
                {!isPharmacyOnly && (
                  <button
                    type="button"
                    onMouseEnter={() => setBtnHover1(true)}
                    onMouseLeave={() => setBtnHover1(false)}
                    onClick={() => navigate(ROUTES.SP_APPOINTMENTS)}
                    style={{
                      flex: isMobile ? 1 : 'none',
                      justifyContent: 'center',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      fontFamily: font.family,
                      borderRadius: radius.sm,
                      border: '1px solid rgba(255, 255, 255, 0.28)',
                      background: btnHover1 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    Appointments
                  </button>
                )}
                {isPharmacy && (
                  <button
                    type="button"
                    onMouseEnter={() => setBtnHover1(true)}
                    onMouseLeave={() => setBtnHover1(false)}
                    onClick={() => navigate(ROUTES.SP_PRESCRIPTIONS)}
                    style={{
                      flex: isMobile ? 1 : 'none',
                      justifyContent: 'center',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      fontFamily: font.family,
                      borderRadius: radius.sm,
                      border: '1px solid rgba(255, 255, 255, 0.28)',
                      background: btnHover1 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                    Prescriptions
                  </button>
                )}
                {!isPharmacyOnly && (
                  <button
                    type="button"
                    onMouseEnter={() => setBtnHover2(true)}
                    onMouseLeave={() => setBtnHover2(false)}
                    onClick={() => navigate(ROUTES.SP_INVOICE_UPLOAD)}
                    style={{
                      flex: isMobile ? 1 : 'none',
                      justifyContent: 'center',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: 800,
                      fontFamily: font.family,
                      borderRadius: radius.sm,
                      border: 'none',
                      background: btnHover2 ? '#0D99FF' : '#38B6FF',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    Upload Invoice
                  </button>
                )}
              </div>
            </div>
          </div>
        </GGCard>

        {rejectedInvoiceItems.length > 0 && (
          <RejectedInvoiceAlertBanner
            items={rejectedInvoiceItems}
            onAction={item => navigate(route.spInvoice(item.id))}
          />
        )}

        {paymentItems.length > 0 && (
          <PaymentAlertBanner
            audience="sp"
            items={paymentItems}
            onAction={handlePaymentBannerAction}
          />
        )}

          <PrescriptionDecisionBanner
            variant="accepted"
            items={prescriptionAcceptedItems}
            onAction={handlePrescriptionAcceptedAction}
            onDismiss={items => items.forEach(item => markPrescriptionAcceptedSeen(item.id))}
          />

          <PrescriptionDecisionBanner
            variant="declined"
            items={prescriptionDeclinedItems}
            onAction={handlePrescriptionDeclinedAction}
            onDismiss={items => items.forEach(item => markPrescriptionDeclinedSeen(item.id))}
          />

        <SPActionBanner
          items={cancelledApptItems}
          title={count => count > 1 ? `${count} appointments cancelled by patients` : 'Appointment cancelled by patient'}
          actionLabel="View Appointments →"
          onAction={items => {
            items.forEach(item => markCancelledApptSeen(item.id))
            const target = items[0]?.screen
            navigate(target?.startsWith('/sp/') ? target : ROUTES.SP_APPOINTMENTS)
          }}
          onDismiss={items => items.forEach(item => markCancelledApptSeen(item.id))}
          icon={
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="2" y="3.5" width="18" height="16" rx="2.5" stroke="#fff" strokeWidth="1.5"/>
              <path d="M2 8.5h18M7 2v3M15 2v3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M7.5 11.5h7M11 8v7" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" transform="rotate(45 11 11.5)"/>
            </svg>
          }
        />

        <SPActionBanner
          items={rescheduleAcceptedItems}
          title={count => count > 1 ? `${count} reschedules accepted` : 'Reschedule accepted'}
          actionLabel="View Appointment →"
          onAction={handleRescheduleAcceptedAction}
          onDismiss={items => items.forEach(item => markRescheduleAcceptedSeen(item.id))}
          icon={
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="2" y="3.5" width="18" height="16" rx="2.5" stroke="#fff" strokeWidth="1.5"/>
              <path d="M2 8.5h18M7 2v3M15 2v3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M7 13l2.5 2.5 5.5-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
        />

        <SPActionBanner
          items={newReviewItems}
          title={count => count > 1 ? `${count} new patient reviews` : 'New patient review'}
          actionLabel="View Review →"
          onAction={handleNewReviewAction}
          onDismiss={items => items.forEach(item => markNewReviewSeen(item.id))}
          icon={
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 2.5l2.6 5.3 5.8.85-4.2 4.1 1 5.75L11 15.7l-5.2 2.8 1-5.75-4.2-4.1 5.8-.85z" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          }
        />

        {newPrescriptionRequest && (
          <div
            style={{
              padding: isMobile ? '14px 16px' : '18px 22px',
              background: 'linear-gradient(90deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))',
              borderRadius: radius.lg,
              border: '1.5px solid rgba(245,158,11,0.24)',
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
              flexWrap: 'wrap',
              fontFamily: font.family,
            }}
          >
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400E', marginBottom: '3px' }}>
                New prescription upload
              </div>
              <div style={{ fontSize: '13px', color: '#B45309', lineHeight: 1.5 }}>
                {newPrescriptionRequest.patient ?? 'A patient'} uploaded a prescription ({newPrescriptionRequest.id}). Review availability and send a quote.
              </div>
            </div>
            <GGButton
              variant="primary"
              size="sm"
              onClick={() => navigate(route.spPrescription(newPrescriptionRequest.id))}
            >
              Review Prescription →
            </GGButton>
          </div>
        )}

        {!isPharmacyOnly && newRequestAppointment && (
          <AppointmentReminderBanner
            appointment={newRequestAppointment}
            variant="new-request"
            onView={() => navigate(route.spAppointment(newRequestAppointment.id))}
          />
        )}

        {!isPharmacyOnly && upcomingConfirmedAppointment && (
          <AppointmentReminderBanner
            appointment={upcomingConfirmedAppointment}
            variant="upcoming"
            onView={() => navigate(route.spAppointment(upcomingConfirmedAppointment.id))}
          />
        )}

        {/* Stats Section */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: isMobile ? '10px' : '12px' }}>
          {stats.map((stat, idx) => (
            <GGCard
              key={stat.label}
              padding={isMobile ? '14px 16px' : '20px'}
              style={{ gridColumn: isMobile && idx === 0 ? 'span 2' : 'auto' }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontFamily: font.family }}>
                {stat.label}
              </div>
              <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em', fontFamily: font.family }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px', fontFamily: font.family }}>{stat.helper}</div>
            </GGCard>
          ))}
        </div>

        <SPDashboardWorkspace
          upcomingAppointments={upcomingAppointments}
          prescriptionRequests={prescriptionRequests}
          showAppointments={!isPharmacyOnly}
          showPrescriptions={Boolean(isPharmacy || sp.isPharmacy)}
          recentPayments={recentPayments}
          patientsCount={patients.length}
          onboardingComplete={onboardingComplete}
          setupSteps={setupSteps}
          doneCount={doneCount}
          onStepAction={handleStepAction}
        />

        <HealthNewsSection articles={healthNews} />
      </div>
    </SPLayout>
  )
}
