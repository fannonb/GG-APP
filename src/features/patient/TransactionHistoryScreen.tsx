import { useMemo, useState } from 'react'
import { isMockApi } from '@/api/config'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { usePatientTransactions } from '@/hooks/api'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate } from '@/utils/format'
import { getCountryByCode } from '@/config/countries'
import { useAuthStore } from '@/store/auth.store'
import { useUserStore } from '@/store/user.store'

const TABLE_COLUMNS = [
  { header: 'Reference', width: '14%' },
  { header: 'Provider', width: '24%' },
  { header: 'Service', width: '30%' },
  { header: 'Date', width: '18%' },
  { header: 'Amount', width: '14%', align: 'right' as const },
]

export function TransactionHistoryScreen() {
  const { isMobile } = useResponsive()
  const { userMode } = useAuthStore()
  const user = useUserStore(s => s.user)
  const { data: liveTransactions = [] } = usePatientTransactions()
  const [filter, setFilter] = useState('all')
  const isNew = isMockApi && userMode === 'new'
  const currency = getCountryByCode(user.countryCode)?.currencySymbol ?? 'Z$'

  const transactions = isNew ? [] : liveTransactions
  const spendableTransactions = transactions.filter(txn => txn.status !== 'failed')
  const total = spendableTransactions.reduce((s, t) => s + t.amount, 0)
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const filteredTransactions = useMemo(() => {
    if (filter === 'this-month') {
      return transactions.filter(txn => {
        const date = new Date(txn.date)
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
      })
    }

    if (filter === 'last-month') {
      return transactions.filter(txn => {
        const date = new Date(txn.date)
        return date.getFullYear() === lastMonth.getFullYear() && date.getMonth() === lastMonth.getMonth()
      })
    }

    return transactions
  }, [filter, lastMonth, now, transactions])
  const thisMonthTotal = spendableTransactions
    .filter(txn => {
      const date = new Date(txn.date)
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
    })
    .reduce((sum, txn) => sum + txn.amount, 0)

  return (
    <AppLayout title="Transaction History" subtitle="All balance-funded healthcare payments" notifCount={1}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Total Spent', val: formatCurrency(total, currency), color: C.text },
            { label: 'This Month', val: formatCurrency(thisMonthTotal, currency), color: C.blue500 },
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
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontFamily: font.family }}>
              <colgroup>
                {TABLE_COLUMNS.map(col => (
                  <col key={col.header} style={{ width: col.width }} />
                ))}
              </colgroup>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  {TABLE_COLUMNS.map(col => (
                    <th key={col.header} style={{
                      padding: '10px 16px',
                      textAlign: col.align ?? 'left',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: C.textSub,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      whiteSpace: 'nowrap',
                    }}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_COLUMNS.length} style={{ padding: '48px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: C.textSub, marginBottom: '6px' }}>No transactions yet</div>
                      <div style={{ fontSize: '12px', color: C.textLight }}>
                        {transactions.length === 0
                          ? 'Payments made through GG\'APP will appear here.'
                          : 'No transactions found for this filter.'}
                      </div>
                    </td>
                  </tr>
                ) : filteredTransactions.map(txn => (
                  <tr key={txn.id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.1s', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: C.blue500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{txn.id}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: C.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txn.provider}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: C.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txn.service}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: C.textSub, whiteSpace: 'nowrap' }}>{formatDate(txn.date)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 800, color: C.text, whiteSpace: 'nowrap', textAlign: 'right' }}>
                      -{formatCurrency(txn.amount, currency)}
                    </td>
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
