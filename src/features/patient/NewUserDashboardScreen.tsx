import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatAmount } from '@/utils/format'
import { getCountryByCode } from '@/config/countries'
import { AdBannerStrip } from '@/components/AdBanner'
import { HealthNewsSection } from '@/components/HealthNewsSection'
import { CountryFlag } from '@/features/admin/AdminShared'
import { DashboardAttention, type AttentionItem } from '@/components/DashboardAttention'
import { DashboardWalletCard } from '@/features/patient/components/DashboardWalletCard'
import { DashboardNextAppointmentCard } from '@/features/patient/components/DashboardNextAppointmentCard'
import { DashboardFindCareCard } from '@/features/patient/components/DashboardFindCareCard'
import { DashboardRecentActivity } from '@/features/patient/components/DashboardRecentActivity'
import { getFinancePartnerIdForCountry, getFinancePartnerSummary } from '@/features/patient/credit/credit.constants'
import { ROUTES, route } from '@/router/routes'
import { useAdsStore } from '@/store/ads.store'
import { EMPTY_PATIENT, derivePatientOnboardingCompletedSteps, getPatientFirstName } from '@/features/patient/patientAccount'
import { useMarkPatientNotificationReadMutation, usePatientInvoices, usePatientPrescriptionRequests } from '@/hooks/api'
import { useNotificationsStore } from '@/store/notifications.store'
import {
  buildPrescriptionQuoteBannerItems,
  isSyntheticPrescriptionBannerId,
} from '@/utils/prescription-notifications'
import { getAppointmentDisplayStatus } from '@/utils/appointments'
import type { Appointment, Patient } from '@/types/user.types'
import { InstallAppPrompt } from '@/components/InstallApp'

const SEEN_PRESCRIPTION_QUOTE_KEY = 'ggapp.seenPrescriptionQuoteNotifications'
const CYAN_DEEP = '#0B7BC0'
const CYAN_MID = '#1A9BE6'

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

/**
 * Onboarding step numbers come from derivePatientOnboardingCompletedSteps
 * (1 account, 2 email, 3 PIN, 4 credit, 5 first booking). Credit is shown
 * before the PIN because the lender's review takes time and nothing can be
 * paid until it is approved.
 */
const STEP_ORDER = [1, 2, 4, 3, 5] as const
const STEP_LABEL: Record<number, string> = {
  1: 'Account created',
  2: 'Email verified',
  3: 'Set payment PIN',
  4: 'Apply for credit',
  5: 'Book first visit',
}

interface NewUserDashboardScreenProps {
  user?: Patient
  appointments?: Appointment[]
}

export function NewUserDashboardScreen({
  user = EMPTY_PATIENT,
  appointments = [],
}: NewUserDashboardScreenProps) {
  const navigate = useNavigate()
  const { isMobile, isDesktop } = useResponsive()
  const adVersion = useAdsStore(s => s.version)
  const u = user
  const country = getCountryByCode(u.countryCode)
  const currency = country?.currencySymbol ?? 'Z$'
  const partnerId = getFinancePartnerIdForCountry(u.countryCode)
  const partnerName = getFinancePartnerSummary(partnerId)?.name ?? 'your finance partner'
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

  const upcomingAppointments = appointments.filter(a => {
    const status = getAppointmentDisplayStatus(a)
    return status !== 'completed' && status !== 'cancelled'
  })

  const completed = new Set(derivePatientOnboardingCompletedSteps(u, appointments.length))
  const doneCount = STEP_ORDER.filter(n => completed.has(n)).length
  const currentStep = STEP_ORDER.find(n => !completed.has(n))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const greetingLine = `${greeting}, ${getPatientFirstName(u)}`
  const countryFlag = (size: number) =>
    country && (
      <span title={country.name} aria-label={country.name} role="img" style={{ display: 'inline-flex', flexShrink: 0 }}>
        <CountryFlag code={country.code} size={size} />
      </span>
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
      if (!isSyntheticPrescriptionBannerId(item.id)) markNotificationRead.mutate(item.id)
    })
  }

  const handlePrescriptionQuoteAction = (items: { id: string; screen?: string }[]) => {
    handlePrescriptionQuoteDismiss(items)
    navigate(items[0]?.screen ?? ROUTES.PRESCRIPTION_REQUESTS)
  }

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
      onAction: () => navigate(route.patientInvoice(pendingInvoice.id)),
    })
  }
  if (prescriptionQuoteItems.length > 0) {
    const n = prescriptionQuoteItems.length
    attentionItems.push({
      id: 'rx-quote',
      tone: 'action',
      icon: 'prescription',
      title: n > 1 ? `${n} prescription updates need review` : 'Pharmacy responded to your prescription',
      detail: n > 1 ? `${prescriptionQuoteItems[0].detail} · +${n - 1} more` : prescriptionQuoteItems[0].detail,
      actionLabel: 'Review quote',
      onAction: () => handlePrescriptionQuoteAction(prescriptionQuoteItems),
      onDismiss: () => handlePrescriptionQuoteDismiss(prescriptionQuoteItems),
    })
  }

  const nextStepContent: Record<number, { title: string; body: string; cta: string; go: () => void }> = {
    4: {
      title: 'Apply for healthcare credit',
      body: `${partnerName} reviews your application. Once approved, you can pay verified providers without paying at the counter.`,
      cta: 'Apply for credit',
      go: () => navigate(ROUTES.CREDIT_DISCLAIMER),
    },
    3: {
      title: 'Set your payment PIN',
      body: "You'll enter this 4-digit PIN to approve every payment, so no money moves without you.",
      cta: 'Set up PIN',
      go: () => navigate(ROUTES.SECURITY_PIN, { state: { returnTo: ROUTES.DASHBOARD } }),
    },
    5: {
      title: 'Book your first visit',
      body: 'Find a verified provider near you and request a time that suits you.',
      cta: 'Find care',
      go: () => navigate(ROUTES.FIND_SERVICE),
    },
  }
  const next = currentStep ? nextStepContent[currentStep] : null

  const welcomeCard = next && (
    <section
      aria-label="Getting started"
      style={{
        background: '#fff',
        border: `1px solid ${C.border}`,
        borderRadius: radius.lg,
        padding: isMobile ? '18px' : '22px 24px',
        fontFamily: font.family,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Welcome to GG'APP</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: CYAN_DEEP }}>{doneCount} of {STEP_ORDER.length} done</div>
      </div>
      <div
        role="progressbar"
        aria-label="Setup progress"
        aria-valuenow={doneCount}
        aria-valuemin={0}
        aria-valuemax={STEP_ORDER.length}
        style={{ height: 6, borderRadius: radius.full, background: C.bg, overflow: 'hidden', marginTop: 10 }}
      >
        <div style={{ width: `${(doneCount / STEP_ORDER.length) * 100}%`, height: '100%', borderRadius: radius.full, background: `linear-gradient(90deg, ${C.blue400} 0%, ${CYAN_MID} 100%)` }} />
      </div>

      <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 16, marginTop: 18, flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: CYAN_DEEP, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next step</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginTop: 4, letterSpacing: '-0.01em' }}>{next.title}</div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, lineHeight: 1.55 }}>{next.body}</div>
        </div>
        <button
          type="button"
          onClick={next.go}
          style={{
            height: 44,
            padding: '0 22px',
            borderRadius: radius.sm,
            border: 'none',
            background: `linear-gradient(135deg, ${CYAN_MID} 0%, ${CYAN_DEEP} 100%)`,
            boxShadow: '0 6px 16px rgba(11,123,192,0.28)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: font.family,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {next.cta}
        </button>
      </div>

      <ol style={{ listStyle: 'none', margin: '16px 0 0', padding: '14px 0 0', borderTop: `1px solid ${C.border}`, display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
        {STEP_ORDER.map(n => {
          const done = completed.has(n)
          const isCurrent = n === currentStep
          return (
            <li key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: isCurrent ? 700 : 500, color: done ? C.textSub : isCurrent ? C.text : C.textLight }}>
              <span
                aria-hidden
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  boxSizing: 'border-box',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: done ? '#16A34A' : '#fff',
                  border: done ? 'none' : `2px solid ${isCurrent ? CYAN_DEEP : C.border}`,
                }}
              >
                {done && (
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M3 7.25l2.5 2.5L11 4.25" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </span>
              <span style={{ textDecoration: done ? 'line-through' : 'none' }}>{STEP_LABEL[n]}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )

  return (
    <AppLayout title={isDesktop ? greetingLine : 'Home'} titleIcon={isDesktop ? countryFlag(22) : undefined}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 20, fontFamily: font.family }}>
        {!isDesktop && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>
            {countryFlag(18)}
            {greetingLine}
          </div>
        )}

        {welcomeCard}

        <DashboardAttention items={attentionItems} />

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: isMobile ? 12 : 20 }}>
          <DashboardWalletCard user={u} currency={currency} partnerId={partnerId} partnerName={partnerName} />
          <DashboardNextAppointmentCard appointments={upcomingAppointments} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.15fr 1fr', gap: isMobile ? 16 : 20, alignItems: 'stretch' }}>
          <DashboardFindCareCard />
          <DashboardRecentActivity transactions={[]} currency={currency} />
        </div>

        {attentionItems.length === 0 && <AdBannerStrip key={adVersion} countryName={country?.name} />}

        <InstallAppPrompt variant="card" />
        <HealthNewsSection />
      </div>
    </AppLayout>
  )
}
