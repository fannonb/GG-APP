import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { route } from '@/router/routes'
import { GGCard, GGButton, GGBadge } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatTime12h } from '@/utils/format'
import { usePatientDashboard, usePatientInvoices, usePatientPrescriptionRequests, usePatientProfile, useCreditStatus, useHealthNews } from '@/hooks/api'
import { useMarkPatientNotificationReadMutation } from '@/hooks/api/usePatientMutations'
import { useNotificationsStore } from '@/store/notifications.store'
import { useAuthStore } from '@/store/auth.store'
import { useUserStore } from '@/store/user.store'
import { isMockApi } from '@/api/config'
import { getCountryByCode } from '@/config/countries'
import { FlagImg } from '@/components/FlagImg'
import { NewUserDashboardScreen } from './NewUserDashboardScreen'
import { DashboardAppointmentsCard } from '@/features/patient/components/DashboardAppointmentsCard'
import { DashboardRecentActivity } from '@/features/patient/components/DashboardRecentActivity'
import { getAppointmentDisplayStatus } from '@/utils/appointments'
import { AdBannerStrip } from '@/components/AdBanner'
import { HealthNewsSection } from '@/components/HealthNewsSection'
import { useAdsStore } from '@/store/ads.store'
import { EMPTY_APPOINTMENTS, EMPTY_NEWS, EMPTY_TRANSACTIONS, getPatientFirstName, isLivePatientAccountNew } from '@/features/patient/patientAccount'
import { getFinancePartnerSummary } from '@/features/patient/credit/credit.constants'
import { ROUTES } from '@/router/routes'
import { CreditLowBalancePrompt } from '@/features/patient/credit/components/CreditLowBalancePrompt'
import { isCreditRunningLow } from '@/utils/credit-threshold'
import { CreditApprovedBanner } from '@/components/CreditApprovedBanner'
import {
  getUnreadCreditApprovalItems,
  getUnreadConfirmedAppointmentItems,
  getUnreadProviderCancelledAppointmentItems,
} from '@/utils/credit-notifications'
import { PrescriptionStatusBanner } from '@/components/PrescriptionStatusBanner'
import { buildPrescriptionQuoteBannerItems, getUnreadPrescriptionReadyItems, getUnreadPrescriptionInvoiceItems, isSyntheticPrescriptionBannerId } from '@/utils/prescription-notifications'
import { AppointmentCancelledBanner } from '@/components/AppointmentCancelledBanner'
import { LedgerAccessBanner } from '@/components/LedgerAccessBanner'
import { useLedgerStatus } from '@/hooks/api'

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

const categories = [
  { id: 'pharmacy',           label: 'Pharmacy'           },
  { id: 'laboratory',         label: 'Laboratory'         },
  { id: 'doctor',             label: 'Doctor'             },
  { id: 'radiology',          label: 'Radiology'          },
  { id: 'hospital',           label: 'Hospital'           },
  { id: 'clinic',             label: 'Clinic'             },
  { id: 'global_specialists', label: 'Global Specialists', isComingSoon: true },
]

const catIcons: Record<string, React.ReactNode> = {
  pharmacy:   <svg width="24" height="24" viewBox="0 0 26 26" fill="none"><rect x="4" y="4" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5"/><line x1="13" y1="8" x2="13" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="8" y1="13" x2="18" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  laboratory: <svg width="24" height="24" viewBox="0 0 26 26" fill="none"><path d="M10 4v9L5 20a2 2 0 001.8 2.9h12.4A2 2 0 0021 20l-5-7V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="10" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  doctor:     <svg width="24" height="24" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="9" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M5 22c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="18" cy="18" r="3" fill="white" stroke="currentColor" strokeWidth="1.5"/><path d="M18 16.5v1.5h1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  radiology:  <svg width="24" height="24" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M13 8v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="13" cy="13" r="1.5" fill="currentColor"/></svg>,
  hospital:   <svg width="24" height="24" viewBox="0 0 26 26" fill="none"><rect x="4" y="6" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M10 22V14h6v8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><line x1="13" y1="10" x2="13" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="11" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M4 12h18" stroke="currentColor" strokeWidth="1.5"/></svg>,
  clinic:     <svg width="24" height="24" viewBox="0 0 26 26" fill="none"><path d="M13 4L5 9v13h5v-5h6v5h5V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><line x1="13" y1="9" x2="13" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="10.5" y1="11.5" x2="15.5" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  global_specialists: <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.8"/><path d="M16 5a15 15 0 000 22M5 16h22M8 10a18 18 0 0016 0M8 22a18 18 0 0016 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
}

export function DashboardScreen() {
  const { userMode } = useAuthStore()
  const storedUser = useUserStore(s => s.user)
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
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
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const now = new Date()
  const spentThisMonthTx = transactions.filter(t => {
    if (t.status === 'failed') return false
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const spentThisMonth = spentThisMonthTx.reduce((sum, t) => sum + t.amount, 0)
  const spentThisMonthCount = spentThisMonthTx.length
  const hasUpcomingAppointments = appointments.length > 0
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
  const creditPartnerName = getFinancePartnerSummary(u.financePartnerId ?? 'moneymart')?.name ?? 'your finance partner'
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

  return (
    <AppLayout title="Dashboard">
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '20px', fontFamily: font.family }}>

        {/* Greeting */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', fontFamily: font.family }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: isMobile ? '20px' : '28px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em', fontFamily: font.family }}>
                {greeting}, {getPatientFirstName(u)}
              </div>
              {country && (
                <FlagImg
                  code={country.code}
                  size={isMobile ? 16 : 20}
                  style={{ borderRadius: '3px' }}
                />
              )}
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, marginTop: '2px', fontFamily: font.family }}>{today}</div>
          </div>
          {creditUnderReview && (
            <GGBadge type="warning">
              {pendingIncrease ? 'Increase Under Review' : 'Credit Under Review'}
            </GGBadge>
          )}
        </div>

        {pendingInvoice && (
          <div style={{ padding: isMobile ? '14px 16px' : '18px 22px', background: `linear-gradient(90deg, ${C.warningBg}, #FFF8E0)`, borderRadius: radius.lg, border: `1.5px solid rgba(245,166,35,0.35)`, display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', fontFamily: font.family }}>
            <div style={{ width: isMobile ? 38 : 44, height: isMobile ? 38 : 44, borderRadius: '50%', background: C.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3l6 10H2z" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinejoin="round" /><line x1="8" y1="7.5" x2="8" y2="10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /><circle cx="8" cy="11.5" r="0.8" fill="#fff" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#8A4D00', fontFamily: font.family }}>
                {pendingInvoiceCount} invoice{pendingInvoiceCount > 1 ? 's require' : ' requires'} your authorization
              </div>
              <div style={{ fontSize: '12px', color: '#A06000', marginTop: '2px', fontFamily: font.family }}>
                {pendingInvoice.id} from {pendingInvoice.provider.name} — {formatCurrency(pendingInvoice.amount, currency)}
              </div>
            </div>
            <GGButton
              variant="warning"
              size="sm"
              onClick={() => navigate(route.patientInvoice(pendingInvoice.id))}
              style={{ background: C.warning, color: '#fff', flexShrink: 0, width: isMobile ? '100%' : 'auto' }}
            >
              Authorize Now
            </GGButton>
          </div>
        )}

        {rescheduledAppointment && rescheduledAppointmentDate && (
          <div style={{ padding: isMobile ? '14px 16px' : '18px 22px', background: 'linear-gradient(90deg, rgba(124,58,237,0.08), rgba(124,58,237,0.02))', borderRadius: radius.lg, border: '1.5px solid rgba(124,58,237,0.28)', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', fontFamily: font.family }}>
            <div style={{ width: isMobile ? 38 : 44, height: isMobile ? 38 : 44, borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#fff" strokeWidth="1.5"/><path d="M10 6v4l2.5 1.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#5B21B6', marginBottom: '2px', fontFamily: font.family }}>Reschedule proposal waiting</div>
              <div style={{ fontSize: '13px', color: '#5B21B6', lineHeight: 1.5, fontFamily: font.family }}>
                <strong>{rescheduledAppointment.provider}</strong> proposed {rescheduledAppointmentDate} at {formatTime12h(rescheduledAppointment.time)} for {rescheduledAppointment.service}
              </div>
            </div>
            <GGButton
              variant="primary"
              size="sm"
              onClick={() => navigate(`/app/appointments/${rescheduledAppointment.id}/reschedule`)}
              style={{ background: '#7C3AED', border: 'none', flexShrink: 0, width: isMobile ? '100%' : 'auto' }}
            >
              Review Reschedule
            </GGButton>
          </div>
        )}

        {pendingAppointment && pendingAppointmentDate && (
          <div style={{ padding: isMobile ? '14px 16px' : '18px 22px', background: `linear-gradient(90deg, ${C.warningBg}, #FFFAE8)`, borderRadius: radius.lg, border: `1.5px solid rgba(245,166,35,0.35)`, display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', fontFamily: font.family }}>
            <div style={{ width: isMobile ? 38 : 44, height: isMobile ? 38 : 44, borderRadius: '50%', background: C.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#fff" strokeWidth="1.5"/><line x1="10" y1="6" x2="10" y2="11" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/><circle cx="10" cy="14" r="1" fill="#fff"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#8A4D00', marginBottom: '2px', fontFamily: font.family }}>Appointment Pending Confirmation</div>
              <div style={{ fontSize: '13px', color: '#8A4D00', lineHeight: 1.5, fontFamily: font.family }}>
                <strong>{pendingAppointment.provider}</strong> - {pendingAppointmentDate} at {formatTime12h(pendingAppointment.time)} for {pendingAppointment.service}
              </div>
            </div>
            <GGButton variant="warning" size="sm" onClick={() => navigate('/app/appointments')} style={{ background: C.warning, color: '#fff', flexShrink: 0, width: isMobile ? '100%' : 'auto' }}>
              View Appointments
            </GGButton>
          </div>
        )}

        {!pendingInvoice && prescriptionInvoiceItems.length > 0 && (
          <PrescriptionStatusBanner
            variant="invoice"
            items={prescriptionInvoiceItems}
            onAction={handlePrescriptionInvoiceAction}
            onDismiss={handlePrescriptionInvoiceDismiss}
          />
        )}

        {prescriptionQuoteItems.length > 0 && (
          <PrescriptionStatusBanner
            variant="quote"
            items={prescriptionQuoteItems}
            onAction={handlePrescriptionQuoteAction}
            onDismiss={handlePrescriptionQuoteDismiss}
          />
        )}

        {prescriptionReadyItems.length > 0 && (
          <PrescriptionStatusBanner
            variant="ready"
            items={prescriptionReadyItems}
            onAction={handlePrescriptionReadyAction}
            onDismiss={handlePrescriptionReadyDismiss}
          />
        )}

        {creditUnderReview && (
          <div style={{ padding: isMobile ? '14px 16px' : '18px 22px', background: `linear-gradient(90deg, ${C.blue100}, #EAF6FD)`, borderRadius: radius.lg, border: `1.5px solid rgba(56,182,255,0.28)`, display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', fontFamily: font.family }}>
            <div style={{ width: isMobile ? 38 : 44, height: isMobile ? 38 : 44, borderRadius: '50%', background: C.blue500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="#fff" strokeWidth="1.5"/><path d="M10 5.5v4.5l3 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.navy800, fontFamily: font.family }}>
                {pendingIncrease ? 'Limit increase under review' : 'Credit application under review'}
              </div>
              <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', lineHeight: 1.5, fontFamily: font.family }}>
                Your {pendingIncrease ? 'increase request was' : 'application was'} sent to the {creditPartnerName} team. We&apos;ll notify you as soon as a decision is made.
              </div>
            </div>
            <GGButton variant="primary" size="sm" onClick={() => navigate(`${ROUTES.CREDIT_STATUS}${pendingIncrease ? '?type=increase' : ''}`)} style={{ flexShrink: 0, width: isMobile ? '100%' : 'auto' }}>
              View Status
            </GGButton>
          </div>
        )}

        {creditApprovalItems.length > 0 && (
          <CreditApprovedBanner
            items={creditApprovalItems}
            approvedAmountLabel={approvedAmountLabel}
            onAction={handleCreditApprovalAction}
            onDismiss={handleCreditApprovalDismiss}
          />
        )}

        {showLowBalancePrompt && (
          <CreditLowBalancePrompt available={u.creditAvailable} countryCode={u.countryCode} />
        )}

        {showLedgerAccessBanner && (
          <LedgerAccessBanner
            grants={activeLedgerGrants}
            onManage={() => navigate(ROUTES.LEDGER_ACCESS)}
            onDismiss={() => {
              setDismissedLedgerFingerprint(ledgerAccessFingerprint)
              if (typeof window !== 'undefined') {
                window.sessionStorage.setItem(DISMISSED_LEDGER_ACCESS_KEY, ledgerAccessFingerprint)
              }
            }}
          />
        )}

        {apptCancelledItems.length > 0 && (
          <AppointmentCancelledBanner
            items={apptCancelledItems}
            onAction={handleApptCancelledAction}
            onDismiss={handleApptCancelledDismiss}
          />
        )}

        {apptConfirmedItems.map(item => (
          <div
            key={item.id}
            style={{
              padding: isMobile ? '14px 16px' : '18px 22px',
              background: 'linear-gradient(90deg, rgba(34,197,94,0.08), rgba(34,197,94,0.03))',
              borderRadius: radius.lg,
              border: '1.5px solid rgba(34,197,94,0.30)',
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
              background: C.success,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="2" y="3.5" width="18" height="16" rx="2.5" stroke="#fff" strokeWidth="1.5"/>
                <path d="M2 8.5h18M7 2v3M15 2v3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M7 13l2.5 2.5 5.5-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#15803D', marginBottom: '3px', letterSpacing: '-0.01em', fontFamily: font.family }}>
                {item.headline}
              </div>
              <div style={{ fontSize: '13px', color: '#166534', lineHeight: 1.5, fontFamily: font.family }}>
                {item.detail}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, width: isMobile ? '100%' : 'auto' }}>
              <GGButton
                variant="primary"
                size="sm"
                onClick={() => handleApptConfirmedView(item)}
                style={{ background: C.success, border: 'none', flex: isMobile ? 1 : 'none' }}
              >
                View Appointment →
              </GGButton>
              <button
                type="button"
                onClick={() => handleApptConfirmedDismiss(item)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(34,197,94,0.35)',
                  borderRadius: radius.sm,
                  color: '#15803D',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  fontFamily: font.family,
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}

        {/* 3 stat tiles */}
        {(() => {
          const nextApt = [...appointments]
            .filter(a => getAppointmentDisplayStatus(a) !== 'cancelled')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
          const nextAptStatus = nextApt ? getAppointmentDisplayStatus(nextApt) : null
          const nextAptDate = nextApt ? new Date(nextApt.date) : null
          const nextAptLabel = nextAptDate
            ? nextAptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + formatTime12h(nextApt!.time)
            : 'No upcoming'
          const nextAptSub = nextApt ? nextApt.provider : 'Book via Find Service'
          const openNextAppointment = () => {
            if (!nextApt) {
              navigate(ROUTES.FIND_SERVICE)
              return
            }
            if (nextAptStatus === 'pending' && nextApt.rescheduledAt) {
              navigate(`/app/appointments/${nextApt.id}/reschedule`)
              return
            }
            navigate(ROUTES.APPOINTMENTS)
          }
          return (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? '10px' : '12px', fontFamily: font.family }}>
              {/* Healthcare credit */}
              <button
                type="button"
                onClick={() => navigate(ROUTES.CREDIT_WALLET)}
                style={{
                  all: 'unset',
                  display: 'block',
                  padding: isMobile ? '14px 16px' : '20px 22px',
                  background: '#fff',
                  borderRadius: radius.lg,
                  border: `1px solid ${C.border}`,
                  gridColumn: isMobile ? 'span 2' : 'auto',
                  fontFamily: font.family,
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <div style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: font.family }}>Healthcare credit</div>
                  {country && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '1px 6px', borderRadius: '20px', background: C.bg, border: `1px solid ${C.border}`, flexShrink: 0 }}>
                      <FlagImg code={country.code} size={12} />
                      <span style={{ fontSize: '9px', fontWeight: 700, color: C.textSub, fontFamily: font.family }}>{country.currencyCode}</span>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 800, color: C.blue500, letterSpacing: '-0.04em', lineHeight: 1, fontFamily: font.family }}>{formatCurrency(u.creditAvailable, currency)}</div>
                <div style={{ fontSize: isMobile ? '11px' : '12px', color: C.textSub, marginTop: '6px', fontFamily: font.family }}>pays verified providers</div>
              </button>

              {/* Spent This Month */}
              <div style={{ padding: isMobile ? '14px 16px' : '20px 22px', background: '#fff', borderRadius: radius.lg, border: `1px solid ${C.border}`, fontFamily: font.family }}>
                <div style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px', fontFamily: font.family }}>Spent This Month</div>
                <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: C.navy800, letterSpacing: '-0.04em', lineHeight: 1, fontFamily: font.family }}>{formatCurrency(spentThisMonth, currency)}</div>
                <div style={{ fontSize: '11px', color: C.textSub, marginTop: '8px', fontFamily: font.family }}>
                  {spentThisMonthCount} payment{spentThisMonthCount === 1 ? '' : 's'}
                </div>
              </div>

              {/* Next Appointment */}
              <button
                type="button"
                onClick={openNextAppointment}
                style={{
                  all: 'unset',
                  display: 'block',
                  padding: isMobile ? '14px 16px' : '20px 22px',
                  background: '#fff',
                  borderRadius: radius.lg,
                  border: `1px solid ${C.border}`,
                  cursor: 'pointer',
                  fontFamily: font.family,
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: font.family }}>Next Appointment</div>
                  {nextApt && (
                    <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px', color: nextAptStatus === 'confirmed' ? C.success : C.warning, background: nextAptStatus === 'confirmed' ? C.successBg : C.warningBg, fontFamily: font.family }}>
                      {nextAptStatus === 'confirmed' ? 'Confirmed' : 'Pending'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 800, color: C.navy800, letterSpacing: '-0.03em', lineHeight: 1.1, fontFamily: font.family }}>{nextAptLabel}</div>
                <div style={{ fontSize: '11px', color: C.textSub, marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: font.family }}>{nextAptSub}</div>
              </button>
            </div>
          )
        })()}

        {/* Find a Service & Recent Transactions — In One Balanced Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1.15fr 1fr',
            gap: isMobile ? '16px' : '20px',
            alignItems: 'stretch',
            fontFamily: font.family,
          }}
        >
          {/* Service grid */}
          <GGCard padding={isMobile ? '16px' : '20px 22px'} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em', fontFamily: font.family }}>Find a Service</div>
                <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', fontFamily: font.family }}>Book verified providers & specialties</div>
              </div>
              <button type="button" onClick={() => navigate('/app/services')} style={{ all: 'unset', fontSize: '13px', color: C.blue500, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>See all →</button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault()
                const form = e.currentTarget
                const value = new FormData(form).get('q')
                const q = typeof value === 'string' ? value.trim() : ''
                navigate(q ? `/app/services?q=${encodeURIComponent(q)}` : '/app/services')
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                padding: '0 12px',
                height: 38,
                borderRadius: radius.sm,
                border: `1.5px solid ${C.border}`,
                background: C.bg,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="4.5" stroke={C.textLight} strokeWidth="1.4" />
                <line x1="10.5" y1="10.5" x2="13.5" y2="13.5" stroke={C.textLight} strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                name="q"
                type="search"
                placeholder="Search providers, services..."
                aria-label="Search providers, services, and locations"
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '12.5px',
                  fontFamily: font.family,
                  color: C.text,
                }}
              />
              <button
                type="submit"
                style={{
                  border: 'none',
                  background: C.blue500,
                  color: '#fff',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  fontFamily: font.family,
                  padding: '5px 12px',
                  borderRadius: radius.full,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Search
              </button>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', flex: 1 }}>
              {categories.filter(cat => cat.id !== 'global_specialists').map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => navigate(`/app/services/${cat.id}`)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: radius.sm,
                    background: C.bg,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.16s ease',
                    fontFamily: font.family,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = C.blue100
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = C.bg
                  }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      background: 'rgba(56, 182, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: C.blue500,
                    }}
                  >
                    {catIcons[cat.id]}
                  </div>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: C.text, textAlign: 'center', letterSpacing: '-0.01em', fontFamily: font.family }}>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Global Specialists subtle row */}
            <div
              style={{
                marginTop: '8px',
                padding: '7px 12px',
                borderRadius: radius.sm,
                background: C.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 22, height: 22, borderRadius: '6px', background: 'rgba(153, 157, 173, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textLight }}>
                  {catIcons['global_specialists']}
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Global Specialists</div>
              </div>
              <span style={{ fontSize: '9px', padding: '2px 6px', fontFamily: font.family, fontWeight: 700, borderRadius: radius.full, background: 'rgba(153, 157, 173, 0.12)', color: C.textLight }}>
                Soon
              </span>
            </div>
          </GGCard>

          {/* Recent transactions card */}
          <DashboardRecentActivity transactions={transactions} currency={currency} />
        </div>

        {hasUpcomingAppointments && (
          <DashboardAppointmentsCard appointments={appointments} />
        )}

        {!hasUnresolvedAction && <AdBannerStrip key={adVersion} countryName={country?.name} />}

        {!hasUnresolvedAction && <HealthNewsSection articles={healthNews ?? dashboard.news} />}
      </div>
    </AppLayout>
  )
}
