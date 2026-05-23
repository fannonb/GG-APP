import type { ReactElement } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ROUTES, LOGO } from '@/router/routes'
import { C, font, radius } from '@/design-system/tokens'
import { MOCK_SP } from '@/mock/sp.mock'

interface NavItem {
  id: string
  label: string
  path: string
  matchPaths?: string[]
}

const SP_NAV: NavItem[] = [
  { id: 'sp-dashboard',    label: 'Dashboard',       path: ROUTES.SP_DASHBOARD },
  { id: 'sp-appointments', label: 'Appointments',    path: ROUTES.SP_APPOINTMENTS },
  { id: 'sp-patients',     label: 'Patient History', path: ROUTES.SP_PATIENTS },
  { id: 'sp-invoice',      label: 'Invoices',        path: ROUTES.SP_INVOICES },
  { id: 'sp-payments',     label: 'Payments',        path: ROUTES.SP_PAYMENTS },
  { id: 'sp-settings',     label: 'Settings',        path: ROUTES.SP_SETTINGS },
]

function SPNavIcon({ id, active }: { id: string; active: boolean }) {
  const col = active ? C.blue500 : 'currentColor'
  const icons: Record<string, ReactElement> = {
    'sp-dashboard': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill={col}/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill={col}/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill={col}/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill={col}/></svg>,
    'sp-appointments': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="2.5" width="13" height="11" rx="1.5" stroke={col} strokeWidth="1.3"/><path d="M1 6h13" stroke={col} strokeWidth="1.3"/><line x1="5" y1="1" x2="5" y2="4" stroke={col} strokeWidth="1.3" strokeLinecap="round"/><line x1="10" y1="1" x2="10" y2="4" stroke={col} strokeWidth="1.3" strokeLinecap="round"/><circle cx="7.5" cy="9.5" r="1.5" fill={col}/></svg>,
    'sp-patients': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="5.5" cy="4.5" r="2.5" stroke={col} strokeWidth="1.3"/><path d="M1 13c0-2.5 2-4.5 4.5-4.5S10 10.5 10 13" stroke={col} strokeWidth="1.3" strokeLinecap="round"/><circle cx="11.5" cy="5" r="1.8" stroke={col} strokeWidth="1.3"/><path d="M12 8.5c1.4.3 2.5 1.5 2.5 3" stroke={col} strokeWidth="1.3" strokeLinecap="round"/></svg>,
    'sp-invoice': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="1" width="11" height="13" rx="1.5" stroke={col} strokeWidth="1.3"/><path d="M5 5h5M5 8h5M5 11h3" stroke={col} strokeWidth="1.1" strokeLinecap="round"/></svg>,
    'sp-payments': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="3.5" width="13" height="8" rx="1.5" stroke={col} strokeWidth="1.3"/><path d="M1 6.5h13" stroke={col} strokeWidth="1.3"/><circle cx="11" cy="9.5" r="1.3" fill={col}/></svg>,
    'sp-settings': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2" stroke={col} strokeWidth="1.3"/><path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.9 2.9l1.1 1.1M11 11l1.1 1.1M2.9 12.1l1.1-1.1M11 4l1.1-1.1" stroke={col} strokeWidth="1.3" strokeLinecap="round"/></svg>,
  }
  return icons[id] ?? null
}

export function SPSidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const isActive = (item: NavItem) => {
    if (item.matchPaths) return item.matchPaths.some(p => pathname.startsWith(p))
    return pathname.startsWith(item.path)
  }

  return (
    <div style={{
      width: 280,
      minHeight: '100vh',
      background: C.navy800,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      boxShadow: '4px 0 24px rgba(13,30,66,0.14)',
    }}>
      {/* Logo */}
      <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={LOGO} alt="GG'APP" style={{ width: 102, height: 102, objectFit: 'contain' }} />
      </div>

      {/* Nav */}
      <nav style={{ padding: '8px 10px', flex: 1 }}>
        {SP_NAV.map(item => {
          const active = isActive(item)
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
                  <SPNavIcon id={item.id} active={active} />
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

      {/* Footer: Sign Out + Provider profile */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Sign Out — subtle, muted */}
        <div style={{ padding: '4px 10px 0' }}>
          <button
            onClick={() => navigate(ROUTES.LOGIN)}
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

        {/* Divider */}
        <div style={{ margin: '0 10px', height: '1px', background: 'rgba(255,255,255,0.06)' }} />

        {/* Provider profile */}
        <div style={{ padding: '8px 10px 16px' }}>
          <NavLink to={ROUTES.SP_SETTINGS} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: radius.sm, background: 'rgba(74,173,223,0.08)', cursor: 'pointer', transition: 'background 0.14s' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.blue500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: font.family }}>{MOCK_SP.name.split(' ').map(n => n[0]).join('')}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: font.family }}>{MOCK_SP.name}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: font.family }}>
                  <img src="https://flagcdn.com/w20/zw.png" srcSet="https://flagcdn.com/w40/zw.png 2x" alt="Zimbabwe" style={{ height: '12px', width: 'auto', borderRadius: '2px' }} />
                  <span>Provider Account</span>
                </div>
              </div>
            </div>
          </NavLink>
        </div>
      </div>
    </div>
  )
}
