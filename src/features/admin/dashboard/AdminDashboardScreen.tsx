import { useNavigate } from 'react-router-dom'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency, formatDate } from '@/utils/format'
import { MOCK_ADMIN_STATS, MOCK_SP_APPLICATIONS, MOCK_DISPUTES } from '@/mock/admin.mock'

const ACCENT = '#F5A623'

function AppStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending:        { bg: C.warningBg,  color: '#8A4D00', label: 'Pending' },
    approved:       { bg: C.successBg,  color: '#0D6B47', label: 'Approved' },
    rejected:       { bg: C.errorBg,    color: '#A83236', label: 'Rejected' },
    info_requested: { bg: C.blue100,    color: '#1A5D8A', label: 'Info Requested' },
  }
  const s = map[status] ?? map.pending
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: radius.full, background: s.bg, fontSize: '11px', fontWeight: 700, color: s.color, textTransform: 'capitalize' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

export function AdminDashboardScreen() {
  const navigate = useNavigate()
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet

  const kpis = [
    { label: 'Pending SP Applications', val: MOCK_ADMIN_STATS.pendingSPApps,    color: ACCENT,     action: () => navigate('/admin/applications') },
    { label: 'Open Disputes',           val: MOCK_ADMIN_STATS.pendingDisputes,  color: C.error,    action: () => navigate('/admin/disputes') },
    { label: 'Invoices Under Review',   val: MOCK_ADMIN_STATS.pendingInvoices,  color: C.blue500,  action: () => navigate('/admin/invoices') },
    { label: 'Active Providers',        val: MOCK_ADMIN_STATS.totalProviders,   color: C.success,  action: undefined },
    { label: 'Registered Patients',     val: MOCK_ADMIN_STATS.totalPatients.toLocaleString(), color: C.navy800, action: undefined },
    { label: 'Monthly Volume (Z$)',     val: formatCurrency(MOCK_ADMIN_STATS.monthlyVolume),  color: C.success,  action: undefined },
  ]

  const openDisputes = MOCK_DISPUTES.filter(d => d.status === 'open')
  const recentApps   = MOCK_SP_APPLICATIONS.slice(0, 4)

  return (
    <AdminLayout title="Admin Dashboard" subtitle="Platform overview and pending actions">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: font.family }}>

        {/* KPI grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : isTablet ? 'repeat(3,1fr)' : 'repeat(6,1fr)', gap: '14px' }}>
          {kpis.map(k => (
            <GGCard key={k.label} padding={isMobile ? '14px' : '18px'}
              style={{ background: '#fff', borderTop: `3px solid ${k.color}`, cursor: k.action ? 'pointer' : 'default', transition: 'box-shadow 0.13s' }}
              onClick={k.action}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', lineHeight: 1.4 }}>{k.label}</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: k.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{k.val}</div>
            </GGCard>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '3fr 2fr', gap: '24px' }}>

          {/* Recent SP Applications */}
          <GGCard padding="0" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Recent SP Applications</div>
              <span onClick={() => navigate('/admin/applications')} style={{ fontSize: '13px', color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>View all →</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '480px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                    {['Provider', 'Type', 'Submitted', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentApps.map((app, i) => (
                    <tr key={app.id}
                      onClick={() => navigate('/admin/applications')}
                      style={{ borderBottom: i < recentApps.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{app.name}</div>
                        <div style={{ fontSize: '11px', color: C.textSub }}>{app.country}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: C.textSub, whiteSpace: 'nowrap' }}>{app.type}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: C.textSub, whiteSpace: 'nowrap' }}>{formatDate(app.submitted)}</td>
                      <td style={{ padding: '12px 16px' }}><AppStatusBadge status={app.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GGCard>

          {/* Open Disputes */}
          <GGCard padding="0" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Open Disputes</div>
              <span onClick={() => navigate('/admin/disputes')} style={{ fontSize: '13px', color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>View all →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {openDisputes.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: C.textSub, fontSize: '13px' }}>No open disputes</div>
              )}
              {openDisputes.map((d, i) => (
                <div key={d.id}
                  onClick={() => navigate('/admin/disputes')}
                  style={{ padding: '14px 22px', borderBottom: i < openDisputes.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{d.patient} <span style={{ color: C.textSub, fontWeight: 400 }}>vs</span> {d.provider}</div>
                      <div style={{ fontSize: '11px', color: C.textSub, marginTop: '3px' }}>{d.invoice} · {formatDate(d.submitted)}</div>
                      <div style={{ fontSize: '12px', color: C.textSub, marginTop: '6px', lineHeight: 1.5 }}>{d.reason.slice(0, 80)}…</div>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: C.error, whiteSpace: 'nowrap', flexShrink: 0 }}>{formatCurrency(d.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          </GGCard>
        </div>
      </div>
    </AdminLayout>
  )
}
