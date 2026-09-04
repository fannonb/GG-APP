import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LOGO, ROUTES } from '@/router/routes'
import { C, font } from '@/design-system/tokens'
import { useLogoutMutation } from '@/hooks/api'
import { PATIENT_NAV, PatientNavIcon, isPatientNavActive } from './patientNav'

export function AppSidebar() {
  const { pathname } = useLocation()
  const logoutMutation = useLogoutMutation()
  const [supportOpen, setSupportOpen] = useState(false)

  // Filter out profile from main items if we show it in the bottom settings
  const mainNavItems = PATIENT_NAV.filter(item => item.id !== 'profile')
  const isProfileActive = pathname.startsWith(ROUTES.PROFILE)

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

      {/* Main Navigation Items */}
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
        {mainNavItems.map(item => {
          const active = isPatientNavActive(pathname, item)
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
                  <PatientNavIcon id={item.id} active={active} />
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </div>
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom Actions: Settings, Help & Support, Log Out */}
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
        {/* Settings (links to profile) */}
        <NavLink to={ROUTES.PROFILE} style={{ textDecoration: 'none' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '12px',
              background: isProfileActive ? '#FFFFFF' : 'transparent',
              color: isProfileActive ? C.navy800 : 'rgba(255,255,255,0.72)',
              fontSize: '13.5px',
              fontWeight: isProfileActive ? 700 : 500,
              fontFamily: font.family,
              cursor: 'pointer',
              boxShadow: isProfileActive ? '0 4px 14px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              if (!isProfileActive) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.color = '#FFFFFF'
              }
            }}
            onMouseLeave={e => {
              if (!isProfileActive) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'rgba(255,255,255,0.72)'
              }
            }}
          >
            <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isProfileActive ? C.navy800 : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

        {/* Log Out */}
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
          <span>Log Out</span>
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
            background: 'rgba(9, 28, 68, 0.45)',
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
              boxShadow: '0 20px 40px rgba(9, 28, 68, 0.2)',
              fontFamily: font.family,
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: C.navy800, margin: '0 0 4px' }}>
              Help & Support
            </h3>
            <p style={{ fontSize: '12px', fontWeight: 700, color: C.navy700, margin: '0 0 10px' }}>
              Available 24/7
            </p>
            <p style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.5, margin: '0 0 16px' }}>
              Need help with appointments, prescriptions, invoices, or your account? Reach the
              Gateway Global team by email or WhatsApp.
            </p>
            <a
              href="mailto:support@gatewayglobal.africa"
              style={{
                display: 'block',
                textDecoration: 'none',
                padding: '12px 14px',
                borderRadius: '14px',
                border: `1px solid ${C.border}`,
                background: C.bg,
                marginBottom: '10px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.textLight, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                Email
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.navy800, marginTop: '2px' }}>
                support@gatewayglobal.africa
              </div>
            </a>
            <a
              href="https://wa.me/263771234567"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                textDecoration: 'none',
                padding: '12px 14px',
                borderRadius: '14px',
                border: `1px solid ${C.border}`,
                background: C.bg,
                marginBottom: '18px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.textLight, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                WhatsApp
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.navy800, marginTop: '2px' }}>
                +263 77 123 4567
              </div>
            </a>
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
                fontFamily: font.family,
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
