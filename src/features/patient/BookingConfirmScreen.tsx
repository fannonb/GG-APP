import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { GGCard, GGButton, GGBadge } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { MOCK_PROVIDERS } from '@/mock/patient.mock'
import type { Provider } from '@/types/provider.types'

export function BookingConfirmScreen() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state?: { provider?: Provider; booking?: { date?: string; time?: string } } }
  const p = state?.provider ?? MOCK_PROVIDERS[0]
  const booking = state?.booking ?? {}
  const [refNum] = useState(() => 'BK-' + String(Math.floor(100000 + Math.random() * 900000)))

  return (
    <AppLayout title="Request Confirmed" subtitle="Pending provider confirmation" back notifCount={1}>
      <div style={{ maxWidth: 520, margin: '0 auto', fontFamily: font.family }}>
        <GGCard padding="48px 40px" style={{ textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: C.successBg, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid rgba(34,201,138,0.25)` }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M8 18l7 7 13-13" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>

          <div style={{ fontSize: '22px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: '8px' }}>Request Sent!</div>
          <div style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.6, marginBottom: '28px' }}>
            Your engagement request has been sent to <strong style={{ color: C.text }}>{p.name}</strong>. You'll receive a confirmation once they accept your booking.
          </div>

          <div style={{ background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, padding: '18px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Reference',    val: refNum },
                { label: 'Provider',     val: p.name },
                { label: 'Appointment', val: booking.date ? `${booking.date} at ${booking.time}` : 'Pending confirmation' },
                { label: 'Status',       val: <GGBadge type="warning">Pending Confirmation</GGBadge> },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: '13px', color: C.textSub, fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <GGButton variant="secondary" size="md" onClick={() => navigate('/app/services')} style={{ flex: 1 }}>Find More Services</GGButton>
            <GGButton variant="primary" size="md" onClick={() => navigate('/app/dashboard')} style={{ flex: 1 }}>Back to Dashboard</GGButton>
          </div>
        </GGCard>
      </div>
    </AppLayout>
  )
}
