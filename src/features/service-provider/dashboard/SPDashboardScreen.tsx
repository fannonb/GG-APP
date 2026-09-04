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
import { PrescriptionReadyAlertBanner } from '@/components/PrescriptionReadyAlertBanner'
import { SPActionBanner } from '@/components/SPActionBanner'
import { useHealthNews, useMarkPrescriptionReadyMutation, useSPDashboard } from '@/hooks/api'
import { useMarkSPNotificationReadMutation } from '@/hooks/api/useSPMutations'
import { getUnreadPaymentBannerItems } from '@/utils/payment-notifications'
import {
  buildPrescriptionReadyForPickupBannerItems,
  getUnreadCancelledAppointmentItems,
  getUnreadPrescriptionAcceptedItems,
  getUnreadPrescriptionDeclinedItems,
  getUnreadRescheduleAcceptedItems,
  getUnreadNewReviewItems,
  type PrescriptionReadyForPickupBannerItem,
} from '@/utils/sp-notifications'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { route, ROUTES } from '@/router/routes'
import { getAppointmentDisplayStatus, isUpcomingScheduleItem } from '@/utils/appointments'
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
const SEEN_PRESCRIPTION_PAID_KEY = 'ggapp.spSeenPrescriptionPaidNotifications'
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
  const markPrescriptionReady = useMarkPrescriptionReadyMutation()
  const [seenCancelledApptIds, setSeenCancelledApptIds] = useState<Set<string>>(
    () => loadSeenCancelledAppts(),
  )
  const [seenPrescriptionAcceptedIds, setSeenPrescriptionAcceptedIds] = useState<Set<string>>(
    () => loadSeenIds(SEEN_PRESCRIPTION_ACCEPTED_KEY),
  )
  const [seenPrescriptionDeclinedIds, setSeenPrescriptionDeclinedIds] = useState<Set<string>>(
    () => loadSeenIds(SEEN_PRESCRIPTION_DECLINED_KEY),
  )
  const [seenPrescriptionPaidIds, setSeenPrescriptionPaidIds] = useState<Set<string>>(
    () => loadSeenIds(SEEN_PRESCRIPTION_PAID_KEY),
  )
  const [seenRescheduleAcceptedIds, setSeenRescheduleAcceptedIds] = useState<Set<string>>(
    () => loadSeenIds(SEEN_RESCHEDULE_ACCEPTED_KEY),
  )
  const [seenNewReviewIds, setSeenNewReviewIds] = useState<Set<string>>(
    () => loadSeenIds(SEEN_NEW_REVIEW_KEY),
  )

  const allAppointments = data?.appointments ?? []

  const upcomingSchedule = useMemo(
    () =>
      allAppointments
        .filter(isUpcomingScheduleItem)
        .sort((a, b) => {
          const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime()
          if (dateCompare !== 0) return dateCompare
          return a.time.localeCompare(b.time)
        })
        .slice(0, 8),
    [allAppointments],
  )

  const prescriptionRequests = data?.prescriptionRequests ?? []

  const newPrescriptionRequest = useMemo(
    () => prescriptionRequests.find(request => request.status === 'submitted'),
    [prescriptionRequests],
  )

  const newRequestAppointments = useMemo(
    () =>
      allAppointments
        .filter(appointment => getAppointmentDisplayStatus(appointment) === 'new')
        .sort((a, b) => {
          const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime()
          if (dateCompare !== 0) return dateCompare
          return a.time.localeCompare(b.time)
        }),
    [allAppointments],
  )
  const newRequestAppointment = newRequestAppointments[0] ?? null

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
      <SPLayout title="Dashboard">
        <GGCard padding="24px">
          <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
            Loading provider dashboard...
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  const { sp, invoices, isPharmacy, isPharmacyOnly } = data
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

  const prescriptionReadyForPickupItems = useMemo(() => {
    return buildPrescriptionReadyForPickupBannerItems(
      data?.notifications ?? [],
      data?.prescriptionRequests ?? [],
      seenPrescriptionPaidIds,
    )
  }, [data?.notifications, data?.prescriptionRequests, seenPrescriptionPaidIds])

  const markPrescriptionPaidSeen = (id: string) => {
    setSeenPrescriptionPaidIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveSeenIds(SEEN_PRESCRIPTION_PAID_KEY, next)
      return next
    })
    if (!id.startsWith('rx-')) {
      markNotificationRead.mutate(id)
    }
  }

  const handlePrescriptionReadyDismiss = (items: PrescriptionReadyForPickupBannerItem[]) => {
    items.forEach(item => markPrescriptionPaidSeen(item.id))
  }

  const handleMarkPrescriptionReady = async (item: PrescriptionReadyForPickupBannerItem) => {
    await markPrescriptionReady.mutateAsync(item.prescriptionId)
    markPrescriptionPaidSeen(item.id)
  }

  const handleViewPrescriptionReady = (item: PrescriptionReadyForPickupBannerItem) => {
    markPrescriptionPaidSeen(item.id)
    navigate(item.screen || route.spPrescription(item.prescriptionId))
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

  const primaryKind =
    rejectedInvoiceItems.length > 0
      ? 'rejected'
      : !isPharmacyOnly && newRequestAppointment
        ? 'new-request'
        : newPrescriptionRequest
          ? 'new-prescription'
          : null

  const handleCancelledApptAction = (items: { id: string; screen?: string }[]) => {
    items.forEach(item => markCancelledApptSeen(item.id))
    const target = items[0]?.screen
    navigate(target?.startsWith('/sp/') ? target : ROUTES.SP_APPOINTMENTS)
  }

  const handleCancelledApptDismiss = (items: { id: string }[]) => {
    items.forEach(item => markCancelledApptSeen(item.id))
  }

  const handlePrescriptionAcceptedDismiss = (items: { id: string }[]) => {
    items.forEach(item => markPrescriptionAcceptedSeen(item.id))
  }

  const handlePrescriptionDeclinedDismiss = (items: { id: string }[]) => {
    items.forEach(item => markPrescriptionDeclinedSeen(item.id))
  }

  const handleRescheduleAcceptedDismiss = (items: { id: string }[]) => {
    items.forEach(item => markRescheduleAcceptedSeen(item.id))
  }

  const handleNewReviewDismiss = (items: { id: string }[]) => {
    items.forEach(item => markNewReviewSeen(item.id))
  }

  return (
    <SPLayout title="Dashboard" notifCount={unreadCount}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '20px', fontFamily: font.family }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '16px',
            fontFamily: font.family,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div
                style={{
                  fontSize: isMobile ? '20px' : '28px',
                  fontWeight: 800,
                  color: C.text,
                  letterSpacing: '-0.04em',
                  fontFamily: font.family,
                }}
              >
                {greeting}, {sp.name}
              </div>
              {countryConfig && (
                <FlagImg
                  code={countryConfig.code}
                  size={isMobile ? 16 : 20}
                  style={{ borderRadius: '3px' }}
                />
              )}
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, marginTop: '2px', fontFamily: font.family }}>
              {today}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              {(sp.categories && sp.categories.length > 0 ? sp.categories : [sp.type]).map(categoryLabel => (
                <span
                  key={categoryLabel}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: C.navy800,
                    background: C.blue100,
                    padding: '4px 12px',
                    borderRadius: radius.full,
                    border: '1px solid rgba(56, 182, 255, 0.3)',
                    fontFamily: font.family,
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.blue500 }} />
                  {categoryLabel}
                </span>
              ))}
            </div>
          </div>
        </div>

        {primaryKind === 'rejected' && (
          <RejectedInvoiceAlertBanner
            items={rejectedInvoiceItems}
            onAction={item => navigate(route.spInvoice(item.id))}
          />
        )}

        {primaryKind === 'new-request' && newRequestAppointment && (
          <AppointmentReminderBanner
            appointment={newRequestAppointment}
            variant="new-request"
            onView={() => navigate(route.spAppointment(newRequestAppointment.id))}
          />
        )}

        {primaryKind === 'new-prescription' && newPrescriptionRequest && (
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
            <div style={{
              width: isMobile ? 38 : 46,
              height: isMobile ? 38 : 46,
              borderRadius: '12px',
              background: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 3px 10px rgba(245,158,11,0.35)',
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="4" y="2" width="14" height="18" rx="2.5" stroke="#fff" strokeWidth="1.5"/>
                <path d="M8 7h6M8 11h6M8 15h3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
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
              style={{
                background: '#F59E0B',
                border: 'none',
                boxShadow: '0 2px 8px rgba(245,158,11,0.30)',
                flexShrink: 0,
                width: isMobile ? '100%' : 'auto',
              }}
            >
              Review Prescription →
            </GGButton>
          </div>
        )}

        {prescriptionReadyForPickupItems.length > 0 && (
          <PrescriptionReadyAlertBanner
            items={prescriptionReadyForPickupItems}
            onMarkReady={handleMarkPrescriptionReady}
            onView={handleViewPrescriptionReady}
            onDismiss={handlePrescriptionReadyDismiss}
          />
        )}

        {paymentItems.length > 0 && (
          <PaymentAlertBanner
            audience="sp"
            items={paymentItems}
            onAction={handlePaymentBannerAction}
          />
        )}

        {prescriptionAcceptedItems.length > 0 && (
          <PrescriptionDecisionBanner
            variant="accepted"
            items={prescriptionAcceptedItems}
            onAction={handlePrescriptionAcceptedAction}
            onDismiss={handlePrescriptionAcceptedDismiss}
          />
        )}

        {prescriptionDeclinedItems.length > 0 && (
          <PrescriptionDecisionBanner
            variant="declined"
            items={prescriptionDeclinedItems}
            onAction={handlePrescriptionDeclinedAction}
            onDismiss={handlePrescriptionDeclinedDismiss}
          />
        )}

        {cancelledApptItems.length > 0 && (
          <SPActionBanner
            items={cancelledApptItems}
            title={count => count > 1 ? `${count} appointments cancelled` : 'Appointment cancelled'}
            actionLabel="View appointments"
            icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="2" y="3.5" width="18" height="16" rx="2.5" stroke="#fff" strokeWidth="1.5"/>
                <path d="M2 8.5h18M7 2v3M15 2v3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M8.5 9l5 5M13.5 9l-5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            }
            onAction={handleCancelledApptAction}
            onDismiss={handleCancelledApptDismiss}
          />
        )}

        {rescheduleAcceptedItems.length > 0 && (
          <SPActionBanner
            items={rescheduleAcceptedItems}
            title={count => count > 1 ? `${count} reschedules accepted` : 'Reschedule accepted'}
            actionLabel="View appointment"
            icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="1.5"/>
                <path d="M11 7v4l2.5 1.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            }
            onAction={handleRescheduleAcceptedAction}
            onDismiss={handleRescheduleAcceptedDismiss}
          />
        )}

        {newReviewItems.length > 0 && (
          <SPActionBanner
            items={newReviewItems}
            title={count => count > 1 ? `${count} new patient reviews` : 'New patient review'}
            actionLabel="View review"
            icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 3.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7L11 14.3 6.8 16.5l.8-4.7-3.4-3.3 4.7-.7L11 3.5z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            }
            onAction={handleNewReviewAction}
            onDismiss={handleNewReviewDismiss}
          />
        )}

        <button
          type="button"
          onClick={() => navigate(ROUTES.SP_PAYMENTS)}
          style={{
            all: 'unset',
            display: 'block',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          <GGCard padding={isMobile ? '14px 16px' : '20px'}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontFamily: font.family }}>
              This Month
            </div>
            <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em', fontFamily: font.family }}>
              {formatCurrency(sp.monthlyEarnings)}
            </div>
            <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px', fontFamily: font.family }}>
              Authorized this month · View payments
            </div>
          </GGCard>
        </button>

        <SPDashboardWorkspace
          upcomingSchedule={upcomingSchedule}
          prescriptionRequests={prescriptionRequests}
          showAppointments={!isPharmacyOnly}
          showPrescriptions={Boolean(isPharmacyOnly || isPharmacy || sp.isPharmacy)}
          recentPayments={recentPayments}
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
