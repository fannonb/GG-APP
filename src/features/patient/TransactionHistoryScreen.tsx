import { useState } from 'react'
import { GGCard, GGBadge } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate } from '@/utils/format'
import { MOCK_TRANSACTIONS } from '@/mock/patient.mock'

export function TransactionHistoryScreen() {
  const { isMobile } = useResponsive()
  const [filter, setFilter] = useState('all')

  const total = MOCK_TRANSACTIONS.reduce((s, t) => s + t.amount, 0)

  return (
    <AppLayout title="Transaction History" subtitle="All credit-funded healthcare payments" notifCount={1}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: '16px' }}>
          {[
            { label: 'Total Spent',   val: formatCurrency(total),              color: C.text },
            { label: 'Transactions',  val: String(MOCK_TRANSACTIONS.length),   color: C.text },
            { label: 'This Month',    val: formatCurrency(total * 0.6),        color: C.blue500 },
          ].map(s => (
            <GGCard key={s.label} padding="18px 22px">
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{s.label}</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: s.color, letterSpacing: '-0.04em' }}>{s.val}</div>
            </GGCard>
          ))}
        </div>

        {/* Table */}
        <GGCard padding="0" noPad>
          <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '10px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>All Transactions</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['all', 'this-month', 'last-month'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 12px', borderRadius: radius.full, border: `1px solid ${C.border}`, background: filter === f ? C.blue100 : '#fff', color: filter === f ? C.blue500 : C.textSub, fontSize: '12px', fontWeight: filter === f ? 700 : 500, cursor: 'pointer', fontFamily: font.family }}>
                  {f === 'all' ? 'All Time' : f === 'this-month' ? 'This Month' : 'Last Month'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '560px', borderCollapse: 'collapse', fontFamily: font.family }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  {['Reference', 'Provider', 'Service', 'Date', 'Amount', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_TRANSACTIONS.map(txn => (
                  <tr key={txn.id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.1s', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: C.blue500, whiteSpace: 'nowrap' }}>{txn.id}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: C.text, fontWeight: 500 }}>{txn.provider}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: C.textSub }}>{txn.service}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: C.textSub, whiteSpace: 'nowrap' }}>{formatDate(txn.date)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 800, color: C.text, whiteSpace: 'nowrap' }}>-{formatCurrency(txn.amount)}</td>
                    <td style={{ padding: '12px 16px' }}><GGBadge type="success">Completed</GGBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GGCard>
      </div>
    </AppLayout>
  )
}
