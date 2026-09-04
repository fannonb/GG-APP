import { useNavigate } from 'react-router-dom'
import { isMockApi } from '@/api/config'
import { GGButton, GGBadge } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { usePatientInvoices, usePatientTransactions } from '@/hooks/api'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate } from '@/utils/format'
import { getCountryByCode } from '@/config/countries'
import { useAuthStore } from '@/store/auth.store'
import { ROUTES, route } from '@/router/routes'
import { CreditEmptyState } from './components/CreditEmptyState'
import { CreditLowBalancePrompt } from './components/CreditLowBalancePrompt'
import { getFinancePartnerSummary } from './credit.constants'
import { useUserStore } from '@/store/user.store'
import { isCreditRunningLow } from '@/utils/credit-threshold'

const RECENT_TX_LIMIT = 5

export function CreditWalletScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const { userMode } = useAuthStore()
  const u = useUserStore(s => s.user)
  const beneficiaries = useUserStore(s => s.beneficiaries)
  const { data: liveTransactions = [] } = usePatientTransactions()
  const { data: invoiceData } = usePatientInvoices()

  const isNew = isMockApi
    ? userMode === 'new'
    : u.creditStatus === 'not_applied' && u.creditLimit === 0
  const country = getCountryByCode(u.countryCode)
  const currency = country?.currencySymbol ?? 'Z$'
  const partner = getFinancePartnerSummary(u.financePartnerId ?? 'moneymart')
  const accountRef = u.creditAccountRef?.trim() || null

  const transactions = isNew ? [] : liveTransactions
  const spendableTransactions = transactions.filter(tx => tx.status !== 'failed')
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, RECENT_TX_LIMIT)

  const beneficiariesActive = Boolean(u.beneficiariesEnabled) || beneficiaries.length > 0
  const activeBeneficiaries = isNew || !beneficiariesActive ? [] : beneficiaries
  const thisMonthPayments = spendableTransactions.filter(t => {
    const d = new Date(t.date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const thisMonthUsage = thisMonthPayments.reduce((sum, t) => sum + t.amount, 0)

  const creditUsed = Math.max(0, u.creditLimit - u.creditAvailable)
  const limitUsedPct = u.creditLimit > 0
    ? Math.min(100, Math.round((creditUsed / u.creditLimit) * 100))
    : 0
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
    <AppLayout title="Healthcare credit" notifCount={0}>
      <CreditEmptyState />
    </AppLayout>
  )

  const metaParts = [
    country?.currencyCode,
    partner?.name,
    accountRef,
  ].filter(Boolean)

  const familyLabel = !beneficiariesActive
    ? 'Not enabled'
    : activeBeneficiaries.length === 0
      ? 'None added'
      : activeBeneficiaries.length === 1
        ? `${activeBeneficiaries[0].name} · ${activeBeneficiaries[0].relation}`
        : `${activeBeneficiaries[0].name} +${activeBeneficiaries.length - 1}`

  return (
    <AppLayout title="Healthcare credit" notifCount={pendingCount || 1}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: font.family }}>

        {showLowBalancePrompt && (
          <CreditLowBalancePrompt available={u.creditAvailable} countryCode={u.countryCode} />
        )}

        {pendingCount > 0 && firstPending && (
          <div style={{
            display: 'flex',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: '14px',
            flexWrap: 'wrap',
            padding: isMobile ? '16px 18px' : '16px 22px',
            background: C.navy800,
            borderRadius: radius.lg,
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                {pendingCount} invoice{pendingCount === 1 ? '' : 's'} waiting for Triple-PIN
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.72)', marginTop: '4px' }}>
                {firstPending.provider.name} · {formatCurrency(firstPending.amount, currency)}
              </div>
            </div>
            <GGButton
              variant="primary"
              size="md"
              onClick={() => navigate(route.patientInvoice(firstPending.id))}
            >
              Authorize now
            </GGButton>
          </div>
        )}

        <section style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: radius.lg,
          padding: isMobile ? '22px 20px' : '28px',
          boxShadow: shadow.sm,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'flex-end',
            gap: '20px',
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: C.textSub,
                marginBottom: '10px',
              }}>
                Available to spend on care
              </div>
              <div style={{
                fontSize: isMobile ? '36px' : '44px',
                fontWeight: 800,
                color: C.navy800,
                letterSpacing: '-0.04em',
                lineHeight: 1,
              }}>
                {formatCurrency(u.creditAvailable, currency)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
              <GGButton
                variant="secondary"
                size="md"
                onClick={() => navigate(ROUTES.CREDIT_INCREASE)}
                style={{ flex: isMobile ? 1 : undefined }}
              >
                Request increase
              </GGButton>
              <GGButton
                variant="primary"
                size="md"
                onClick={() => navigate(ROUTES.FIND_SERVICE)}
                style={{ flex: isMobile ? 1 : undefined }}
              >
                Find care
              </GGButton>
            </div>
          </div>

          <div style={{ marginTop: '22px', maxWidth: 560 }}>
            <div style={{ height: 6, background: C.bg, borderRadius: radius.full, overflow: 'hidden' }}>
              <div style={{
                width: `${limitUsedPct}%`,
                height: '100%',
                background: C.blue500,
                borderRadius: radius.full,
              }} />
            </div>
            <div style={{ marginTop: '10px', fontSize: '13px', color: C.textSub }}>
              {formatCurrency(creditUsed, currency)} of {formatCurrency(u.creditLimit, currency)} used
            </div>
          </div>

          {metaParts.length > 0 && (
            <div style={{ marginTop: '14px', fontSize: '13px', color: C.textLight }}>
              {metaParts.join('  ·  ')}
            </div>
          )}
        </section>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
          gap: isMobile ? '12px' : '16px',
        }}>
          <div style={{
            padding: '16px 18px',
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: radius.md,
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: C.textLight, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
              This month
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: C.navy800, letterSpacing: '-0.02em' }}>
              {formatCurrency(thisMonthUsage, currency)}
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, marginTop: '4px' }}>
              {thisMonthPayments.length} payment{thisMonthPayments.length === 1 ? '' : 's'}
            </div>
          </div>

          <div style={{
            padding: '16px 18px',
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: radius.md,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: C.textLight, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Family cover
              </div>
              <button
                type="button"
                onClick={() => navigate(ROUTES.PROFILE, { state: { tab: 'beneficiaries' } })}
                style={{
                  fontSize: '13px',
                  color: C.blue500,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontFamily: font.family,
                }}
              >
                Manage
              </button>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.navy800 }}>
              {familyLabel}
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, marginTop: '4px' }}>
              {beneficiariesActive && activeBeneficiaries.length > 0
                ? 'Can use this credit at verified providers'
                : 'Enable beneficiaries in Profile'}
            </div>
          </div>

          <div style={{
            padding: '16px 18px',
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: radius.md,
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: C.textLight, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '6px' }}>
              How it works
            </div>
            <div style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.55 }}>
              A verified provider invoices you. You authorize with Triple-PIN.
              {partner ? ` ${partner.name} then pays the provider.` : ' Your finance partner then pays the provider.'}
            </div>
          </div>
        </div>

        <section>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: '12px',
            marginBottom: '4px',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.navy800 }}>
              Recent authorizations
            </div>
            <button
              type="button"
              onClick={() => navigate(ROUTES.TRANSACTIONS)}
              style={{
                fontSize: '13px',
                color: C.blue500,
                fontWeight: 700,
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
                fontFamily: font.family,
              }}
            >
              View all
            </button>
          </div>
          <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '8px' }}>
            Payments released to verified providers
          </div>

          {recentTransactions.length === 0 ? (
            <div style={{ padding: '20px 0', fontSize: '14px', color: C.textSub, lineHeight: 1.55 }}>
              No payments yet. Find a verified provider, then authorize their invoice with your PIN.
            </div>
          ) : (
            <div>
              {recentTransactions.map((tx, i) => (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 0',
                    borderTop: i === 0 ? `1px solid ${C.border}` : undefined,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: C.navy800,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {tx.provider}
                    </div>
                    <div style={{ fontSize: '13px', color: C.textSub, marginTop: '3px' }}>
                      {tx.service} · {formatDate(tx.date, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: C.navy800, letterSpacing: '-0.02em' }}>
                      -{formatCurrency(tx.amount, currency)}
                    </div>
                    {tx.status === 'failed' && (
                      <div style={{ marginTop: '4px' }}><GGBadge type="error">Failed</GGBadge></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
