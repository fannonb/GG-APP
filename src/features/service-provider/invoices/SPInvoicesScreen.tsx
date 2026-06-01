import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate } from '@/utils/format'
import { MOCK_SP_INVOICES } from '@/mock/sp.mock'

type SPInvStatus = 'paid' | 'cancelled' | 'pending'

const STATUS: Record<SPInvStatus, { label: string; color: string; bg: string; border: string; text: string }> = {
  paid:      { label: 'Paid',      color: C.success, bg: C.successBg, border: 'rgba(34,201,138,0.2)',  text: '#0D6B47' },
  cancelled: { label: 'Cancelled', color: C.error,   bg: C.errorBg,   border: 'rgba(229,71,77,0.25)', text: C.error   },
  pending:   { label: 'Pending Auth', color: '#D97706', bg: '#FEF3C7', border: 'rgba(217,119,6,0.2)', text: '#B45309' },
}

const COL = '150px 1fr 1.4fr 96px 100px 170px 68px'

export function SPInvoicesScreen() {
  const navigate = useNavigate()
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet
  const [filter, setFilter] = useState('all')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const totalInvoiced  = MOCK_SP_INVOICES.reduce((s, i) => s + i.amount, 0)
  const totalPaid      = MOCK_SP_INVOICES.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalPending   = MOCK_SP_INVOICES.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
  const totalCancelled = MOCK_SP_INVOICES.filter(i => i.status === 'cancelled').reduce((s, i) => s + i.amount, 0)

  const FILTERS = [
    { id: 'all',       label: 'All',       count: MOCK_SP_INVOICES.length },
    { id: 'pending',   label: 'Pending',   count: MOCK_SP_INVOICES.filter(i => i.status === 'pending').length },
    { id: 'paid',      label: 'Paid',      count: MOCK_SP_INVOICES.filter(i => i.status === 'paid').length },
    { id: 'cancelled', label: 'Cancelled', count: MOCK_SP_INVOICES.filter(i => i.status === 'cancelled').length },
  ]

  const filtered = MOCK_SP_INVOICES.filter(inv => {
    if (filter === 'paid')      return inv.status === 'paid'
    if (filter === 'cancelled') return inv.status === 'cancelled'
    if (filter === 'pending')   return inv.status === 'pending'
    return true
  })

  const stats = [
    { label: 'Total Billed',  value: formatCurrency(totalInvoiced),  sub: `${MOCK_SP_INVOICES.length} invoices`, color: C.text    },
    { label: 'Collected',     value: formatCurrency(totalPaid),      sub: `${MOCK_SP_INVOICES.filter(i => i.status === 'paid').length} paid`, color: C.success },
    { label: 'Pending Auth',  value: formatCurrency(totalPending),   sub: `${MOCK_SP_INVOICES.filter(i => i.status === 'pending').length} pending`, color: '#B45309' },
    { label: 'Cancelled',     value: formatCurrency(totalCancelled), sub: `${MOCK_SP_INVOICES.filter(i => i.status === 'cancelled').length} cancelled`, color: C.error   },
  ]

  const pendingInvoices = MOCK_SP_INVOICES.filter(i => i.status === 'pending')

  return (
    <SPLayout title="Invoices" subtitle="Billing history & payment status">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '12px' }}>
          {stats.map(s => (
            <GGCard key={s.label} padding={isMobile ? '14px' : '18px'} style={{ background: '#fff' }}>
              <div style={{ fontSize: isMobile ? '19px' : '23px', fontWeight: 800, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: s.color, marginTop: '4px', opacity: 0.85 }}>{s.label}</div>
              <div style={{ fontSize: '11px', color: C.textSub, marginTop: '2px' }}>{s.sub}</div>
            </GGCard>
          ))}
        </div>

        {/* Pending Alert banner */}
        {pendingInvoices.length > 0 && (
          <div style={{
            padding: '16px 20px',
            background: `linear-gradient(90deg, ${C.warningBg}, #FFF8E0)`,
            borderRadius: radius.sm,
            border: `1px solid rgba(245,166,35,0.25)`,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3l6 10H2z" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
                  <line x1="8" y1="7.5" x2="8" y2="10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
                  <circle cx="8" cy="11.5" r="0.9" fill="#fff"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#8A4D00', fontFamily: font.family }}>
                  {pendingInvoices.length} {pendingInvoices.length === 1 ? 'invoice is' : 'invoices are'} awaiting patient authorization
                </div>
                <div style={{ fontSize: '12px', color: '#A06000', marginTop: '2.5px', fontFamily: font.family }}>
                  These invoices are awaiting authorization and payment from patients before funds are disbursed.
                </div>
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: '6px'
            }}>
              {pendingInvoices.map((inv, idx) => (
                <div key={inv.id} 
                     onClick={() => navigate('/sp/invoices/' + inv.id, { state: { invoice: inv } })}
                     style={{
                       background: '#ffffff',
                       border: '1px solid rgba(245,166,35,0.25)',
                       borderRadius: '10px',
                       padding: '12px 18px',
                       display: 'flex',
                       justifyContent: 'space-between',
                       alignItems: 'center',
                       cursor: 'pointer',
                       transition: 'all 0.15s ease',
                       boxShadow: '0 2px 6px rgba(217,119,6,0.03)'
                     }}
                     onMouseEnter={e => {
                       e.currentTarget.style.borderColor = '#D97706';
                       e.currentTarget.style.transform = 'translateX(4px)';
                       e.currentTarget.style.boxShadow = '0 4px 12px rgba(217,119,6,0.07)';
                     }}
                     onMouseLeave={e => {
                       e.currentTarget.style.borderColor = 'rgba(245,166,35,0.25)';
                       e.currentTarget.style.transform = 'none';
                       e.currentTarget.style.boxShadow = '0 2px 6px rgba(217,119,6,0.03)';
                     }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: '#B45309',
                      background: '#FEF3C7',
                      padding: '3px 8px',
                      borderRadius: radius.sm,
                      fontFamily: font.family,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Pending #{idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: C.navy800, fontFamily: font.family }}>{inv.id}</div>
                      <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px', fontFamily: font.family }}>{inv.patient}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: C.text, fontFamily: font.family }}>{formatCurrency(inv.amount)}</span>
                      <div style={{ fontSize: '11px', color: '#B45309', fontWeight: 600, marginTop: '1px', fontFamily: font.family }}>Awaiting Patient Auth</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#D97706" strokeWidth="2"><path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
              const st = STATUS[inv.status as SPInvStatus] ?? STATUS.cancelled
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
          <strong>Real-Time Payments:</strong> Patient pays in real-time immediately upon invoice submission.
          Funds are released to your account instantly. Cancelled invoices can be edited and resubmitted to the patient at any time.
        </div>
      </div>
    </SPLayout>
  )
}
