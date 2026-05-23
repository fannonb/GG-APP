import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGAvatar } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate } from '@/utils/format'
import { MOCK_SP, MOCK_SP_APPOINTMENTS, MOCK_SP_PATIENTS, MOCK_SP_PAYMENTS } from '@/mock/sp.mock'

function SPStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    new:       { bg: C.warningBg, color: '#8A4D00', label: 'New' },
    confirmed: { bg: C.blue100,   color: '#1A5D8A', label: 'Confirmed' },
    completed: { bg: C.successBg, color: '#0D6B47', label: 'Completed' },
    cancelled: { bg: C.errorBg,   color: '#A83236', label: 'Cancelled' },
    paid:      { bg: C.successBg, color: '#0D6B47', label: 'Paid' },
    pending:   { bg: C.warningBg, color: '#8A4D00', label: 'Pending' },
  }
  const s = map[status] ?? map.pending
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: radius.full, background: s.bg, fontSize: '11px', fontWeight: 700, color: s.color, fontFamily: font.family, textTransform: 'capitalize' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

export function SPDashboardScreen() {
  const navigate = useNavigate()
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet
  const sp = MOCK_SP
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const pendingCount = 1

  const stats = [
    { label: 'Total Earnings',  val: formatCurrency(sp.totalEarnings),   sub: 'All time',            color: C.success },
    { label: 'This Month',      val: formatCurrency(sp.monthlyEarnings), sub: 'May 2026',             color: C.blue500 },
    { label: 'Pending Payment', val: formatCurrency(sp.pendingPayments), sub: '1 invoice awaiting',   color: C.warning },
    { label: 'Total Patients',  val: sp.totalPatients.toString(),        sub: 'Unique patients seen', color: C.text },
  ]

  const upcoming = MOCK_SP_APPOINTMENTS.filter(a => a.status === 'new' || a.status === 'confirmed').slice(0, 3)

  return (
    <SPLayout title="Dashboard" subtitle="Today at a glance" notifCount={2}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: font.family }}>

        {/* Greeting */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: isMobile ? '18px' : isTablet ? '20px' : '24px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>
              Good morning, {sp.name}{' '}
              <img src="https://flagcdn.com/w40/zw.png" srcSet="https://flagcdn.com/w80/zw.png 2x" alt="Zimbabwe" style={{ height: '20px', width: 'auto', marginLeft: '8px', verticalAlign: 'middle', borderRadius: '3px', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }} />
            </div>
            <div style={{ fontSize: '14px', color: C.textSub, marginTop: '4px' }}>{today}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <GGButton variant="success" size="sm" onClick={() => navigate('/sp/invoices/upload')}>Upload Invoice</GGButton>
            <GGButton variant="secondary" size="sm" onClick={() => navigate('/sp/appointments')}>View Appointments</GGButton>
          </div>
        </div>

        {/* Pending invoice banner */}
        {!bannerDismissed && pendingCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', background: '#FFFBEB', border: '1.5px solid #F59E0B', borderRadius: '12px', flexWrap: 'wrap' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEF3C7', border: '1.5px solid #F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L1.5 15h15L9 2z" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 7v4M9 13v.5" stroke="#D97706" strokeWidth="1.6" strokeLinecap="round"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
                {pendingCount} invoice{pendingCount > 1 ? 's' : ''} awaiting patient authorization
              </div>
              <div style={{ fontSize: '12px', color: '#B45309', marginTop: '2px', lineHeight: 1.5 }}>
                {formatCurrency(sp.pendingPayments)} is pending. Payment is released once the patient approves.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
              <button
                onClick={() => navigate('/sp/invoices')}
                style={{ padding: '8px 16px', borderRadius: '8px', background: '#D97706', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>
                Review Now →
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', border: '1.5px solid #F59E0B', color: '#D97706', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.family }}>
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '16px' }}>
          {stats.map(s => (
            <GGCard key={s.label} padding={isMobile ? '14px' : '20px'} style={{ background: '#fff' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{s.label}</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: '12px', color: C.textSub, marginTop: '6px' }}>{s.sub}</div>
            </GGCard>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '2fr 1fr', gap: '24px' }}>
          {/* Upcoming appointments */}
          <GGCard padding="24px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Upcoming Appointments</div>
              <span onClick={() => navigate('/sp/appointments')} style={{ fontSize: '13px', color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>View all →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {upcoming.map((apt, i) => (
                <div key={apt.id}
                  onClick={() => navigate('/sp/appointments/' + apt.id, { state: { apt } })}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: i < upcoming.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <GGAvatar name={apt.patient} size={40} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{apt.patient}</div>
                    <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>{apt.service} · {formatDate(apt.date)} at {apt.time}</div>
                  </div>
                  <SPStatusBadge status={apt.status} />
                </div>
              ))}
            </div>
          </GGCard>

          {/* Quick actions + Payment status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <GGCard padding="20px">
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '14px' }}>Quick Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'New Appointments', count: 2,                     screen: '/sp/appointments', color: C.blue500 },
                  { label: 'Upload Invoice',   count: null,                  screen: '/sp/invoices/upload', color: C.success },
                  { label: 'Pending Payments', count: 1,                     screen: '/sp/payments', color: C.warning },
                  { label: 'Patient History',  count: MOCK_SP_PATIENTS.length, screen: '/sp/patients', color: C.navy800 },
                ].map(action => (
                  <div key={action.label} onClick={() => navigate(action.screen)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: C.bg, borderRadius: radius.sm, cursor: 'pointer', border: `1px solid ${C.border}`, transition: 'all 0.13s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = action.color; (e.currentTarget as HTMLDivElement).style.background = '#fff' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; (e.currentTarget as HTMLDivElement).style.background = C.bg }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: C.text }}>{action.label}</span>
                    {action.count !== null && (
                      <span style={{ fontSize: '12px', fontWeight: 700, color: action.color, background: `${action.color}18`, padding: '2px 8px', borderRadius: radius.full }}>{action.count}</span>
                    )}
                  </div>
                ))}
              </div>
            </GGCard>

          </div>
        </div>

        {/* Recent payments table */}
        <GGCard padding="24px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Recent Payments</div>
            <span onClick={() => navigate('/sp/payments')} style={{ fontSize: '13px', color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>View all →</span>
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '440px', borderCollapse: 'collapse', fontFamily: font.family }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  {['Reference', 'Patient', 'Date', 'Amount', 'Status'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_SP_PAYMENTS.map(p => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600, color: C.blue500, whiteSpace: 'nowrap' }}>{p.id}</td>
                    <td style={{ padding: '12px', fontSize: '13px', color: C.text }}>{p.patient}</td>
                    <td style={{ padding: '12px', fontSize: '13px', color: C.textSub, whiteSpace: 'nowrap' }}>{formatDate(p.date)}</td>
                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: 800, color: C.text, whiteSpace: 'nowrap' }}>{formatCurrency(p.amount)}</td>
                    <td style={{ padding: '12px' }}><SPStatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GGCard>
      </div>
    </SPLayout>
  )
}
