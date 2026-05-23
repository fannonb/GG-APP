import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGBadge, ProgressBar } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate } from '@/utils/format'
import { MOCK_USER, MOCK_TRANSACTIONS } from '@/mock/patient.mock'

export function CreditWalletScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const u = MOCK_USER
  const utilPct = Math.round((u.creditUsed / u.creditLimit) * 100)
  const outstanding = 450.00
  const thisMonthUsage = MOCK_TRANSACTIONS
    .filter(t => new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((s, t) => s + t.amount, 0)

  return (
    <AppLayout title="Credit Wallet" subtitle="Manage your healthcare credit" notifCount={1}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Hero card — 1 ring */}
        <div style={{ background: `linear-gradient(135deg, ${C.navy900} 0%, ${C.navy800} 45%, ${C.navy600} 100%)`, borderRadius: radius.xl, padding: '32px', boxShadow: '0 16px 48px rgba(13,30,66,0.3)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -60, top: -60, width: 280, height: 280, borderRadius: '50%', border: '1px solid rgba(74,173,223,0.09)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>Available Credit</div>
                <div style={{ fontSize: '44px', fontWeight: 800, color: C.blue500, letterSpacing: '-0.04em', lineHeight: 1 }}>{formatCurrency(u.creditAvailable)}</div>
              </div>
              <GGBadge type="success">Active</GGBadge>
            </div>
            <ProgressBar value={u.creditUsed} max={u.creditLimit} color={`linear-gradient(90deg, ${C.blue500}, ${C.blue400})`} height={6} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', marginBottom: '20px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Used {formatCurrency(u.creditUsed)}</span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Limit {formatCurrency(u.creditLimit)}</span>
            </div>
            {/* Footer row inside hero */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '9px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L2 4.5v4c0 3.1 2.6 5.9 6 6.5 3.4-.6 6-3.4 6-6.5v-4L8 1.5z" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" fill="none"/><path d="M5.5 8l2 2 3-3" stroke={C.blue500} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: font.family }}>Financed by</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.75)', fontFamily: font.family }}>CapiMed Financial Services</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <GGButton variant="primary" size="sm" onClick={() => navigate('/app/services')}>Use Credit →</GGButton>
                <GGButton variant="outline" size="sm" onClick={() => navigate('/app/invoices')} style={{ color: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.18)', background: 'transparent' }}>Invoices</GGButton>
              </div>
            </div>
          </div>
        </div>

        {/* 3 stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: '14px' }}>
          {[
            { label: 'Outstanding Balance', val: formatCurrency(outstanding),   color: C.warning, bg: C.warningBg },
            { label: "This Month's Usage",  val: formatCurrency(thisMonthUsage), color: C.blue500, bg: C.blue100  },
            { label: 'Account Reference',   val: 'GGA-847291',                   color: C.success, bg: C.successBg },
          ].map(tile => (
            <div key={tile.label} style={{ padding: '18px 20px', background: tile.bg, borderRadius: radius.lg, border: `1px solid ${tile.color}22` }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>{tile.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: tile.color, letterSpacing: '-0.03em' }}>{tile.val}</div>
            </div>
          ))}
        </div>

        {/* 2:1 split — invoices list + account management */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '20px', alignItems: 'start' }}>

          {/* Invoices list */}
          <GGCard padding="24px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Transaction History</div>
              <span onClick={() => navigate('/app/transactions')} style={{ fontSize: '13px', color: C.blue500, fontWeight: 600, cursor: 'pointer', fontFamily: font.family }}>View all →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {MOCK_TRANSACTIONS.map((tx, i) => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: i < MOCK_TRANSACTIONS.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '12px', background: C.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

          {/* Account management */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* CapiMed compact card */}
            <div style={{ background: `linear-gradient(135deg, ${C.navy800}, ${C.navy700})`, borderRadius: radius.lg, padding: '20px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>Finance Partner</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>CapiMed Financial Services</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '14px' }}>Your credit account is managed by CapiMed. All repayments are handled directly.</div>
              <GGBadge type="success">Account Active</GGBadge>
            </div>

            {/* Request increase */}
            <GGCard padding="20px">
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>Credit Limit</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: '4px' }}>{formatCurrency(u.creditLimit)}</div>
              <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '14px' }}>{utilPct}% utilised</div>
              <GGButton variant="secondary" size="sm" fullWidth onClick={() => navigate('/app/credit/apply')}>Request Increase</GGButton>
            </GGCard>

            {/* Notice */}
            <div style={{ padding: '14px 16px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="8" cy="8" r="6.5" stroke={C.blue500} strokeWidth="1.3"/><line x1="8" y1="5" x2="8" y2="9" stroke={C.blue500} strokeWidth="1.6" strokeLinecap="round"/><circle cx="8" cy="11.5" r="0.9" fill={C.blue500}/></svg>
              <div style={{ fontSize: '12px', color: C.text, lineHeight: 1.6 }}>Funds can only be used with GG'APP-approved providers through the invoice flow.</div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
