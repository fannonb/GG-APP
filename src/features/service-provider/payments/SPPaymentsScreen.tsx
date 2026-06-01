import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGAvatar } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate } from '@/utils/format'
import { MOCK_SP, MOCK_SP_PAYMENTS } from '@/mock/sp.mock'
import { useSPPaymentsStore } from '@/store/sp-payments.store'

const COL = '140px 2fr 1.5fr 1.2fr 1.2fr'

export function SPPaymentsScreen() {
  const navigate = useNavigate()
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Payment account store integration
  const { accounts } = useSPPaymentsStore()
  const defaultAccount = accounts.find(a => a.isDefault) ?? accounts[0]

  // Pagination calculations
  const totalPayments = MOCK_SP_PAYMENTS.length
  const totalPages = Math.ceil(totalPayments / pageSize)
  const adjustedPage = Math.max(1, Math.min(currentPage, totalPages || 1))
  const startIndex = (adjustedPage - 1) * pageSize
  const paginatedPayments = MOCK_SP_PAYMENTS.slice(startIndex, startIndex + pageSize)

  return (
    <SPLayout title="Payments" subtitle="Earnings and disbursement history">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: '16px' }}>
          {[
            { label: 'Total Earned (All Time)',   val: formatCurrency(MOCK_SP.totalEarnings),   color: C.success },
            { label: 'This Month',                val: formatCurrency(MOCK_SP.monthlyEarnings), color: C.blue500 },
            { label: 'Pending Authorization',     val: formatCurrency(MOCK_SP_PAYMENTS.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)), color: C.warning },
          ].map((s, idx) => (
            <GGCard key={s.label} padding="20px" style={{ background: '#fff', gridColumn: isNarrow && idx === 2 ? 'span 2' : undefined }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{s.label}</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: s.color, letterSpacing: '-0.04em' }}>{s.val}</div>
            </GGCard>
          ))}
        </div>
        {/* Payments table card */}
        <GGCard padding="0" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, fontSize: '15px', fontWeight: 700, color: C.text }}>All Payments</div>
          
          {/* Desktop Header */}
          {!isNarrow && (
            <div style={{ display: 'grid', gridTemplateColumns: COL, gap: '12px', padding: '11px 20px', background: C.bg, borderBottom: `2px solid ${C.border}`, alignItems: 'center' }}>
              {['Payment ID', 'Patient', 'Date', 'Amount', 'Reference'].map(h => (
                <div key={h} style={{ 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  color: C.textSub, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.06em', 
                  fontFamily: font.family,
                  textAlign: 'left'
                }}>{h}</div>
              ))}
            </div>
          )}

          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {paginatedPayments.map((p, idx) => {
              const isHov = hoveredId === p.id
              const isLast = idx === paginatedPayments.length - 1

              return isNarrow ? (
                // Mobile stacked layout
                <div key={p.id} style={{ padding: '16px', borderBottom: isLast ? 'none' : `1px solid ${C.border}`, background: p.status === 'pending' ? C.warningBg : '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: C.navy800, fontFamily: font.family }}>{p.id}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <GGAvatar name={p.patient} size={24} />
                        <span style={{ fontSize: '13px', color: C.text, fontWeight: 500 }}>{p.patient}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: C.text, fontFamily: font.family }}>{formatCurrency(p.amount)}</div>
                      <div style={{ fontSize: '11px', color: C.textSub, marginTop: '2px', fontFamily: font.family }}>{formatDate(p.date)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.bg, padding: '8px 12px', borderRadius: radius.sm, fontSize: '12px' }}>
                    <span style={{ color: C.textSub, fontWeight: 600 }}>Reference</span>
                    <span style={{ color: C.text, fontWeight: 700, fontFamily: font.mono }}>{p.ref}</span>
                  </div>
                </div>
              ) : (
                // Desktop grid layout
                <div key={p.id}
                  onMouseEnter={() => setHoveredId(p.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: COL, 
                    gap: '12px', 
                    padding: '13px 20px', 
                    borderBottom: isLast ? 'none' : `1px solid ${C.border}`, 
                    alignItems: 'center', 
                    background: p.status === 'pending' ? C.warningBg : isHov ? C.bg : '#fff', 
                    transition: 'background 0.12s' 
                  }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: C.navy800, fontFamily: font.family }}>{p.id}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <GGAvatar name={p.patient} size={28} />
                    <span style={{ fontSize: '13px', color: C.text, fontWeight: 500, whiteSpace: 'nowrap' }}>{p.patient}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: C.textSub, whiteSpace: 'nowrap' }}>{formatDate(p.date)}</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: C.text, whiteSpace: 'nowrap', textAlign: 'left' }}>{formatCurrency(p.amount)}</div>
                  <div style={{ fontSize: '12px', color: C.textSub, whiteSpace: 'nowrap' }}>{p.ref}</div>
                </div>
              )
            })}
          </div>

          {/* Pagination Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', borderTop: `1px solid ${C.border}`, flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>
              Showing {totalPayments === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, totalPayments)} of {totalPayments} payments
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>Rows per page:</span>
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                  style={{ padding: '4px 8px', borderRadius: radius.xs, border: `1.5px solid ${C.border}`, background: '#fff', fontSize: '13px', color: C.text, fontFamily: font.family, outline: 'none', cursor: 'pointer' }}>
                  {[2, 5, 10, 20].map(sz => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button disabled={adjustedPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${C.border}`, background: adjustedPage === 1 ? C.bg : '#fff', color: adjustedPage === 1 ? C.textLight : C.text, borderRadius: radius.xs, cursor: adjustedPage === 1 ? 'not-allowed' : 'pointer', fontFamily: font.family }}>
                  ‹
                </button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pNum = i + 1
                  const isCurrent = pNum === adjustedPage
                  return (
                    <button key={pNum} onClick={() => setCurrentPage(pNum)}
                      style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: isCurrent ? `1.5px solid ${C.blue500}` : `1.5px solid ${C.border}`, background: isCurrent ? C.blue100 : '#fff', color: isCurrent ? C.blue500 : C.text, fontWeight: isCurrent ? 700 : 500, borderRadius: radius.xs, cursor: 'pointer', fontFamily: font.family }}>
                      {pNum}
                    </button>
                  )
                })}
                <button disabled={adjustedPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${C.border}`, background: adjustedPage === totalPages ? C.bg : '#fff', color: adjustedPage === totalPages ? C.textLight : C.text, borderRadius: radius.xs, cursor: adjustedPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: font.family }}>
                  ›
                </button>
              </div>
            </div>
          </div>
        </GGCard>

        {/* Payment account info */}
        <GGCard padding="20px" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '12px' }}>Registered Payment Account</div>
          {defaultAccount ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Method',        val: defaultAccount.method },
                { label: 'Account / Paybill Number', val: defaultAccount.number },
                { label: 'Account Name',  val: defaultAccount.name },
                { label: 'Country',       val: defaultAccount.country },
              ].map(item => (
                <div key={item.label} style={{ padding: '10px 14px', background: '#fff', borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '11px', color: C.textSub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px', fontFamily: font.family }}>{item.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family }}>{item.val}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '20px', background: '#fff', border: `1px dashed ${C.border}`, borderRadius: radius.sm, textAlign: 'center', fontSize: '13px', color: C.textSub }}>
              No default payment account configured. Please add one in settings.
            </div>
          )}
          <div style={{ marginTop: '12px' }}>
            <GGButton variant="secondary" size="sm" onClick={() => navigate('/sp/settings', { state: { tab: 'account' } })}>
              Update Payment Details
            </GGButton>
          </div>
        </GGCard>
      </div>
    </SPLayout>
  )
}
