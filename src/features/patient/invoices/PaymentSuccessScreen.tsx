import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { formatCurrency } from '@/utils/format'
import { MOCK_INVOICE, MOCK_USER } from '@/mock/patient.mock'

export function PaymentSuccessScreen() {
  const navigate = useNavigate()
  const inv = MOCK_INVOICE
  const [txnId] = useState(() => 'TXN-2026-' + String(Math.floor(1000 + Math.random() * 9000)))

  return (
    <AppLayout title="Payment Complete" subtitle="Authorization successful" back notifCount={0}>
      <div style={{ maxWidth: 520, margin: '0 auto', fontFamily: font.family }}>
        <GGCard padding="48px 40px" style={{ textAlign: 'center' }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: C.successBg, margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `4px solid ${C.success}` }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none"><path d="M8 22l9 9 19-17" stroke={C.success} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>

          <div style={{ fontSize: '26px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: '8px' }}>Payment Authorized!</div>
          <div style={{ fontSize: '40px', fontWeight: 800, color: C.success, letterSpacing: '-0.04em', marginBottom: '4px' }}>{formatCurrency(inv.amount)}</div>
          <div style={{ fontSize: '14px', color: C.textSub, marginBottom: '32px' }}>Successfully disbursed to {inv.provider.name}</div>

          <div style={{ background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, padding: '20px', marginBottom: '28px', textAlign: 'left' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>Payment Receipt</div>
            {[
              { label: 'Transaction ID',    val: txnId },
              { label: 'Invoice',           val: inv.id },
              { label: 'Service Provider',  val: inv.provider.name },
              { label: 'Amount',            val: formatCurrency(inv.amount) },
              { label: 'Payment Method',    val: "GG'APP Credit Wallet" },
              { label: 'Timestamp',         val: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) },
              { label: 'Remaining Credit',  val: formatCurrency(MOCK_USER.creditAvailable - inv.amount) },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: '12px', color: C.textSub, fontWeight: 500 }}>{item.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{item.val}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: '12px 14px', background: `rgba(13,30,66,0.04)`, borderRadius: radius.sm, marginBottom: '24px', fontSize: '12px', color: C.textSub, lineHeight: 1.6, textAlign: 'left' }}>
            <strong style={{ color: C.text }}>Security:</strong> This authorization was transmitted via HMAC-SHA256 over TLS 1.3. Your PIN was never transmitted — only a server-side hash comparison was performed.
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <GGButton variant="secondary" size="md" onClick={() => navigate('/app/transactions')} style={{ flex: 1 }}>View History</GGButton>
            <GGButton variant="primary" size="md" onClick={() => navigate('/app/dashboard')} style={{ flex: 1 }}>Dashboard</GGButton>
          </div>
        </GGCard>
      </div>
    </AppLayout>
  )
}
