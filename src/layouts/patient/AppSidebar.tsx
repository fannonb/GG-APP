import { NavLink, useLocation } from 'react-router-dom'
import { LOGO } from '@/router/routes'
import { C, font, radius } from '@/design-system/tokens'
import { useLogoutMutation } from '@/hooks/api'
import { PATIENT_NAV, PatientNavIcon, isPatientNavActive } from './patientNav'

export function AppSidebar() {
  const { pathname } = useLocation()
  const logoutMutation = useLogoutMutation()

  return (
    <div style={{
      width: 210,
      minHeight: '100vh',
      background: C.navy800,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      boxShadow: '4px 0 24px rgba(13,30,66,0.14)',
    }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={LOGO} alt="GG'APP" style={{ width: 102, height: 102, objectFit: 'contain' }} />
      </div>

      <nav style={{ padding: '8px 10px', flex: 1 }}>
        {PATIENT_NAV.map(item => {
          const active = isPatientNavActive(pathname, item)
          return (
            <NavLink key={item.id} to={item.path} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: radius.sm,
                marginBottom: '2px',
                background: active ? 'rgba(74,173,223,0.15)' : 'transparent',
                color: active ? C.blue500 : 'rgba(255,255,255,0.90)',
                fontSize: '14px',
                fontWeight: active ? 700 : 500,
                fontFamily: font.family,
                cursor: 'pointer',
                transition: 'all 0.14s ease',
              }}>
                <span style={{ flexShrink: 0 }}>
                  <PatientNavIcon id={item.id} active={active} />
                </span>
                {item.label}
                {active && (
                  <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: C.blue500 }} />
                )}
              </div>
            </NavLink>
          )
        })}
      </nav>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 10px 16px' }}>
        <button
          onClick={() => logoutMutation.mutate()}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', borderRadius: radius.sm, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.38)', fontSize: '13px', fontWeight: 500, fontFamily: font.family, cursor: 'pointer', transition: 'color 0.14s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.38)')}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M10 11l3-3-3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  )
}
