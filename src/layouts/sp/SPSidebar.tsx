import { useState, type ReactElement } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useLogoutMutation, useSPProfile } from '@/hooks/api'
import { C, font } from '@/design-system/tokens'
import { LOGO, ROUTES } from '@/router/routes'

interface NavItem {
  id: string
  label: string
  path: string
  matchPaths?: string[]
}

const SP_NAV: NavItem[] = [
  { id: 'sp-dashboard', label: 'Dashboard', path: ROUTES.SP_DASHBOARD },
  { id: 'sp-appointments', label: 'Appointments', path: ROUTES.SP_APPOINTMENTS },
  { id: 'sp-prescriptions', label: 'Prescriptions', path: ROUTES.SP_PRESCRIPTIONS, matchPaths: ['/sp/prescriptions'] },
  { id: 'sp-patients', label: 'Patient Records', path: ROUTES.SP_PATIENTS },
  { id: 'sp-invoice', label: 'Invoices', path: ROUTES.SP_INVOICES },
  { id: 'sp-payments', label: 'Payments', path: ROUTES.SP_PAYMENTS },
]

function SPNavIcon({ id, active }: { id: string; active: boolean }) {
  const col = active ? C.navy800 : 'rgba(255,255,255,0.75)'
  const icons: Record<string, ReactElement> = {
    'sp-dashboard': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill={col} />
        <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill={col} />
        <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill={col} />
        <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill={col} />
      </svg>
    ),
    'sp-appointments': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="2.5" width="13" height="11" rx="1.5" stroke={col} strokeWidth="1.3" />
        <path d="M1 6h13" stroke={col} strokeWidth="1.3" />
        <line x1="5" y1="1" x2="5" y2="4" stroke={col} strokeWidth="1.3" strokeLinecap="round" />
        <line x1="10" y1="1" x2="10" y2="4" stroke={col} strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="7.5" cy="9.5" r="1.5" fill={col} />
      </svg>
    ),
    'sp-prescriptions': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="2" y="2" width="11" height="11" rx="2" stroke={col} strokeWidth="1.3" />
        <line x1="7.5" y1="4.5" x2="7.5" y2="10.5" stroke={col} strokeWidth="1.4" strokeLinecap="round" />
        <line x1="4.5" y1="7.5" x2="10.5" y2="7.5" stroke={col} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    'sp-patients': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="5.5" cy="4.5" r="2.5" stroke={col} strokeWidth="1.3" />
        <path d="M1 13c0-2.5 2-4.5 4.5-4.5S10 10.5 10 13" stroke={col} strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="11.5" cy="5" r="1.8" stroke={col} strokeWidth="1.3" />
        <path d="M12 8.5c1.4.3 2.5 1.5 2.5 3" stroke={col} strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    'sp-invoice': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="2" y="1" width="11" height="13" rx="1.5" stroke={col} strokeWidth="1.3" />
        <path d="M5 5h5M5 8h5M5 11h3" stroke={col} strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    ),
    'sp-payments': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="3.5" width="13" height="8" rx="1.5" stroke={col} strokeWidth="1.3" />
        <path d="M1 6.5h13" stroke={col} strokeWidth="1.3" />
        <circle cx="11" cy="9.5" r="1.3" fill={col} />
      </svg>
    ),
  }
  return icons[id] ?? null
}

export function SPSidebar() {
  const { pathname } = useLocation()
  const logoutMutation = useLogoutMutation()
  const { data: profile } = useSPProfile()
  const [supportOpen, setSupportOpen] = useState(false)

  const isPharmacyOnly = profile?.isPharmacyOnly ?? false
  const navItems = SP_NAV.filter(item => {
    if (item.id === 'sp-appointments') return !isPharmacyOnly
    return true
  })

  const isActive = (item: NavItem) => {
    if (item.matchPaths) return item.matchPaths.some(path => pathname.startsWith(path))
    return pathname.startsWith(item.path)
  }

  const isSettingsActive = pathname.startsWith(ROUTES.SP_SETTINGS)

  return (
    <div
      style={{
        width: 236,
        height: '100%',
        background: C.navy800,
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        padding: '20px 14px 18px 14px',
        boxShadow: '0 12px 36px rgba(9, 28, 68, 0.16)',
        overflow: 'hidden',
      }}
    >
      {/* Brand Logo */}
      <div
        style={{
          padding: '8px 10px 18px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={LOGO}
          alt="GG'APP"
          style={{ width: 80, height: 80, objectFit: 'contain' }}
        />
      </div>

      {/* Navigation list */}
      <nav
        className="hide-scrollbar"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          flex: 1,
          overflowY: 'auto',
          paddingRight: '2px',
        }}
      >
        {navItems.map(item => {
          const active = isActive(item)
          return (
            <NavLink key={item.id} to={item.path} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  background: active ? '#FFFFFF' : 'transparent',
                  color: active ? C.navy800 : 'rgba(255,255,255,0.72)',
                  fontSize: '14px',
                  fontWeight: active ? 700 : 500,
                  fontFamily: font.family,
                  cursor: 'pointer',
                  boxShadow: active ? '0 4px 14px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                    e.currentTarget.style.color = '#FFFFFF'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'rgba(255,255,255,0.72)'
                  }
                }}
              >
                <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <SPNavIcon id={item.id} active={active} />
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </div>
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom Actions */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: '12px',
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
        }}
      >
        {/* Settings */}
        <NavLink to={ROUTES.SP_SETTINGS} style={{ textDecoration: 'none' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '12px',
              background: isSettingsActive ? '#FFFFFF' : 'transparent',
              color: isSettingsActive ? C.navy800 : 'rgba(255,255,255,0.72)',
              fontSize: '13.5px',
              fontWeight: isSettingsActive ? 700 : 500,
              fontFamily: font.family,
              cursor: 'pointer',
              boxShadow: isSettingsActive ? '0 4px 14px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              if (!isSettingsActive) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.color = '#FFFFFF'
              }
            }}
            onMouseLeave={e => {
              if (!isSettingsActive) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'rgba(255,255,255,0.72)'
              }
            }}
          >
            <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isSettingsActive ? C.navy800 : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </span>
            <span>Settings</span>
          </div>
        </NavLink>

        {/* Help & Support */}
        <div
          onClick={() => setSupportOpen(o => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '12px',
            background: 'transparent',
            color: 'rgba(255,255,255,0.72)',
            fontSize: '13.5px',
            fontWeight: 500,
            fontFamily: font.family,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.color = '#FFFFFF'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'rgba(255,255,255,0.72)'
          }}
        >
          <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" x2="12.01" y1="17" y2="17"/>
            </svg>
          </span>
          <span>Help & Support</span>
        </div>

        {/* Sign Out */}
        <button
          onClick={() => logoutMutation.mutate()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '10px 14px',
            borderRadius: '12px',
            border: 'none',
            background: 'transparent',
            color: 'rgba(255,255,255,0.65)',
            fontSize: '13.5px',
            fontWeight: 500,
            fontFamily: font.family,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            textAlign: 'left',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'
            e.currentTarget.style.color = '#EF4444'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
          }}
        >
          <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" x2="9" y1="12" y2="12"/>
            </svg>
          </span>
          <span>Sign Out</span>
        </button>
      </div>

      {/* Help Modal */}
      {supportOpen && (
        <div
          onClick={() => setSupportOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              fontFamily: font.family,
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: C.navy800, marginBottom: '8px' }}>
              Provider Support
            </h3>
            <p style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.5, marginBottom: '16px' }}>
              Have questions regarding provider billing, appointment scheduling, or patient verification?
            </p>
            <div style={{ fontSize: '13px', color: C.text, fontWeight: 600, marginBottom: '6px' }}>
              Email:{' '}
              <a
                href="mailto:support@gatewayglobal.africa"
                style={{ color: C.blue500, textDecoration: 'none', fontWeight: 700 }}
              >
                support@gatewayglobal.africa
              </a>
            </div>
            <div style={{ fontSize: '13px', color: C.text, fontWeight: 600, marginBottom: '20px' }}>
              Support Hotline: +263 77 987 6543
            </div>
            <button
              onClick={() => setSupportOpen(false)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: C.navy800,
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
