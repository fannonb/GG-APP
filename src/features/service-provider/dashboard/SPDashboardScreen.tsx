import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { HealthNewsSection } from '@/components/HealthNewsSection'
import { DashboardAttention, type AttentionItem } from '@/components/DashboardAttention'
import { FlagImg } from '@/components/FlagImg'
import { getCountryByName } from '@/config/countries'
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
import { getAppointmentDisplayStatus, getAppointmentUrgency, isUpcomingScheduleItem } from '@/utils/appointments'
import {
  useAuthStore,
} from '@/store/auth.store'
import { useSpOnboardingProgress } from '@/hooks/useSpOnboardingProgress'
import { useResponsive } from '@/hooks/useResponsive'
import { formatAmount, formatDate, formatTime12h } from '@/utils/format'
import { SPNewDashboardScreen } from './SPNewDashboardScreen'
import { SPDashboardWorkspace } from './SPDashboardWorkspace'
import { InstallAppPrompt } from '@/components/InstallApp'

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
  const { isMobile, isDesktop } = useResponsive()
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
  const currency = countryConfig?.currencySymbol ?? ''
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

  const prescriptionReadyForPickupItems = buildPrescriptionReadyForPickupBannerItems(
    data.notifications ?? [],
    data.prescriptionRequests ?? [],
    seenPrescriptionPaidIds,
  )

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

  const andMore = (detail: string, count: number) =>
    count > 1 ? `${detail.replace(/\.\s*$/, '')} · +${count - 1} more` : detail
  const attentionItems: AttentionItem[] = []

  if (rejectedInvoiceItems.length > 0) {
    const n = rejectedInvoiceItems.length
    const primary = rejectedInvoiceItems[0]
    attentionItems.push({
      id: 'invoice-rejected',
      tone: 'alert',
      icon: 'invoice',
      title: n > 1 ? `${n} invoices rejected by patients` : 'Invoice rejected by patient',
      meta: primary.amount != null ? formatAmount(primary.amount, currency) : undefined,
      detail: andMore(
        primary.detail.startsWith('Patient reason:') ? `${primary.headline} · ${primary.detail}` : primary.headline,
        n,
      ),
      actionLabel: 'Fix & resubmit',
      onAction: () => navigate(route.spInvoice(primary.id)),
    })
  }

  if (!isPharmacyOnly && newRequestAppointment) {
    const n = newRequestAppointments.length
    const urgency = getAppointmentUrgency(newRequestAppointment.date)
    attentionItems.push({
      id: 'new-request',
      tone: 'action',
      icon: 'calendar',
      title: n > 1 ? `${n} new booking requests` : 'New booking request',
      meta: urgency ? urgency.label.charAt(0) + urgency.label.slice(1).toLowerCase() : undefined,
      detail: andMore(
        `${newRequestAppointment.patient} requested ${newRequestAppointment.service} on ${formatDate(newRequestAppointment.date)} at ${formatTime12h(newRequestAppointment.time)}`,
        n,
      ),
      actionLabel: 'Review request',
      onAction: () => navigate(n > 1 ? ROUTES.SP_APPOINTMENTS : route.spAppointment(newRequestAppointment.id)),
    })
  }

  if (newPrescriptionRequest) {
    const n = prescriptionRequests.filter(request => request.status === 'submitted').length
    attentionItems.push({
      id: 'new-prescription',
      tone: 'action',
      icon: 'prescription',
      title: n > 1 ? `${n} prescriptions awaiting a quote` : 'New prescription upload',
      detail: andMore(
        `${newPrescriptionRequest.patient ?? 'A patient'} uploaded a prescription (${newPrescriptionRequest.id}). Check availability and send a quote.`,
        n,
      ),
      actionLabel: 'Send quote',
      onAction: () => navigate(n > 1 ? ROUTES.SP_PRESCRIPTIONS : route.spPrescription(newPrescriptionRequest.id)),
    })
  }

  if (prescriptionReadyForPickupItems.length > 0) {
    const n = prescriptionReadyForPickupItems.length
    const primary = prescriptionReadyForPickupItems[0]
    const delivery = primary.fulfillmentMode === 'delivery'
    attentionItems.push({
      id: 'rx-paid',
      tone: 'action',
      icon: 'prescription',
      title: n > 1
        ? `${n} paid prescriptions ready to hand off`
        : delivery ? 'Prescription paid · prepare for delivery' : 'Prescription paid · prepare for pickup',
      detail: andMore(primary.detail, n),
      actionLabel: delivery ? 'Mark ready for delivery' : 'Mark ready for pickup',
      onAction: () => handleMarkPrescriptionReady(primary),
      secondaryAction: { label: 'View order', onAction: () => handleViewPrescriptionReady(primary) },
      onDismiss: () => handlePrescriptionReadyDismiss(prescriptionReadyForPickupItems),
    })
  }

  if (prescriptionDeclinedItems.length > 0) {
    const n = prescriptionDeclinedItems.length
    attentionItems.push({
      id: 'rx-declined',
      tone: 'alert',
      icon: 'prescription',
      title: n > 1 ? `${n} quotes declined` : 'Quote declined',
      detail: andMore(prescriptionDeclinedItems[0].detail, n),
      actionLabel: 'View request',
      onAction: () => handlePrescriptionDeclinedAction(prescriptionDeclinedItems),
      onDismiss: () => handlePrescriptionDeclinedDismiss(prescriptionDeclinedItems),
    })
  }

  if (cancelledApptItems.length > 0) {
    const n = cancelledApptItems.length
    attentionItems.push({
      id: 'appt-cancelled',
      tone: 'alert',
      icon: 'calendar-x',
      title: n > 1 ? `${n} appointments cancelled` : 'Appointment cancelled',
      detail: andMore(cancelledApptItems[0].detail, n),
      actionLabel: 'View appointments',
      onAction: () => handleCancelledApptAction(cancelledApptItems),
      onDismiss: () => handleCancelledApptDismiss(cancelledApptItems),
    })
  }

  if (prescriptionAcceptedItems.length > 0) {
    const n = prescriptionAcceptedItems.length
    attentionItems.push({
      id: 'rx-accepted',
      tone: 'success',
      icon: 'prescription',
      title: n > 1 ? `${n} quotes accepted` : 'Quote accepted',
      detail: andMore(prescriptionAcceptedItems[0].detail, n),
      actionLabel: 'Upload invoice',
      onAction: () => handlePrescriptionAcceptedAction(prescriptionAcceptedItems),
      onDismiss: () => handlePrescriptionAcceptedDismiss(prescriptionAcceptedItems),
    })
  }

  if (paymentItems.length > 0) {
    const n = paymentItems.length
    const primary = paymentItems[0]
    attentionItems.push({
      id: 'payment',
      tone: 'success',
      icon: 'payment',
      title: n > 1 ? `${n} new patient payments` : 'Payment authorized by patient',
      meta: primary.amount != null ? formatAmount(primary.amount, primary.currency ?? currency) : undefined,
      detail: andMore(primary.detail, n),
      actionLabel: n > 1 ? 'View payments' : 'View payment',
      onAction: () => handlePaymentBannerAction(paymentItems),
    })
  }

  if (rescheduleAcceptedItems.length > 0) {
    const n = rescheduleAcceptedItems.length
    attentionItems.push({
      id: 'reschedule-accepted',
      tone: 'success',
      icon: 'calendar',
      title: n > 1 ? `${n} reschedules accepted` : 'Reschedule accepted',
      detail: andMore(rescheduleAcceptedItems[0].detail, n),
      actionLabel: 'View appointment',
      onAction: () => handleRescheduleAcceptedAction(rescheduleAcceptedItems),
      onDismiss: () => handleRescheduleAcceptedDismiss(rescheduleAcceptedItems),
    })
  }

  if (newReviewItems.length > 0) {
    const n = newReviewItems.length
    attentionItems.push({
      id: 'new-review',
      tone: 'info',
      icon: 'star',
      title: n > 1 ? `${n} new patient reviews` : 'New patient review',
      detail: andMore(newReviewItems[0].detail, n),
      actionLabel: 'View review',
      onAction: () => handleNewReviewAction(newReviewItems),
      onDismiss: () => handleNewReviewDismiss(newReviewItems),
    })
  }

  const greetingLine = `${greeting}, ${sp.name}`
  const countryFlag = (size: number) =>
    countryConfig && (
      <span title={countryConfig.name} style={{ display: 'inline-flex', flexShrink: 0 }}>
        <FlagImg code={countryConfig.code} size={size} style={{ borderRadius: '3px' }} />
      </span>
    )

  return (
    <SPLayout
      title={isDesktop ? greetingLine : 'Dashboard'}
      titleIcon={isDesktop ? countryFlag(22) : undefined}
      notifCount={unreadCount}
    >
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
            {/* On desktop the greeting is the page title in the top bar */}
            {!isDesktop && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                {countryFlag(16)}
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: C.text,
                    letterSpacing: '-0.02em',
                    fontFamily: font.family,
                  }}
                >
                  {greetingLine}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family, marginRight: '4px' }}>
                {today}
              </span>
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

        <DashboardAttention items={attentionItems} />

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
            <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em', fontFamily: font.family }}>
              {formatAmount(sp.monthlyEarnings, currency)}
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
          currency={currency}
          onboardingComplete={onboardingComplete}
          setupSteps={setupSteps}
          doneCount={doneCount}
          onStepAction={handleStepAction}
        />

        <InstallAppPrompt variant="card" />
        <HealthNewsSection articles={healthNews} />
      </div>
    </SPLayout>
  )
}
