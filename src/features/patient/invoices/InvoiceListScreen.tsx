import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGBadge } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { formatCurrency, formatDate } from '@/utils/format'
import type { BadgeType } from '@/design-system/GGBadge'

const invoices = [
  { id: 'INV-2026-0842', provider: 'City Medical Centre', amount: 450.00, date: '2026-05-19', status: 'pending_auth', service: 'General Consultation' },
  { id: 'INV-2026-0801', provider: 'Premier Diagnostics', amount: 280.00, date: '2026-05-03', status: 'paid',         service: 'Blood Panel' },
  { id: 'INV-2026-0776', provider: 'LifeCare Pharmacy',   amount: 125.50, date: '2026-04-28', status: 'paid',         service: 'Prescription Fill' },
]

const statusMap: Record<string, { type: BadgeType; label: string }> = {
  pending_auth: { type: 'warning', label: 'Awaiting Auth' },
  paid:         { type: 'success', label: 'Paid' },
  disputed:     { type: 'error',   label: 'Disputed' },
  admin_review: { type: 'pending', label: 'Under Review' },
}

export function InvoiceListScreen() {
  const navigate = useNavigate()

  return (
    <AppLayout title="Invoices" subtitle="Review and authorize pending invoices" notifCount={1}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {/* Pending alert */}
        <div style={{ padding: '14px 20px', background: `linear-gradient(90deg, ${C.warningBg}, #FFF8E0)`, borderRadius: radius.sm, border: `1px solid rgba(245,166,35,0.25)`, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3l6 10H2z" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinejoin="round"/><line x1="8" y1="7.5" x2="8" y2="10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11.5" r="0.8" fill="#fff"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#8A4D00' }}>1 invoice requires your authorization</div>
            <div style={{ fontSize: '12px', color: '#A06000', marginTop: '2px' }}>INV-2026-0842 from City Medical Centre — {formatCurrency(450)}</div>
          </div>
          <GGButton variant="warning" size="sm" onClick={() => navigate('/app/invoices/INV-2026-0842')} style={{ background: C.warning, color: '#fff', flexShrink: 0 }}>
            Authorize Now
          </GGButton>
        </div>

        {/* Invoice list */}
        <GGCard padding="0" noPad>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>All Invoices</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['All', 'Pending', 'Paid'].map(f => (
                <button key={f} style={{ padding: '5px 12px', borderRadius: radius.full, border: `1px solid ${C.border}`, background: f === 'All' ? C.blue100 : '#fff', color: f === 'All' ? C.blue500 : C.textSub, fontSize: '12px', fontWeight: f === 'All' ? 700 : 500, cursor: 'pointer', fontFamily: font.family }}>{f}</button>
              ))}
            </div>
          </div>
          {invoices.map((inv, i) => {
            const s = statusMap[inv.status] ?? { type: 'default' as BadgeType, label: inv.status }
            return (
              <div key={inv.id}
                onClick={() => inv.status === 'pending_auth' ? navigate(`/app/invoices/${inv.id}`) : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 22px', borderBottom: i < invoices.length - 1 ? `1px solid ${C.border}` : 'none', cursor: inv.status === 'pending_auth' ? 'pointer' : 'default', transition: 'background 0.12s' }}
                onMouseEnter={e => { if (inv.status === 'pending_auth') e.currentTarget.style.background = C.bg }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: '12px', background: inv.status === 'pending_auth' ? C.warningBg : C.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="2" width="12" height="14" rx="2" stroke={inv.status === 'pending_auth' ? C.warning : C.success} strokeWidth="1.3"/><line x1="6" y1="6" x2="12" y2="6" stroke={inv.status === 'pending_auth' ? C.warning : C.success} strokeWidth="1" strokeLinecap="round"/><line x1="6" y1="9" x2="12" y2="9" stroke={inv.status === 'pending_auth' ? C.warning : C.success} strokeWidth="1" strokeLinecap="round"/></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{inv.id}</div>
                  <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>{inv.provider} · {inv.service}</div>
                  <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>{formatDate(inv.date)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>{formatCurrency(inv.amount)}</div>
                  <div style={{ marginTop: '4px' }}><GGBadge type={s.type}>{s.label}</GGBadge></div>
                </div>
              </div>
            )
          })}
        </GGCard>
      </div>
    </AppLayout>
  )
}
