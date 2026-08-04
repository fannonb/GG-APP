import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { GGCard, GGButton, GGBadge } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { ROUTES } from '@/router/routes'
import type { Provider } from '@/types/provider.types'
import type { PrescriptionRequest } from '@/types/prescription.types'

export function PrescriptionConfirmScreen() {
  const navigate = useNavigate()
  const { state } = useLocation() as {
    state?: {
      provider?: Provider
      result?: PrescriptionRequest
    }
  }
  const provider = state?.provider
  const result = state?.result

  if (!provider || !result) {
    return <Navigate to={ROUTES.PRESCRIPTION_REQUESTS} replace />
  }

  return (
    <AppLayout title="Prescription Sent" subtitle="Pending pharmacy review" back notifCount={1}>
      <div style={{ maxWidth: 520, margin: '0 auto', fontFamily: font.family }}>
        <GGCard padding="48px 40px" style={{ textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: C.successBg, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid rgba(34,201,138,0.25)` }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M8 18l7 7 13-13" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>

          <div style={{ fontSize: '22px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: '8px' }}>Prescription Sent!</div>
          <div style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.6, marginBottom: '28px' }}>
            Your prescription has been sent to <strong style={{ color: C.text }}>{provider.name}</strong>. They'll confirm stock and pricing before you pay.
          </div>

          <div style={{ background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, padding: '18px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Reference',   val: result.id },
                { label: 'Pharmacy',    val: provider.name },
                { label: 'For',         val: result.for },
                { label: 'Fulfillment', val: result.fulfillmentMode === 'delivery' ? 'Delivery' : 'Pickup at pharmacy' },
                { label: 'Status',      val: <GGBadge type="warning">Pending Review</GGBadge> },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: '13px', color: C.textSub, fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <GGButton variant="secondary" size="md" onClick={() => navigate(ROUTES.PRESCRIPTION_REQUESTS)} style={{ flex: 1 }}>Track Requests</GGButton>
            <GGButton variant="primary" size="md" onClick={() => navigate(ROUTES.DASHBOARD)} style={{ flex: 1 }}>Back to Dashboard</GGButton>
          </div>
        </GGCard>
      </div>
    </AppLayout>
  )
}
