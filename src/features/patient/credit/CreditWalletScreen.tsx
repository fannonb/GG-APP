import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { isMockApi } from '@/api/config'
import { C, font, radius } from '@/design-system/tokens'
import { usePatientInvoices, usePatientTransactions } from '@/hooks/api'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatAmount, formatDate } from '@/utils/format'
import { getCountryByCode } from '@/config/countries'
import { useAuthStore } from '@/store/auth.store'
import { ROUTES, route } from '@/router/routes'
import { DashboardAttention, type AttentionItem } from '@/components/DashboardAttention'
import { InvoiceTable, type InvoiceTableColumn } from '@/components/InvoiceTable'
import type { PatientInvoice } from '@/types/invoice.types'
import type { Transaction } from '@/types/user.types'
import { PAGE_SIZE } from '@/components/paging'
import { SimplePager } from '@/components/SimplePager'
import { PARTNER_MARKS } from './partnerMarks'
import { CreditEmptyState } from './components/CreditEmptyState'
import { RepaymentCard, RepaymentSchedule } from './components/RepaymentSection'
import { buildRepaymentPreview } from './repaymentPreview'
import { getFinancePartnerIdForCountry, getFinancePartnerSummary } from './credit.constants'
import { useUserStore } from '@/store/user.store'
import { getLowCreditThreshold, isCreditRunningLow } from '@/utils/credit-threshold'

const CYAN_DEEP = '#0B7BC0'
const CYAN_MID = '#1A9BE6'

const primaryBtn: React.CSSProperties = {
  height: 42,
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
}

const secondaryBtn: React.CSSProperties = {
  ...primaryBtn,
  background: '#fff',
  boxShadow: 'none',
  border: '1px solid rgba(11,123,192,0.35)',
  color: CYAN_DEEP,
}

const linkBtn: React.CSSProperties = {
  fontSize: 13,
  color: CYAN_DEEP,
  fontWeight: 700,
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  padding: 0,
  fontFamily: font.family,
}

function SummaryCard({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div style={{
      padding: '16px 18px',
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: radius.md,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textLight, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// Same pill styles as the SP payments table (SPPaymentsScreen PAYMENT_TYPE_PILL).
const PAYMENT_TYPE_PILL: Record<'appointment' | 'prescription', { label: string; background: string; color: string; border: string }> = {
  prescription: { label: 'Prescription', background: C.blue100, color: '#1A5D8A', border: C.blue300 },
  appointment: { label: 'Appointment', background: C.navy800, color: '#fff', border: C.navy800 },
}

type RecentPaymentRow = { tx: Transaction; invoice?: PatientInvoice }

const RECENT_PAYMENT_COLUMNS = (currency: string): InvoiceTableColumn<RecentPaymentRow>[] => [
  {
    key: 'service',
    header: 'Service',
    render: ({ tx, invoice }) => {
      const forWhom = invoice?.serviceFor?.type === 'beneficiary' ? invoice.serviceFor : null
      return (
        <div>
          <div style={{ fontWeight: 700, color: C.text, whiteSpace: 'nowrap' }}>{tx.service}</div>
          {forWhom && (
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 3, whiteSpace: 'nowrap' }}>
              For {forWhom.name}{forWhom.relation ? ` · ${forWhom.relation}` : ''}
            </div>
          )}
        </div>
      )
    },
  },
  { key: 'provider', header: 'Provider', render: ({ tx }) => <span style={{ color: C.textSub }}>{tx.provider}</span> },
  {
    key: 'date',
    header: 'Date',
    render: ({ tx }) => <span style={{ whiteSpace: 'nowrap', color: C.textSub }}>{formatDate(tx.date, { month: 'short', day: 'numeric' })}</span>,
  },
  {
    key: 'type',
    header: 'Type',
    render: ({ invoice }) => {
      const pill = PAYMENT_TYPE_PILL[invoice?.isPrescription ? 'prescription' : 'appointment']
      return (
        <span style={{ padding: '3px 8px', borderRadius: radius.full, background: pill.background, color: pill.color, border: `1px solid ${pill.border}`, fontSize: '11px', fontWeight: 700, fontFamily: font.family, whiteSpace: 'nowrap' }}>
          {pill.label}
        </span>
      )
    },
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    render: ({ tx }) => {
      const failed = tx.status === 'failed'
      const pending = tx.status === 'pending'
      return (
        <div>
          <div style={{ fontWeight: 800, whiteSpace: 'nowrap', color: failed ? C.error : C.text }}>
            {formatAmount(tx.amount, currency)}
          </div>
          {(failed || pending) && (
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3, color: failed ? C.error : '#B45309' }}>
              {failed ? 'Failed' : 'Processing'}
            </div>
          )}
        </div>
      )
    },
  },
  {
    key: 'chevron',
    header: '',
    align: 'right',
    width: 40,
    render: () => (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ color: C.textLight, verticalAlign: 'middle' }}>
        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export function CreditWalletScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const { userMode } = useAuthStore()
  const u = useUserStore(s => s.user)
  const beneficiaries = useUserStore(s => s.beneficiaries)
  const { data: liveTransactions = [] } = usePatientTransactions()
  const { data: invoiceData } = usePatientInvoices()
  const [howOpen, setHowOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [recentPage, setRecentPage] = useState(1)

  const isNew = isMockApi
    ? userMode === 'new'
    : u.creditStatus === 'not_applied' && u.creditLimit === 0
  const country = getCountryByCode(u.countryCode)
  const currency = country?.currencySymbol ?? ''
  const partnerId = getFinancePartnerIdForCountry(u.countryCode)
  const partner = getFinancePartnerSummary(partnerId)
  const partnerName = partner?.name ?? 'your finance partner'
  const mark = PARTNER_MARKS[partnerId]
  const accountRef = u.creditAccountRef?.trim() || null

  const transactions = isNew ? [] : liveTransactions
  const sortedTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const lastPayment = sortedTransactions.find(tx => tx.status !== 'failed')

  // "Recent payments to providers": client-side pages of PAGE_SIZE, newest first.
  const recentPageCount = Math.max(1, Math.ceil(sortedTransactions.length / PAGE_SIZE))
  const recentPageInRange = recentPage <= recentPageCount ? recentPage : 1
  const recentPageItems = sortedTransactions.slice((recentPageInRange - 1) * PAGE_SIZE, recentPageInRange * PAGE_SIZE)
  const showRecentPager = sortedTransactions.length > PAGE_SIZE
  // Back to page 1 when the list shrinks past the page the user was on.
  if (recentPage > recentPageCount) setRecentPage(1)

  const beneficiariesActive = Boolean(u.beneficiariesEnabled) || beneficiaries.length > 0
  const activeBeneficiaries = isNew || !beneficiariesActive ? [] : beneficiaries

  const creditUsed = Math.max(0, u.creditLimit - u.creditAvailable)
  const limitUsedPct = u.creditLimit > 0
    ? Math.min(100, Math.round((creditUsed / u.creditLimit) * 100))
    : 0
  // Placeholder until the finance partner exposes real schedules; never shown against live data.
  const repaymentPlan = isMockApi ? buildRepaymentPreview(creditUsed) : null
  const showLowBalancePrompt = u.creditStatus === 'approved'
    && isCreditRunningLow(u.creditAvailable, u.countryCode)

  const pendingInvoices = (isNew ? [] : invoiceData ?? []).filter(invoice => {
    if (invoice.status !== 'pending_auth') return false
    if (invoice.isPrescription && !invoice.prescriptionQuoteReviewed) return false
    return true
  })
  const pendingCount = pendingInvoices.length
  const firstPending = pendingInvoices[0]

  if (isNew) return (
    <AppLayout title="Healthcare allocation" notifCount={0}>
      <CreditEmptyState />
    </AppLayout>
  )

  const attentionItems: AttentionItem[] = []
  if (firstPending) {
    attentionItems.push({
      id: `invoice-${firstPending.id}`,
      tone: 'action',
      icon: 'invoice',
      title: pendingCount > 1 ? `${pendingCount} invoices waiting for your approval` : 'Invoice waiting for your approval',
      detail: `${firstPending.provider.name} · ${formatAmount(firstPending.amount, currency)}`,
      actionLabel: 'Review & approve',
      onAction: () => navigate(pendingCount > 1 ? ROUTES.INVOICE_LIST : route.patientInvoice(firstPending.id)),
    })
  }
  if (showLowBalancePrompt) {
    attentionItems.push({
      id: 'credit-low',
      tone: 'info',
      icon: 'payment',
      title: 'Your allocation is running low',
      detail: `${formatAmount(u.creditAvailable, currency)} left, below the ${formatAmount(getLowCreditThreshold(u.countryCode), currency)} buffer we recommend.`,
      actionLabel: 'Request increase',
      onAction: () => navigate(ROUTES.CREDIT_INCREASE),
    })
  }

  const familyLabel = !beneficiariesActive
    ? 'Not enabled'
    : activeBeneficiaries.length === 0
      ? 'None added'
      : activeBeneficiaries.length === 1
        ? `${activeBeneficiaries[0].name} · ${activeBeneficiaries[0].relation}`
        : `${activeBeneficiaries[0].name} +${activeBeneficiaries.length - 1}`

  const valueStyle: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
  const subStyle: React.CSSProperties = { fontSize: 13, color: C.textSub, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

  // Link each transaction to its invoice (same reference) for the Type pill and the "For" line.
  const invoiceByRef = new Map((invoiceData ?? []).map(invoice => [invoice.id, invoice] as const))
  const recentPaymentRows: RecentPaymentRow[] = recentPageItems.map(tx => ({
    tx,
    invoice: tx.invoiceId ? invoiceByRef.get(tx.invoiceId) : undefined,
  }))

  return (
    <AppLayout title="Healthcare allocation" notifCount={pendingCount || 1}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24, fontFamily: font.family }}>

        <DashboardAttention items={attentionItems} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile || !repaymentPlan ? '1fr' : 'minmax(0, 1.55fr) minmax(300px, 1fr)',
          gap: isMobile ? 12 : 20,
          alignItems: 'stretch',
        }}>
        <section
          aria-label="Allocation balance"
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #F2FAFF 0%, #DDF1FF 55%, #C9E9FF 100%)',
            border: '1px solid rgba(56,182,255,0.28)',
            borderRadius: radius.lg,
            padding: isMobile ? '20px 18px' : '26px 28px',
          }}
        >
          <div aria-hidden style={{ position: 'absolute', width: 380, height: 380, right: -120, bottom: -190, borderRadius: '50%', border: '48px solid rgba(255,255,255,0.45)', pointerEvents: 'none' }} />
          <div aria-hidden style={{ position: 'absolute', width: 200, height: 200, right: -40, bottom: -100, borderRadius: '50%', background: 'rgba(56,182,255,0.12)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{
                height: 48,
                padding: '0 14px',
                borderRadius: 12,
                background: '#fff',
                boxShadow: '0 2px 10px rgba(11,123,192,0.10)',
                display: 'flex',
                alignItems: 'center',
              }}>
                {mark ? (
                  <img src={mark.src} alt={partnerName} draggable={false} style={{ height: mark.height, width: 'auto', display: 'block' }} />
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{partnerName}</span>
                )}
              </div>
              {u.creditStatus === 'approved' && (
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: radius.full, color: '#15803D', background: 'rgba(255,255,255,0.8)' }}>
                  Active allocation
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: isMobile || repaymentPlan ? 'stretch' : 'flex-end', justifyContent: 'space-between', gap: 20, flexDirection: isMobile || repaymentPlan ? 'column' : 'row' }}>
              <div style={{ flex: 1, minWidth: 0, maxWidth: 620 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: CYAN_DEEP, marginBottom: 6 }}>Available to spend on care</div>
                <div style={{ fontSize: isMobile ? 36 : 44, fontWeight: 800, color: C.text, letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {formatAmount(u.creditAvailable, currency)}
                </div>

                <div
                  role="progressbar"
                  aria-label="Allocation used"
                  aria-valuenow={limitUsedPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  style={{ marginTop: 20, height: 10, borderRadius: radius.full, background: 'rgba(255,255,255,0.85)', overflow: 'hidden' }}
                >
                  <div style={{ width: `${limitUsedPct}%`, height: '100%', borderRadius: radius.full, background: `linear-gradient(90deg, ${C.blue400} 0%, ${CYAN_MID} 100%)` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 8, fontSize: 13, color: C.textSub, flexWrap: 'wrap' }}>
                  <span>
                    <strong style={{ color: C.text, fontWeight: 700 }}>{formatAmount(creditUsed, currency)}</strong> used · {limitUsedPct}%
                  </span>
                  <span>
                    of <strong style={{ color: C.text, fontWeight: 700 }}>{formatAmount(u.creditLimit, currency)}</strong> limit
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => navigate(ROUTES.CREDIT_INCREASE)} style={{ ...secondaryBtn, flex: isMobile ? 1 : undefined }}>
                  Request increase
                </button>
                <button type="button" onClick={() => navigate(ROUTES.FIND_SERVICE)} style={{ ...primaryBtn, flex: isMobile ? 1 : undefined }}>
                  Find care
                </button>
              </div>
            </div>
          </div>
        </section>

        {repaymentPlan && (
          <RepaymentCard
            plan={repaymentPlan}
            currency={currency}
            scheduleOpen={scheduleOpen}
            onToggleSchedule={() => setScheduleOpen(o => !o)}
          />
        )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
          gap: isMobile ? 12 : 16,
        }}>
          <SummaryCard label="Last payment">
            {lastPayment ? (
              <>
                <div style={valueStyle}>{formatAmount(lastPayment.amount, currency)}</div>
                <div style={subStyle}>
                  {lastPayment.service} · {formatDate(lastPayment.date, { month: 'short', day: 'numeric' })}
                </div>
              </>
            ) : (
              <>
                <div style={valueStyle}>No payments yet</div>
                <div style={subStyle}>Your first payment will show here</div>
              </>
            )}
          </SummaryCard>

          <SummaryCard
            label="Family cover"
            action={(
              <button type="button" onClick={() => navigate(ROUTES.PROFILE, { state: { tab: 'beneficiaries' } })} style={linkBtn}>
                Manage
              </button>
            )}
          >
            <div style={valueStyle}>{familyLabel}</div>
            <div style={subStyle}>
              {beneficiariesActive && activeBeneficiaries.length > 0
                ? 'Can use this allocation at verified providers'
                : 'Enable beneficiaries in Profile'}
            </div>
          </SummaryCard>

          <SummaryCard label="Allocation">
            <div style={valueStyle}>{partnerName}</div>
            <div style={subStyle}>
              {[accountRef && `Ref ${accountRef}`, country?.currencyCode].filter(Boolean).join(' · ') || 'Issued through GG\'APP'}
            </div>
          </SummaryCard>
        </div>

        {repaymentPlan && scheduleOpen && <RepaymentSchedule plan={repaymentPlan} currency={currency} />}

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>
              Recent payments to providers
            </div>
            <button type="button" onClick={() => navigate(ROUTES.TRANSACTIONS)} style={linkBtn}>
              View all →
            </button>
          </div>
          <div style={{ fontSize: 13, color: C.textSub, marginBottom: 8 }}>
            Paid from your allocation after you approved the invoice
          </div>

          {sortedTransactions.length === 0 ? (
            <div style={{ padding: '20px 0', fontSize: 14, color: C.textSub, lineHeight: 1.55 }}>
              No payments yet. Find a verified provider, then approve their invoice with your PIN.
            </div>
          ) : isMobile ? (
            <div>
              {recentPageItems.map((tx, i) => {
                const failed = tx.status === 'failed'
                const pending = tx.status === 'pending'
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => navigate(tx.invoiceId ? route.patientInvoice(tx.invoiceId) : ROUTES.TRANSACTIONS)}
                    style={{
                      all: 'unset',
                      boxSizing: 'border-box',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 4px',
                      borderTop: i === 0 ? `1px solid ${C.border}` : undefined,
                      borderBottom: `1px solid ${C.border}`,
                      cursor: 'pointer',
                      fontFamily: font.family,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.service}
                      </div>
                      <div style={{ fontSize: 13, color: C.textSub, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.provider} · {formatDate(tx.date, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: failed ? C.error : C.text }}>
                        {formatAmount(tx.amount, currency)}
                      </div>
                      {(failed || pending) && (
                        <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3, color: failed ? C.error : '#B45309' }}>
                          {failed ? 'Failed' : 'Processing'}
                        </div>
                      )}
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0, color: C.textLight }}>
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )
              })}
              {showRecentPager && (
                <SimplePager page={recentPageInRange} total={sortedTransactions.length} pageSize={PAGE_SIZE} onPageChange={setRecentPage} padding="14px 4px" />
              )}
            </div>
          ) : (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: radius.md, overflow: 'hidden' }}>
              <InvoiceTable
                label="Recent payments to providers"
                columns={RECENT_PAYMENT_COLUMNS(currency)}
                rows={recentPaymentRows}
                getKey={row => row.tx.id}
                onRowClick={({ tx }) => navigate(tx.invoiceId ? route.patientInvoice(tx.invoiceId) : ROUTES.TRANSACTIONS)}
              />
              {showRecentPager && (
                <SimplePager page={recentPageInRange} total={sortedTransactions.length} pageSize={PAGE_SIZE} onPageChange={setRecentPage} />
              )}
            </div>
          )}
        </section>

        <div style={{
          padding: '14px 16px',
          background: '#F3F8FD',
          borderRadius: radius.md,
          fontSize: 13,
          color: C.textSub,
          lineHeight: 1.55,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: 2, color: CYAN_DEEP }}>
              <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 7.25v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="5" r="0.85" fill="currentColor" />
            </svg>
            <div style={{ flex: 1 }}>
              Your credit can only be spent at verified GG'APP providers. It can't be withdrawn or sent to a bank account.{' '}
              <button type="button" onClick={() => setHowOpen(o => !o)} aria-expanded={howOpen} style={linkBtn}>
                {howOpen ? 'Hide' : 'How it works'}
              </button>
              {howOpen && (
                <ol style={{ margin: '10px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li>A verified provider sends you an invoice after your visit.</li>
                  <li>You check it and approve the payment with your PIN.</li>
                  <li>{partnerName} pays the provider directly from your credit.</li>
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
