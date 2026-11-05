import { useNavigate } from 'react-router-dom'
import { GGCard } from '@/design-system'
import { C, font } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { ROUTES } from '@/router/routes'
import { PharmacyPrescriptionUpload } from './components/PharmacyPrescriptionUpload'

/** The Pharmacy section: one form, sent to every registered pharmacy nearby. */
export function PharmacyRequestScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()

  return (
    <AppLayout title="Pharmacy" back notifCount={1}>
      <div style={{ maxWidth: 640, margin: '0 auto', fontFamily: font.family, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <GGCard padding={isMobile ? '20px 16px' : '32px 36px'}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: isMobile ? 19 : 21, fontWeight: 800, color: C.text, lineHeight: 1.25 }}>Send a prescription</div>
            <div style={{ fontSize: 13, color: C.textSub, marginTop: 6, lineHeight: 1.6 }}>
              Upload it once. We send it to registered pharmacies within 2 km of you, or within 6 km if none are closer.
              Compare the prices they send back, then choose one.
            </div>
          </div>
          <PharmacyPrescriptionUpload />
        </GGCard>
        <button
          type="button"
          onClick={() => navigate(ROUTES.PRESCRIPTION_REQUESTS)}
          style={{ alignSelf: 'center', background: 'none', border: 'none', padding: 8, fontSize: 13, fontWeight: 700, color: '#0B7BC0', cursor: 'pointer', fontFamily: font.family }}
        >
          View my prescriptions →
        </button>
      </div>
    </AppLayout>
  )
}
