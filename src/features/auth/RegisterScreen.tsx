import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { C, font } from '@/design-system/tokens'
import { LOGO, ROUTES } from '@/router/routes'
import { useResponsive } from '@/hooks/useResponsive'
import { AuthBrandPanel } from './components/AuthBrandPanel'
import { EntityTabBar } from './components/EntityTabBar'
import { PatientRegisterFlow } from './components/PatientRegisterFlow'
import { SPRegisterFlow } from './components/SPRegisterFlow'

type Tab = 'patient' | 'sp'

export function RegisterScreen() {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) ?? 'patient')
  const { isMobile } = useResponsive()
  useNavigate()

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      height: isMobile ? 'auto' : '100vh',
      minHeight: '100vh',
      overflow: isMobile ? 'visible' : 'hidden',
      fontFamily: font.family,
    }}>
      <AuthBrandPanel tab={tab} />

      {/* Mobile brand header */}
      {isMobile && (
        <div style={{
          background: '#091c44',
          padding: '36px 24px 32px',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '0 0 28px 28px',
        }}>
          {[160, 260, 360].map((r, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: r, height: r,
              borderRadius: '50%',
              border: `1px solid rgba(74,173,223,${0.08 - i * 0.02})`,
              top: '50%', right: '-40px',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }} />
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <img src={LOGO} alt="GG'APP" width={80} height={80} style={{ objectFit: 'contain' }} />
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '10px', lineHeight: 1.4, textAlign: 'center' }}>
              {tab === 'patient' ? 'Healthcare Access, Simplified.' : 'Grow Your Practice.'}
            </div>
          </div>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
            {(tab === 'patient'
              ? ['Zero Upfront Cost', 'Verified Providers', 'Secure Payments']
              : ['Instant Disbursements', 'Pre-verified Patients', 'Simplified Admin']
            ).map(label => (
              <div key={label} style={{
                padding: '6px 12px',
                borderRadius: '20px',
                background: 'rgba(74,173,223,0.1)',
                border: '1px solid rgba(74,173,223,0.25)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.75)',
                whiteSpace: 'nowrap',
              }}>{label}</div>
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
        <div style={{
          minHeight: isMobile ? 'auto' : '100%',
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'center',
          padding: isMobile ? '28px 20px 40px' : '32px 40px',
        }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <EntityTabBar tab={tab} setTab={setTab} />

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: '6px' }}>
              {tab === 'patient' ? 'Create Patient Account' : 'Register Your Practice'}
            </div>
            <div style={{ fontSize: '14px', color: C.textSub }}>
              {tab === 'patient'
                ? 'Get access to verified healthcare providers near you.'
                : "Join GG'APP and start receiving verified patient bookings."}
            </div>
          </div>

          {tab === 'patient' ? <PatientRegisterFlow /> : <SPRegisterFlow />}

          <div style={{ textAlign: 'center', fontSize: '13px', color: C.textSub, marginTop: '20px' }}>
            Already have an account?{' '}
            <Link to={ROUTES.LOGIN} style={{ color: C.blue500, fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
