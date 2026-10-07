import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { route } from '@/router/routes'
import { GGCard } from '@/design-system'
import { C, font } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatAmount, formatCurrency, formatTime12h } from '@/utils/format'
import { usePatientDashboard, usePatientInvoices, usePatientPrescriptionRequests, usePatientProfile, useCreditStatus, useHealthNews } from '@/hooks/api'
import { useMarkPatientNotificationReadMutation } from '@/hooks/api/usePatientMutations'
import { useNotificationsStore } from '@/store/notifications.store'
import { useAuthStore } from '@/store/auth.store'
import { useUserStore } from '@/store/user.store'
import { isMockApi } from '@/api/config'
import { getCountryByCode } from '@/config/countries'
import { CountryFlag } from '@/features/admin/AdminShared'
import { NewUserDashboardScreen } from './NewUserDashboardScreen'
import { DashboardAttention, type AttentionItem } from '@/components/DashboardAttention'
import { DashboardWalletCard } from '@/features/patient/components/DashboardWalletCard'
import { DashboardNextAppointmentCard } from '@/features/patient/components/DashboardNextAppointmentCard'
import { DashboardRecentActivity } from '@/features/patient/components/DashboardRecentActivity'
import { DashboardFindCareCard } from '@/features/patient/components/DashboardFindCareCard'
import { getAppointmentDisplayStatus } from '@/utils/appointments'
import { AdBannerStrip } from '@/components/AdBanner'
import { HealthNewsSection } from '@/components/HealthNewsSection'
import { useAdsStore } from '@/store/ads.store'
import { EMPTY_APPOINTMENTS, EMPTY_NEWS, EMPTY_TRANSACTIONS, getPatientFirstName, isLivePatientAccountNew } from '@/features/patient/patientAccount'
import { getFinancePartnerIdForCountry, getFinancePartnerSummary } from '@/features/patient/credit/credit.constants'
import { ROUTES } from '@/router/routes'
import { getLowCreditThreshold, isCreditRunningLow } from '@/utils/credit-threshold'
import { describeLedgerAccess } from '@/utils/ledger-access'
import {
  getUnreadCreditApprovalItems,
  getUnreadConfirmedAppointmentItems,
  getUnreadProviderCancelledAppointmentItems,
} from '@/utils/credit-notifications'
import { buildPrescriptionQuoteBannerItems, getUnreadPrescriptionReadyItems, getUnreadPrescriptionInvoiceItems, isSyntheticPrescriptionBannerId } from '@/utils/prescription-notifications'
import { useLedgerStatus } from '@/hooks/api'
import { InstallAppPrompt } from '@/components/InstallApp'

const SEEN_CREDIT_APPROVALS_KEY = 'ggapp.seenCreditApprovalNotifications'
const SEEN_APPT_CONFIRMED_KEY = 'ggapp.seenConfirmedAppointmentNotifications'
const SEEN_PRESCRIPTION_QUOTE_KEY = 'ggapp.seenPrescriptionQuoteNotifications'
const SEEN_PRESCRIPTION_READY_KEY = 'ggapp.seenPrescriptionReadyNotifications'
const SEEN_PRESCRIPTION_INVOICE_KEY = 'ggapp.seenPrescriptionInvoiceNotifications'
const SEEN_APPT_CANCELLED_KEY = 'ggapp.seenProviderCancelledAppointmentNotifications'
const DISMISSED_LEDGER_ACCESS_KEY = 'ggapp.dismissedLedgerAccessBanner'

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

function loadSeenCreditApprovals(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(SEEN_CREDIT_APPROVALS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter(id => typeof id === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function saveSeenCreditApprovals(ids: Set<string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SEEN_CREDIT_APPROVALS_KEY, JSON.stringify(Array.from(ids)))
}

function loadSeenApptConfirmed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(SEEN_APPT_CONFIRMED_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((id: unknown) => typeof id === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function saveSeenApptConfirmed(ids: Set<string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SEEN_APPT_CONFIRMED_KEY, JSON.stringify(Array.from(ids)))
}

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

function loadSeenPrescriptionReady(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(SEEN_PRESCRIPTION_READY_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((id: unknown) => typeof id === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function saveSeenPrescriptionReady(ids: Set<string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SEEN_PRESCRIPTION_READY_KEY, JSON.stringify(Array.from(ids)))
}

function loadSeenPrescriptionInvoices(): Set<string> {
  return loadSeenIds(SEEN_PRESCRIPTION_INVOICE_KEY)
}

function saveSeenPrescriptionInvoices(ids: Set<string>) {
  saveSeenIds(SEEN_PRESCRIPTION_INVOICE_KEY, ids)
}

export function DashboardScreen() {
  const { userMode } = useAuthStore()
  const storedUser = useUserStore(s => s.user)
  const navigate = useNavigate()
  const { isMobile, isDesktop } = useResponsive()
  const { data, isLoading, isPending } = usePatientDashboard()
  const { data: profile } = usePatientProfile()
  const { data: invoices = [], isLoading: invoicesLoading } = usePatientInvoices()
  const { data: prescriptionRequests = [] } = usePatientPrescriptionRequests()
  const { data: creditStatusData } = useCreditStatus()
  const { data: healthNews } = useHealthNews()
  const { data: ledgerStatus } = useLedgerStatus()
  const patientNotifs = useNotificationsStore(s => s.patientNotifs)
  const markNotificationRead = useMarkPatientNotificationReadMutation()
  const [seenCreditApprovalIds, setSeenCreditApprovalIds] = useState<Set<string>>(
    () => loadSeenCreditApprovals(),
  )
  const [seenApptConfirmedIds, setSeenApptConfirmedIds] = useState<Set<string>>(
    () => loadSeenApptConfirmed(),
  )
  const [seenPrescriptionQuoteIds, setSeenPrescriptionQuoteIds] = useState<Set<string>>(
    () => loadSeenPrescriptionQuotes(),
  )
  const [seenPrescriptionReadyIds, setSeenPrescriptionReadyIds] = useState<Set<string>>(
    () => loadSeenPrescriptionReady(),
  )
  const [seenPrescriptionInvoiceIds, setSeenPrescriptionInvoiceIds] = useState<Set<string>>(
    () => loadSeenPrescriptionInvoices(),
  )
  const [seenApptCancelledIds, setSeenApptCancelledIds] = useState<Set<string>>(
    () => loadSeenIds(SEEN_APPT_CANCELLED_KEY),
  )
  const [dismissedLedgerFingerprint, setDismissedLedgerFingerprint] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return window.sessionStorage.getItem(DISMISSED_LEDGER_ACCESS_KEY) ?? ''
  })

  // Remount the banner strip every time the admin saves — version increments on every updateBanner call.
  const adVersion = useAdsStore(s => s.version)

  const dashboardLoading = (isLoading || isPending) && !data
  const accountContextLoading = dashboardLoading || invoicesLoading

  if (accountContextLoading) {
    return (
      <AppLayout title="Dashboard">
        <GGCard padding="24px">
          <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
            Loading dashboard...
          </div>
        </GGCard>
      </AppLayout>
    )
  }

  const dashboard = data ?? {
    user: profile?.user ?? storedUser,
    transactions: EMPTY_TRANSACTIONS,
    appointments: EMPTY_APPOINTMENTS,
    news: EMPTY_NEWS,
  }
  const u = dashboard.user
  const transactions = dashboard.transactions
  const appointments = dashboard.appointments.filter(
    appointment => {
      const status = getAppointmentDisplayStatus(appointment)
      return status !== 'completed' && status !== 'cancelled'
    },
  )
  const country = getCountryByCode(u.countryCode)
  const isNewAccount =
    (isMockApi && userMode === 'new') ||
    isLivePatientAccountNew({
      user: u,
      transactions,
      appointments,
      invoiceCount: invoices.length,
    })

  if (isNewAccount) {
    return <NewUserDashboardScreen user={u} appointments={dashboard.appointments} />
  }

  const currency = country?.currencySymbol ?? 'Z$'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const rescheduledAppointment = appointments.find(
    a => getAppointmentDisplayStatus(a) === 'pending' && !!a.rescheduledAt,
  )
  const pendingAppointment = appointments.find(
    a => getAppointmentDisplayStatus(a) === 'pending' && !a.rescheduledAt,
  )
  const pendingInvoices = invoices.filter(inv => {
    if (inv.status !== 'pending_auth') return false
    // Prescription invoices wait until the patient has reviewed the pharmacy quote.
    if (inv.isPrescription && !inv.prescriptionQuoteReviewed) return false
    return true
  })
  const pendingInvoice = pendingInvoices[0]
  const pendingInvoiceCount = pendingInvoices.length
  const pendingAppointmentDate = pendingAppointment
    ? new Date(pendingAppointment.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null
  const rescheduledAppointmentDate = rescheduledAppointment
    ? new Date(rescheduledAppointment.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null
  const creditUnderReview = u.creditStatus === 'pending'
  const pendingIncrease = creditUnderReview && creditStatusData?.application?.type === 'increase'
  const creditPartnerName = getFinancePartnerSummary(getFinancePartnerIdForCountry(u.countryCode))?.name ?? 'your finance partner'
  const showLowBalancePrompt = u.creditStatus === 'approved'
    && !creditUnderReview
    && isCreditRunningLow(u.creditAvailable, u.countryCode)
  const creditApprovalItems = getUnreadCreditApprovalItems(patientNotifs)
    .filter(item => !seenCreditApprovalIds.has(item.id))
  const approvedAmountLabel = (creditStatusData?.creditLimit ?? u.creditLimit) > 0
    ? formatCurrency(creditStatusData?.creditLimit ?? u.creditLimit, currency)
    : undefined

  const activeLedgerGrants = ledgerStatus?.activeGrants ?? []
  const ledgerAccessFingerprint = activeLedgerGrants.map(g => g.id).sort().join('|')
  const showLedgerAccessBanner =
    activeLedgerGrants.length > 0 && ledgerAccessFingerprint !== dismissedLedgerFingerprint

  const markCreditApprovalSeen = (id: string) => {
    setSeenCreditApprovalIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveSeenCreditApprovals(next)
      return next
    })
  }

  const handleCreditApprovalDismiss = (items: { id: string }[]) => {
    items.forEach(item => {
      markCreditApprovalSeen(item.id)
      markNotificationRead.mutate(item.id)
    })
  }

  const handleCreditApprovalAction = (items: { id: string; screen?: string }[]) => {
    items.forEach(item => {
      markCreditApprovalSeen(item.id)
      markNotificationRead.mutate(item.id)
    })
    navigate(items[0]?.screen ?? ROUTES.CREDIT_WALLET)
  }

  const apptConfirmedItems = getUnreadConfirmedAppointmentItems(patientNotifs)
    .filter(item => !seenApptConfirmedIds.has(item.id))

  const handleApptConfirmedView = (item: { id: string; screen?: string }) => {
    setSeenApptConfirmedIds(prev => {
      if (prev.has(item.id)) return prev
      const next = new Set(prev)
      next.add(item.id)
      saveSeenApptConfirmed(next)
      return next
    })
    markNotificationRead.mutate(item.id)
    if (item.screen) {
      navigate(item.screen)
    } else {
      navigate(ROUTES.APPOINTMENTS ?? '/app/appointments')
    }
  }

  const handleApptConfirmedDismiss = (item: { id: string }) => {
    setSeenApptConfirmedIds(prev => {
      if (prev.has(item.id)) return prev
      const next = new Set(prev)
      next.add(item.id)
      saveSeenApptConfirmed(next)
      return next
    })
    markNotificationRead.mutate(item.id)
  }

  const prescriptionQuoteItems = buildPrescriptionQuoteBannerItems(
    patientNotifs,
    prescriptionRequests,
    seenPrescriptionQuoteIds,
  )

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

  const prescriptionReadyItems = getUnreadPrescriptionReadyItems(patientNotifs)
    .filter(item => !seenPrescriptionReadyIds.has(item.id))

  const markPrescriptionReadySeen = (id: string) => {
    setSeenPrescriptionReadyIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveSeenPrescriptionReady(next)
      return next
    })
  }

  const handlePrescriptionReadyDismiss = (items: { id: string }[]) => {
    items.forEach(item => {
      markPrescriptionReadySeen(item.id)
      markNotificationRead.mutate(item.id)
    })
  }

  const handlePrescriptionReadyAction = (items: { id: string; screen?: string }[]) => {
    items.forEach(item => {
      markPrescriptionReadySeen(item.id)
      markNotificationRead.mutate(item.id)
    })
    navigate(items[0]?.screen ?? ROUTES.PRESCRIPTION_REQUESTS)
  }

  const prescriptionInvoiceItems = getUnreadPrescriptionInvoiceItems(patientNotifs)
    .filter(item => !seenPrescriptionInvoiceIds.has(item.id))

  const markPrescriptionInvoiceSeen = (id: string) => {
    setSeenPrescriptionInvoiceIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveSeenPrescriptionInvoices(next)
      return next
    })
  }

  const handlePrescriptionInvoiceDismiss = (items: { id: string }[]) => {
    items.forEach(item => {
      markPrescriptionInvoiceSeen(item.id)
      markNotificationRead.mutate(item.id)
    })
  }

  const handlePrescriptionInvoiceAction = (items: { id: string; screen?: string }[]) => {
    items.forEach(item => {
      markPrescriptionInvoiceSeen(item.id)
      markNotificationRead.mutate(item.id)
    })
    const target = items[0]?.screen
    if (target?.startsWith('/app/invoices/')) {
      const invoiceId = target.replace('/app/invoices/', '')
      navigate(route.patientInvoice(invoiceId))
      return
    }
    navigate(target ?? ROUTES.INVOICE_LIST)
  }

  const apptCancelledItems = getUnreadProviderCancelledAppointmentItems(patientNotifs)
    .filter(item => !seenApptCancelledIds.has(item.id))

  const markApptCancelledSeen = (id: string) => {
    setSeenApptCancelledIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveSeenIds(SEEN_APPT_CANCELLED_KEY, next)
      return next
    })
  }

  const handleApptCancelledDismiss = (items: { id: string }[]) => {
    items.forEach(item => {
      markApptCancelledSeen(item.id)
      markNotificationRead.mutate(item.id)
    })
  }

  const handleApptCancelledAction = (items: { id: string; screen?: string }[]) => {
    items.forEach(item => {
      markApptCancelledSeen(item.id)
      markNotificationRead.mutate(item.id)
    })
    navigate(items[0]?.screen ?? ROUTES.FIND_SERVICE)
  }

  const hasUnresolvedAction = Boolean(
    pendingInvoice ||
    rescheduledAppointment ||
    pendingAppointment ||
    prescriptionQuoteItems.length ||
    prescriptionInvoiceItems.length ||
    prescriptionReadyItems.length ||
    creditUnderReview,
  )

  const attentionItems: AttentionItem[] = []
  if (pendingInvoice) {
    attentionItems.push({
      id: `invoice-${pendingInvoice.id}`,
      tone: 'action',
      icon: 'invoice',
      title: pendingInvoiceCount > 1
        ? `${pendingInvoiceCount} invoices waiting for your approval`
        : 'Invoice waiting for your approval',
      detail: `${pendingInvoice.provider.name} · ${formatAmount(pendingInvoice.amount, currency)}`,
      actionLabel: 'Review & approve',
      onAction: () => navigate(pendingInvoiceCount > 1 ? ROUTES.INVOICE_LIST : route.patientInvoice(pendingInvoice.id)),
    })
  }
  if (rescheduledAppointment && rescheduledAppointmentDate) {
    attentionItems.push({
      id: `reschedule-${rescheduledAppointment.id}`,
      tone: 'action',
      icon: 'calendar',
      title: 'New appointment time proposed',
      detail: `${rescheduledAppointment.provider} suggested ${rescheduledAppointmentDate} at ${formatTime12h(rescheduledAppointment.time)} · ${rescheduledAppointment.service}`,
      actionLabel: 'Respond',
      onAction: () => navigate(`/app/appointments/${rescheduledAppointment.id}/reschedule`),
    })
  }
  if (pendingAppointment && pendingAppointmentDate) {
    attentionItems.push({
      id: `pending-${pendingAppointment.id}`,
      tone: 'info',
      title: 'Waiting for the provider to confirm',
      detail: `${pendingAppointment.provider} · ${pendingAppointmentDate} at ${formatTime12h(pendingAppointment.time)} · ${pendingAppointment.service}`,
      actionLabel: 'View',
      onAction: () => navigate(ROUTES.APPOINTMENTS),
    })
  }
  if (creditUnderReview) {
    attentionItems.push({
      id: 'credit-review',
      tone: 'info',
      icon: 'credit',
      title: pendingIncrease ? 'Limit increase under review' : 'Credit application under review',
      detail: `${creditPartnerName} is reviewing your request. We'll notify you as soon as there's a decision.`,
      actionLabel: 'View status',
      onAction: () => navigate(`${ROUTES.CREDIT_STATUS}${pendingIncrease ? '?type=increase' : ''}`),
    })
  }
  if (showLowBalancePrompt) {
    attentionItems.push({
      id: 'credit-low',
      tone: 'info',
      icon: 'payment',
      title: 'Your credit is running low',
      detail: `${formatAmount(u.creditAvailable, currency)} left, below the ${formatAmount(getLowCreditThreshold(u.countryCode), currency)} buffer we recommend.`,
      actionLabel: 'Request increase',
      onAction: () => navigate(ROUTES.CREDIT_INCREASE),
    })
  }
  if (showLedgerAccessBanner) {
    const ledgerCopy = describeLedgerAccess(activeLedgerGrants)
    attentionItems.push({
      id: 'ledger-access',
      tone: 'info',
      icon: 'shield',
      title: ledgerCopy.headline,
      detail: ledgerCopy.detail,
      actionLabel: 'Manage access',
      onAction: () => navigate(ROUTES.LEDGER_ACCESS),
      onDismiss: () => {
        setDismissedLedgerFingerprint(ledgerAccessFingerprint)
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(DISMISSED_LEDGER_ACCESS_KEY, ledgerAccessFingerprint)
        }
      },
    })
  }
  apptConfirmedItems.forEach(item => {
    attentionItems.push({
      id: `confirmed-${item.id}`,
      tone: 'success',
      icon: 'calendar',
      title: item.headline,
      detail: item.detail,
      actionLabel: 'View',
      onAction: () => handleApptConfirmedView(item),
      onDismiss: () => handleApptConfirmedDismiss(item),
    })
  })

  const andMore = (detail: string, count: number) =>
    count > 1 ? `${detail.replace(/\.\s*$/, '')} · +${count - 1} more` : detail

  if (!pendingInvoice && prescriptionInvoiceItems.length > 0) {
    const n = prescriptionInvoiceItems.length
    attentionItems.push({
      id: 'rx-invoice',
      tone: 'action',
      icon: 'invoice',
      title: n > 1 ? `${n} medication invoices need payment` : 'Medication invoice ready',
      detail: andMore(prescriptionInvoiceItems[0].detail, n),
      actionLabel: 'Review invoice',
      onAction: () => handlePrescriptionInvoiceAction(prescriptionInvoiceItems),
      onDismiss: () => handlePrescriptionInvoiceDismiss(prescriptionInvoiceItems),
    })
  }
  if (prescriptionQuoteItems.length > 0) {
    const n = prescriptionQuoteItems.length
    attentionItems.push({
      id: 'rx-quote',
      tone: 'action',
      icon: 'prescription',
      title: n > 1 ? `${n} prescription updates need review` : 'Pharmacy responded to your prescription',
      detail: andMore(prescriptionQuoteItems[0].detail, n),
      actionLabel: 'Review quote',
      onAction: () => handlePrescriptionQuoteAction(prescriptionQuoteItems),
      onDismiss: () => handlePrescriptionQuoteDismiss(prescriptionQuoteItems),
    })
  }
  if (apptCancelledItems.length > 0) {
    const n = apptCancelledItems.length
    attentionItems.push({
      id: 'appt-cancelled',
      tone: 'alert',
      icon: 'calendar-x',
      title: n > 1 ? `${n} appointments cancelled` : 'Appointment cancelled by provider',
      detail: andMore(apptCancelledItems[0].detail, n),
      actionLabel: 'View appointments',
      onAction: () => handleApptCancelledAction(apptCancelledItems),
      onDismiss: () => handleApptCancelledDismiss(apptCancelledItems),
    })
  }
  if (prescriptionReadyItems.length > 0) {
    const n = prescriptionReadyItems.length
    attentionItems.push({
      id: 'rx-ready',
      tone: 'success',
      icon: 'prescription',
      title: n > 1 ? `${n} orders ready` : 'Your medication is ready',
      detail: andMore(prescriptionReadyItems[0].detail, n),
      actionLabel: 'View order',
      onAction: () => handlePrescriptionReadyAction(prescriptionReadyItems),
      onDismiss: () => handlePrescriptionReadyDismiss(prescriptionReadyItems),
    })
  }
  if (creditApprovalItems.length > 0) {
    const primary = creditApprovalItems[0]
    attentionItems.push({
      id: 'credit-approved',
      tone: 'success',
      icon: 'credit',
      title: /increase/i.test(primary.headline) ? 'Your limit increase was approved' : 'Your healthcare credit was approved',
      detail: primary.detail,
      meta: approvedAmountLabel,
      actionLabel: 'View credit',
      onAction: () => handleCreditApprovalAction(creditApprovalItems),
      onDismiss: () => handleCreditApprovalDismiss(creditApprovalItems),
    })
  }

  const greetingLine = `${greeting}, ${getPatientFirstName(u)}`
  const countryFlag = (size: number) =>
    country && (
      <span title={country.name} aria-label={country.name} role="img" style={{ display: 'inline-flex', flexShrink: 0 }}>
        <CountryFlag code={country.code} size={size} />
      </span>
    )

  return (
    <AppLayout title={isDesktop ? greetingLine : 'Home'} titleIcon={isDesktop ? countryFlag(22) : undefined}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '20px', fontFamily: font.family }}>

        {/* On desktop the greeting is the page title in the top bar */}
        {!isDesktop && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '22px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em', fontFamily: font.family }}>
            {countryFlag(18)}
            {greetingLine}
          </div>
        )}

        <DashboardAttention items={attentionItems} />

        {/* Wallet + next appointment */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: isMobile ? '12px' : '20px' }}>
          <DashboardWalletCard user={u} currency={currency} partnerId={getFinancePartnerIdForCountry(u.countryCode)} partnerName={creditPartnerName} />
          <DashboardNextAppointmentCard appointments={appointments} />
        </div>

        {/* Find care + recent activity */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1.15fr 1fr',
            gap: isMobile ? '16px' : '20px',
            alignItems: 'stretch',
            fontFamily: font.family,
          }}
        >
          <DashboardFindCareCard />

          <DashboardRecentActivity transactions={transactions} currency={currency} />
        </div>

        {!hasUnresolvedAction && <AdBannerStrip key={adVersion} countryName={country?.name} />}

        <InstallAppPrompt variant="card" />
        <HealthNewsSection articles={healthNews ?? dashboard.news} />
      </div>
    </AppLayout>
  )
}
