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

  const focusColor = tab === 'patient' ? C.blue500 : '#10B981'

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      height: isMobile ? 'auto' : '100vh',
      minHeight: '100vh',
      overflow: isMobile ? 'visible' : 'hidden',
      fontFamily: font.family,
      background: C.bg,
    }}>
      <AuthBrandPanel tab={tab} />

      {/* Mobile brand header */}
      {isMobile && (
        <div style={{
          background: 'linear-gradient(135deg, #091C44 0%, #050E22 100%)',
          padding: '24px 20px 20px',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '0 0 28px 28px',
          boxShadow: '0 8px 24px rgba(5, 14, 34, 0.2)',
        }}>
          {[160, 260, 360].map((r, i) => {
            const rgb = tab === 'patient' ? '56, 182, 255' : '16, 185, 129'
            return (
              <div key={i} style={{
                position: 'absolute',
                width: r, height: r,
                borderRadius: '50%',
                border: `1px solid rgba(${rgb},${0.06 - i * 0.015})`,
                top: '50%', right: '-40px',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                transition: 'all 0.3s ease',
              }} />
            )
          })}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {/* Glassmorphic Logo Frame */}
            <div style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
              marginBottom: '10px',
            }}>
              <img src={LOGO} alt="GG'APP" width={48} height={48} style={{ objectFit: 'contain', display: 'block' }} />
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 500, lineHeight: 1.4, textAlign: 'center', fontFamily: font.family }}>
              {tab === 'patient' ? 'Healthcare Access, Simplified.' : 'Grow Your Practice.'}
            </div>
          </div>
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
            {(tab === 'patient'
              ? ['Zero Upfront Cost', 'Verified Providers', 'Secure Payments']
              : ['Instant Disbursements', 'Pre-verified Patients', 'Simplified Admin']
            ).map(label => {
              const accentColor = tab === 'patient' ? '#38B6FF' : '#10B981'
              return (
                <div key={label} style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: `${accentColor}10`,
                  border: `1px solid ${accentColor}30`,
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.8)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.3s ease',
                }}>{label}</div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: C.surface,
        position: 'relative',
      }}>
        {/* Dynamic decorative backdrop blobs (isolated clipping container) */}
        <div style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}>
          <div style={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: tab === 'patient'
              ? 'radial-gradient(circle, rgba(56, 182, 255, 0.07) 0%, rgba(56, 182, 255, 0) 70%)'
              : 'radial-gradient(circle, rgba(16, 185, 129, 0.07) 0%, rgba(16, 185, 129, 0) 70%)',
            filter: 'blur(40px)',
            transition: 'background 0.3s ease',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-10%',
            left: '-10%',
            width: '350px',
            height: '350px',
            borderRadius: '50%',
            background: tab === 'patient'
              ? 'radial-gradient(circle, rgba(56, 182, 255, 0.05) 0%, rgba(56, 182, 255, 0) 70%)'
              : 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0) 70%)',
            filter: 'blur(30px)',
            transition: 'background 0.3s ease',
          }} />
        </div>

        <div style={{
          minHeight: isMobile ? 'auto' : '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '16px 12px 24px' : '36px 40px',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{
            width: '100%',
            maxWidth: 520,
            padding: isMobile ? '20px 16px' : '40px 36px',
          }}>
            <EntityTabBar tab={tab} setTab={setTab} />

            <div style={{ marginBottom: '24px', marginTop: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {tab === 'patient' ? 'Create Patient Account' : 'Register Your Practice'}
                {tab === 'patient' ? (
                  /* Person silhouette — health account */
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <circle cx="11" cy="7.5" r="3" stroke={C.textSub} strokeWidth="1.4"/>
                    <path d="M4 19.5c0-3.866 3.134-7 7-7h2c3.866 0 7 3.134 7 7" stroke={C.textSub} strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                ) : (
                  /* Stethoscope — practice registration */
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <circle cx="7"  cy="4" r="1.2" fill={C.textSub}/>
                    <circle cx="15" cy="4" r="1.2" fill={C.textSub}/>
                    <path d="M7 4v5.5a4 4 0 008 0V4" stroke={C.textSub} strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M11 9.5v4"               stroke={C.textSub} strokeWidth="1.4" strokeLinecap="round"/>
                    <circle cx="11" cy="16.5" r="2"   stroke={C.textSub} strokeWidth="1.4"/>
                  </svg>
                )}
              </div>
              <div style={{ fontSize: '14px', color: C.textSub }}>
                {tab === 'patient'
                  ? 'Get access to verified healthcare providers near you.'
                  : "Join GG'APP and start receiving verified patient bookings."}
              </div>
            </div>

            {tab === 'patient' ? <PatientRegisterFlow /> : <SPRegisterFlow />}

            <div style={{ textAlign: 'center', fontSize: '13px', color: C.textSub, marginTop: '20px', borderTop: `1px solid ${C.border}`, paddingTop: '16px' }}>
              Already have an account?{' '}
              <Link to={ROUTES.LOGIN} style={{ color: focusColor, fontWeight: 700, textDecoration: 'none', transition: 'color 0.2s' }}>Sign In</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
