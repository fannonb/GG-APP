import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate } from '@/utils/format'
import { MOCK_SP_INVOICES } from '@/mock/sp.mock'

type SPInvStatus = 'paid' | 'pending_admin' | 'pending_patient' | 'disputed' | 'rejected'

const STATUS: Record<SPInvStatus, { label: string; color: string; bg: string; border: string; text: string }> = {
  paid:            { label: 'Paid',              color: C.success, bg: C.successBg, border: 'rgba(34,201,138,0.2)',  text: '#0D6B47' },
  pending_admin:   { label: 'Pending Review',    color: C.warning, bg: C.warningBg, border: 'rgba(245,166,35,0.2)', text: '#7C4A00' },
  pending_patient: { label: 'Awaiting Payment',  color: C.blue500, bg: C.blue100,   border: 'rgba(74,173,223,0.2)', text: '#1A5D8A' },
  disputed:        { label: 'Disputed',           color: C.error,   bg: C.errorBg,   border: 'rgba(229,71,77,0.25)', text: C.error   },
  rejected:        { label: 'Rejected',           color: '#C0392B', bg: '#FBE9E9',   border: 'rgba(192,57,43,0.2)',  text: '#8B1A1A' },
}

const COL = '150px 1fr 1.4fr 96px 100px 170px 68px'

export function SPInvoicesScreen() {
  const navigate = useNavigate()
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet
  const [filter, setFilter] = useState('all')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const totalInvoiced = MOCK_SP_INVOICES.reduce((s, i) => s + i.amount, 0)
  const totalPaid     = MOCK_SP_INVOICES.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalPending  = MOCK_SP_INVOICES.filter(i => ['pending_admin','pending_patient'].includes(i.status)).reduce((s, i) => s + i.amount, 0)
  const totalDisputed = MOCK_SP_INVOICES.filter(i => ['disputed','rejected'].includes(i.status)).reduce((s, i) => s + i.amount, 0)

  const FILTERS = [
    { id: 'all',      label: 'All',      count: MOCK_SP_INVOICES.length },
    { id: 'paid',     label: 'Paid',     count: MOCK_SP_INVOICES.filter(i => i.status === 'paid').length },
    { id: 'pending',  label: 'Pending',  count: MOCK_SP_INVOICES.filter(i => ['pending_admin','pending_patient'].includes(i.status)).length },
    { id: 'disputed', label: 'Disputed', count: MOCK_SP_INVOICES.filter(i => ['disputed','rejected'].includes(i.status)).length },
  ]

  const filtered = MOCK_SP_INVOICES.filter(inv => {
    if (filter === 'paid')     return inv.status === 'paid'
    if (filter === 'pending')  return ['pending_admin','pending_patient'].includes(inv.status)
    if (filter === 'disputed') return ['disputed','rejected'].includes(inv.status)
    return true
  })

  const stats = [
    { label: 'Total Billed',  value: formatCurrency(totalInvoiced), sub: `${MOCK_SP_INVOICES.length} invoices`, color: C.text    },
    { label: 'Collected',     value: formatCurrency(totalPaid),     sub: `${MOCK_SP_INVOICES.filter(i => i.status === 'paid').length} paid`, color: C.success },
    { label: 'Outstanding',   value: formatCurrency(totalPending),  sub: 'awaiting payment', color: C.warning },
    { label: 'Disputed',      value: formatCurrency(totalDisputed), sub: 'under review',     color: C.error   },
  ]

  return (
    <SPLayout title="Invoices" subtitle="Billing history & payment status">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '12px' }}>
          {stats.map(s => (
            <GGCard key={s.label} padding={isMobile ? '14px' : '18px'} style={{ background: '#fff', borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: isMobile ? '19px' : '23px', fontWeight: 800, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: s.color, marginTop: '4px', opacity: 0.85 }}>{s.label}</div>
              <div style={{ fontSize: '11px', color: C.textSub, marginTop: '2px' }}>{s.sub}</div>
            </GGCard>
          ))}
        </div>

        {/* CTA + Filter row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '3px', background: C.bg, borderRadius: '10px', padding: '3px', border: `1px solid ${C.border}` }}>
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: isMobile ? '5px 10px' : '6px 14px', borderRadius: '8px', border: 'none',
                background: filter === f.id ? '#fff' : 'transparent',
                color: filter === f.id ? C.text : C.textSub,
                fontSize: isMobile ? '12px' : '13px', fontWeight: filter === f.id ? 700 : 500,
                cursor: 'pointer', fontFamily: font.family,
                boxShadow: filter === f.id ? shadow.sm : 'none',
                transition: 'all 0.13s', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
              }}>
                {f.label}
                <span style={{ background: filter === f.id ? C.navy800 : C.border, color: filter === f.id ? '#fff' : C.textSub, borderRadius: '10px', padding: '1px 5px', fontSize: '10px', fontWeight: 700 }}>{f.count}</span>
              </button>
            ))}
          </div>
          <GGButton variant="success" size="md" onClick={() => navigate('/sp/invoices/upload')}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 6, flexShrink: 0 }}>
              <rect x="1.5" y="0.5" width="11" height="13" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4 4h6M4 7h6M4 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {isMobile ? 'Upload' : 'Upload Invoice'}
          </GGButton>
        </div>

        {/* Invoice list */}
        {filtered.length === 0 ? (
          <GGCard padding="48px" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📄</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px', fontFamily: font.family }}>No invoices found</div>
            <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>No invoices match this filter.</div>
          </GGCard>
        ) : (
          <GGCard padding="0" style={{ overflow: 'hidden' }}>
            {/* Desktop header */}
            {!isNarrow && (
              <div style={{ display: 'grid', gridTemplateColumns: COL, gap: '12px', padding: '11px 20px', background: C.bg, borderBottom: `1px solid ${C.border}`, alignItems: 'center' }}>
                {['Invoice #', 'Patient', 'Service(s)', 'Date', 'Amount', 'Status', ''].map(h => (
                  <div key={h} style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font.family }}>{h}</div>
                ))}
              </div>
            )}

            {/* Rows */}
            {filtered.map((inv, idx) => {
              const st = STATUS[inv.status as SPInvStatus] ?? STATUS.pending_admin
              const isHov = hoveredId === inv.id
              const isLast = idx === filtered.length - 1
              const goDetail = () => navigate('/sp/invoices/' + inv.id, { state: { invoice: inv } })

              return (
                <div key={inv.id}
                  onClick={goDetail}
                  onMouseEnter={() => setHoveredId(inv.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ padding: isNarrow ? '16px' : '13px 20px', borderBottom: isLast ? 'none' : `1px solid ${C.border}`, cursor: 'pointer', background: isHov ? C.bg : '#fff', transition: 'background 0.12s' }}>

                  {isNarrow ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: C.navy800, fontFamily: font.family }}>{inv.id}</div>
                          <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', fontFamily: font.family }}>{inv.patient}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: C.text, fontFamily: font.family }}>{formatCurrency(inv.amount)}</div>
                          <div style={{ fontSize: '11px', color: C.textSub, marginTop: '1px', fontFamily: font.family }}>{formatDate(inv.issueDate)}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '10px', fontFamily: font.family, lineHeight: 1.4 }}>
                        {inv.services.join(' · ')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: radius.full, background: st.bg, border: `1px solid ${st.border}`, fontSize: '11px', fontWeight: 700, color: st.text }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color, display: 'inline-block' }} />
                          {st.label}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: C.blue500 }}>
                          View
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 6.5h7M7 3.5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: COL, gap: '12px', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: C.navy800, fontFamily: font.family }}>{inv.id}</div>
                      <div>
                        <div style={{ fontSize: '13px', color: C.text, fontWeight: 500 }}>{inv.patient}</div>
                        {inv.status === 'paid' && inv.paidAt && (
                          <div style={{ fontSize: '11px', color: C.success, marginTop: '1px' }}>Paid {formatDate(inv.paidAt)}</div>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.5 }}>{inv.services.join(', ')}</div>
                      <div style={{ fontSize: '12px', color: C.textSub }}>{formatDate(inv.issueDate)}</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{formatCurrency(inv.amount)}</div>
                      <div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: radius.full, background: st.bg, border: `1px solid ${st.border}`, fontSize: '11px', fontWeight: 700, color: st.text }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color, display: 'inline-block' }} />
                          {st.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: C.blue500, padding: '5px 10px', borderRadius: radius.sm, background: isHov ? C.blue100 : 'transparent', transition: 'background 0.12s' }}>
                          View
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 6.5h7M7 3.5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </GGCard>
        )}

        {/* Invoice flow explainer */}
        <div style={{ padding: '12px 16px', background: C.blue100, borderRadius: radius.sm, border: '1px solid rgba(74,173,223,0.2)', fontSize: '12px', color: '#1A5D8A', lineHeight: 1.7, fontFamily: font.family }}>
          <strong>Invoice flow:</strong> You submit → Admin reviews → Patient authorises payment → Funds released to your account.
          Disputes are managed by the GG'APP mediation team. Contact <strong>support@ggapp.zw</strong> for assistance.
        </div>
      </div>
    </SPLayout>
  )
}
