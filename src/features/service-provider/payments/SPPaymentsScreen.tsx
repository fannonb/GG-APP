import { GGCard, GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate } from '@/utils/format'
import { MOCK_SP, MOCK_SP_PAYMENTS } from '@/mock/sp.mock'

function SPStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    paid:    { bg: C.successBg, color: '#0D6B47', label: 'Paid' },
    pending: { bg: C.warningBg, color: '#8A4D00', label: 'Pending' },
  }
  const s = map[status] ?? map.pending
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: radius.full, background: s.bg, fontSize: '11px', fontWeight: 700, color: s.color, textTransform: 'capitalize' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

export function SPPaymentsScreen() {
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet

  return (
    <SPLayout title="Payments" subtitle="Earnings and disbursement history">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: '16px' }}>
          {[
            { label: 'Total Earned (All Time)',   val: formatCurrency(MOCK_SP.totalEarnings),   color: C.success },
            { label: 'This Month',                val: formatCurrency(MOCK_SP.monthlyEarnings), color: C.blue500 },
            { label: 'Pending Authorization',     val: formatCurrency(MOCK_SP_PAYMENTS.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)), color: C.warning },
          ].map(s => (
            <GGCard key={s.label} padding="20px" style={{ background: '#fff', borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{s.label}</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: s.color, letterSpacing: '-0.04em' }}>{s.val}</div>
            </GGCard>
          ))}
        </div>

        {/* Payments table */}
        <GGCard padding="0" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, fontSize: '15px', fontWeight: 700, color: C.text }}>All Payments</div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '520px', borderCollapse: 'collapse', fontFamily: font.family }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  {['Payment ID', 'Patient', 'Date', 'Amount', 'Reference', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_SP_PAYMENTS.map(p => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}`, background: p.status === 'pending' ? C.warningBg : 'transparent' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: C.blue500, whiteSpace: 'nowrap' }}>{p.id}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: C.text }}>{p.patient}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: C.textSub, whiteSpace: 'nowrap' }}>{formatDate(p.date)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 800, color: C.text, whiteSpace: 'nowrap' }}>{formatCurrency(p.amount)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: C.textSub }}>{p.ref}</td>
                    <td style={{ padding: '12px 16px' }}><SPStatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GGCard>

        {/* Payment account info */}
        <GGCard padding="20px" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '12px' }}>Registered Payment Account</div>
          <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Method',        val: 'M-Pesa Paybill' },
              { label: 'Paybill Number', val: '123456' },
              { label: 'Account Name',  val: MOCK_SP.name },
              { label: 'Country',       val: MOCK_SP.country },
            ].map(item => (
              <div key={item.label} style={{ padding: '10px 14px', background: '#fff', borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '11px', color: C.textSub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px', fontFamily: font.family }}>{item.label}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family }}>{item.val}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px' }}>
            <GGButton variant="secondary" size="sm">Update Payment Details</GGButton>
          </div>
        </GGCard>
      </div>
    </SPLayout>
  )
}
