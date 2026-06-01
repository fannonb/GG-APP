import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGBadge } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate } from '@/utils/format'
import { MOCK_USER, MOCK_TRANSACTIONS, MOCK_BENEFICIARIES } from '@/mock/patient.mock'
import { getCountryByCode } from '@/config/countries'
import { FlagImg } from '@/components/FlagImg'
import { useAuthStore } from '@/store/auth.store'
import { ROUTES } from '@/router/routes'
import { CreditEmptyState } from './components/CreditEmptyState'
import { PARTNER_LOGOS } from './partner-logos'

export function CreditWalletScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const { userMode } = useAuthStore()
  const isNew = userMode === 'new'
  const u = MOCK_USER
  const country = getCountryByCode(u.countryCode)
  const currency = country?.currencySymbol ?? 'Z$'
  const outstanding = 450.00
  const transactions = isNew ? [] : MOCK_TRANSACTIONS
  const beneficiaries = isNew ? [] : MOCK_BENEFICIARIES
  const thisMonthUsage = transactions
    .filter(t => new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((s, t) => s + t.amount, 0)
  const limitUsedPct = u.creditLimit > 0
    ? Math.round(((u.creditLimit - u.creditAvailable) / u.creditLimit) * 100)
    : 0

  if (isNew) return (
    <AppLayout title="Wallet" subtitle="Healthcare credit" notifCount={0}>
      <CreditEmptyState />
    </AppLayout>
  )

  return (
    <AppLayout title="Balance" subtitle="Manage your healthcare balance" notifCount={1}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Bespoke, High-End SaaS Healthcare Credit Hub */}
        <div style={{
          background: C.surface,
          borderRadius: radius.lg,
          boxShadow: '0 4px 20px rgba(9, 28, 68, 0.04)',
          border: `1px solid ${C.border}`,
          overflow: 'hidden',
        }}>
          
          {/* Top Hero Grid: Balance & Progress Details */}
          <div style={{
            padding: isMobile ? '20px' : '32px',
            background: `linear-gradient(180deg, rgba(56, 182, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%)`,
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 340px',
            gap: '32px',
            alignItems: 'center',
          }}>
            
            {/* Left Block: Modern balance display with bespoke structural tags */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(56, 182, 255, 0.08)',
                  border: `1px solid rgba(56, 182, 255, 0.25)`,
                  padding: '4px 12px',
                  borderRadius: radius.full,
                  fontSize: '10px',
                  fontWeight: 800,
                  color: C.navy800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: C.blue500,
                    boxShadow: `0 0 8px ${C.blue500}`,
                    display: 'inline-block'
                  }} />
                  ACTIVE BALANCE
                </span>

                {country && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: radius.full,
                    background: 'rgba(9, 28, 68, 0.03)',
                    border: `1px solid ${C.border}`,
                  }}>
                    <FlagImg code={country.code} size={16} />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: C.navy800, fontFamily: font.family }}>{country.currencyCode}</span>
                    <span style={{ fontSize: '10px', color: C.textLight, fontFamily: font.family }}>·</span>
                    <span style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family }}>{country.currencyName}</span>
                  </span>
                )}

                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: C.textLight,
                  padding: '4px 10px',
                  borderRadius: radius.sm,
                  background: 'rgba(9, 28, 68, 0.03)',
                  border: `1px solid ${C.border}`,
                  fontFamily: 'monospace',
                }}>
                  ID: GGA-847291
                </span>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: C.textLight, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Available Balance</div>
                <div style={{ fontSize: isMobile ? '38px' : '44px', fontWeight: 900, color: C.navy800, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '20px' }}>
                  {formatCurrency(u.creditAvailable, currency)}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '16px',
                  padding: '16px',
                  background: 'rgba(9, 28, 68, 0.03)',
                  border: `1px solid ${C.border}`,
                  borderRadius: radius.sm,
                }}>
                  <div>
                    <div style={{ fontSize: '10px', color: C.textLight, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Approved Limit</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: C.navy800, letterSpacing: '-0.03em' }}>
                      {formatCurrency(u.creditLimit, currency)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: C.textLight, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Limit Used</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: C.blue500, letterSpacing: '-0.03em' }}>
                      {limitUsedPct}%
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <div style={{ height: 6, background: C.border, borderRadius: radius.full, overflow: 'hidden' }}>
                    <div style={{
                      width: `${limitUsedPct}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${C.blue500} 0%, ${C.blue400} 100%)`,
                      borderRadius: radius.full,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: C.textLight }}>
                    <span>{formatCurrency(u.creditAvailable, currency)} available</span>
                    <span>{formatCurrency(u.creditLimit, currency)} approved</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Block: Financing Partner Info only */}
            <div style={{
              background: '#fff',
              border: `1px solid ${C.border}`,
              borderRadius: radius.lg,
              padding: '24px 20px',
              boxShadow: '0 8px 24px rgba(9, 28, 68, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              justifyContent: 'center',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                background: 'rgba(46, 49, 145, 0.04)',
                border: '1px solid rgba(46, 49, 145, 0.12)',
                borderRadius: radius.sm,
              }}>
                <div style={{
                  width: 96,
                  height: 48,
                  borderRadius: radius.sm,
                  background: '#fff',
                  border: `1px solid ${C.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  padding: '6px 10px',
                  overflow: 'hidden',
                }}>
                  <img
                    src={PARTNER_LOGOS.moneymart}
                    alt="Moneymart Finance"
                    style={{ maxHeight: 34, maxWidth: 76, width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '8px', fontWeight: 800, color: '#2e3191', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Financing Partner</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: C.navy800, letterSpacing: '-0.02em' }}>
                    Moneymart Finance
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '10px', color: C.textLight, lineHeight: 1.4 }}>
                Account compiled securely in collaboration with <strong>Moneymart Finance</strong>.
              </div>
            </div>

          </div>

          {/* Micro Fine-Line Divider */}
          <div style={{ height: '1px', background: C.border, margin: '0 24px' }} />

          {/* Bottom Row: Quick Stats & Actions */}
          <div style={{
            padding: '20px 24px',
            background: C.surface,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'stretch' : 'center',
            gap: '20px',
            flexWrap: 'wrap'
          }}>
            
            {/* Split Metrics Block */}
            <div style={{ display: 'flex', gap: isMobile ? '20px' : '40px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: C.textLight, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Outstanding Repayment</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: C.navy800, marginTop: '2px' }}>
                  {formatCurrency(outstanding, currency)}
                </div>
              </div>

              <div style={{ width: '1px', background: C.border, alignSelf: 'stretch' }} />

              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: C.textLight, letterSpacing: '0.06em', textTransform: 'uppercase' }}>This Month's Usage</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: C.blue500, marginTop: '2px' }}>
                  {formatCurrency(thisMonthUsage, currency)}
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
              <GGButton variant="outline" size="sm" onClick={() => navigate(ROUTES.CREDIT_INCREASE)} style={{ flex: isMobile ? 1 : 'none', fontSize: '12px', fontWeight: 700, borderColor: C.borderDark, color: C.textSub }}>
                Request Increase
              </GGButton>
              <GGButton variant="primary" size="sm" onClick={() => navigate('/app/services')} style={{ flex: isMobile ? 1 : 'none', fontSize: '12px', fontWeight: 700 }}>
                Use Balance →
              </GGButton>
            </div>

          </div>

        </div>

        {/* 2:1 split — Invoices on left + Guidelines and Beneficiaries on right */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '20px', alignItems: 'start' }}>

          {/* Transaction History Column */}
          <GGCard padding="24px" style={{ boxShadow: '0 4px 20px rgba(9, 28, 68, 0.02)', border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Transaction History</div>
                <div style={{ fontSize: '12px', color: C.textLight, marginTop: '2px', fontFamily: font.family }}>All medical payments made through GG'APP</div>
              </div>
              <span onClick={() => navigate('/app/transactions')} style={{ fontSize: '13px', color: C.blue500, fontWeight: 600, cursor: 'pointer', fontFamily: font.family }}>View all →</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {transactions.map((tx, i) => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: i < transactions.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ width: 42, height: 44, borderRadius: '12px', background: C.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3.5 9l4 4 7-7" stroke={C.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.provider}</div>
                    <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>{tx.service} · {formatDate(tx.date, { month: 'short', day: 'numeric' })}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>-{formatCurrency(tx.amount)}</div>
                    <div style={{ marginTop: '4px' }}><GGBadge type="success">Paid</GGBadge></div>
                  </div>
                </div>
              ))}
            </div>
          </GGCard>

          {/* Account Guidelines & Management Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Authorized Beneficiaries */}
            <GGCard padding="20px" style={{ boxShadow: '0 4px 20px rgba(9, 28, 68, 0.02)', border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Authorized Beneficiaries</div>
                  <div style={{ fontSize: '11px', color: C.textLight, marginTop: '2px', fontFamily: font.family }}>Registered beneficiaries on this balance</div>
                </div>
                <span style={{ fontSize: '11px', color: C.blue500, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>+ Add</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {beneficiaries.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.navy800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', fontFamily: font.family }}>
                        {b.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: font.family }}>{b.name}</div>
                      <div style={{ fontSize: '10px', color: C.textSub, marginTop: '1px', fontFamily: font.family }}>{b.relation} · Age {b.age}</div>
                    </div>
                    <GGBadge type="success">Active</GGBadge>
                  </div>
                ))}
              </div>
            </GGCard>


            {/* Usage Notice */}
            <div style={{ padding: '14px 16px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, display: 'flex', gap: '10px', alignItems: 'flex-start', boxShadow: '0 4px 20px rgba(9, 28, 68, 0.02)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="8" cy="8" r="6.5" stroke={C.blue500} strokeWidth="1.3"/><line x1="8" y1="5" x2="8" y2="9" stroke={C.blue500} strokeWidth="1.6" strokeLinecap="round"/><circle cx="8" cy="11.5" r="0.9" fill={C.blue500}/></svg>
              <div style={{ fontSize: '12px', color: C.text, lineHeight: 1.6, fontFamily: font.family }}>
                Funds can only be used with GG'APP-approved providers through the invoice flow. Repayments are handled directly in partnership with <strong>Moneymart Finance</strong>.
              </div>
            </div>

          </div>
        </div>

      </div>
    </AppLayout>
  )
}
