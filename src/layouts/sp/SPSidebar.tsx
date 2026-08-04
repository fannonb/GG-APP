import type { ReactElement } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useLogoutMutation, useSPProfile } from '@/hooks/api'
import { C, font, radius } from '@/design-system/tokens'
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
  { id: 'sp-patients', label: 'Patient Ledger', path: ROUTES.SP_PATIENTS },
  { id: 'sp-invoice', label: 'Invoices', path: ROUTES.SP_INVOICES },
  { id: 'sp-payments', label: 'Payments', path: ROUTES.SP_PAYMENTS },
  { id: 'sp-settings', label: 'Settings', path: ROUTES.SP_SETTINGS },
]

function SPNavIcon({ id, active }: { id: string; active: boolean }) {
  const col = active ? C.blue500 : 'currentColor'
  const icons: Record<string, ReactElement> = {
    'sp-dashboard': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill={col} /><rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill={col} /><rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill={col} /><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill={col} /></svg>,
    'sp-appointments': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="2.5" width="13" height="11" rx="1.5" stroke={col} strokeWidth="1.3" /><path d="M1 6h13" stroke={col} strokeWidth="1.3" /><line x1="5" y1="1" x2="5" y2="4" stroke={col} strokeWidth="1.3" strokeLinecap="round" /><line x1="10" y1="1" x2="10" y2="4" stroke={col} strokeWidth="1.3" strokeLinecap="round" /><circle cx="7.5" cy="9.5" r="1.5" fill={col} /></svg>,
    'sp-prescriptions': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="2" width="11" height="11" rx="2" stroke={col} strokeWidth="1.3"/><line x1="7.5" y1="4.5" x2="7.5" y2="10.5" stroke={col} strokeWidth="1.4" strokeLinecap="round"/><line x1="4.5" y1="7.5" x2="10.5" y2="7.5" stroke={col} strokeWidth="1.4" strokeLinecap="round"/></svg>,
    'sp-patients': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="5.5" cy="4.5" r="2.5" stroke={col} strokeWidth="1.3" /><path d="M1 13c0-2.5 2-4.5 4.5-4.5S10 10.5 10 13" stroke={col} strokeWidth="1.3" strokeLinecap="round" /><circle cx="11.5" cy="5" r="1.8" stroke={col} strokeWidth="1.3" /><path d="M12 8.5c1.4.3 2.5 1.5 2.5 3" stroke={col} strokeWidth="1.3" strokeLinecap="round" /></svg>,
    'sp-invoice': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="1" width="11" height="13" rx="1.5" stroke={col} strokeWidth="1.3" /><path d="M5 5h5M5 8h5M5 11h3" stroke={col} strokeWidth="1.1" strokeLinecap="round" /></svg>,
    'sp-payments': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="3.5" width="13" height="8" rx="1.5" stroke={col} strokeWidth="1.3" /><path d="M1 6.5h13" stroke={col} strokeWidth="1.3" /><circle cx="11" cy="9.5" r="1.3" fill={col} /></svg>,
    'sp-settings': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2" stroke={col} strokeWidth="1.3" /><path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.9 2.9l1.1 1.1M11 11l1.1 1.1M2.9 12.1l1.1-1.1M11 4l1.1-1.1" stroke={col} strokeWidth="1.3" strokeLinecap="round" /></svg>,
  }
  return icons[id] ?? null
}

export function SPSidebar() {
  const { pathname } = useLocation()
  const logoutMutation = useLogoutMutation()
  const { data: profile } = useSPProfile()

  const isPharmacyOnly = profile?.isPharmacyOnly ?? false
  const navItems = SP_NAV.filter(item => {
    if (item.id === 'sp-appointments') return !isPharmacyOnly
    return true
  })

  const isActive = (item: NavItem) => {
    if (item.matchPaths) return item.matchPaths.some(path => pathname.startsWith(path))
    return pathname.startsWith(item.path)
  }

  return (
    <div
      style={{
        width: 210,
        minHeight: '100vh',
        background: C.navy800,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        boxShadow: '4px 0 24px rgba(13,30,66,0.14)',
      }}
    >
      <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={LOGO} alt="GG'APP" style={{ width: 102, height: 102, objectFit: 'contain' }} />
      </div>

      <nav style={{ padding: '8px 10px', flex: 1 }}>
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
                  borderRadius: radius.sm,
                  marginBottom: '2px',
                  background: active ? 'rgba(56, 182, 255, 0.15)' : 'transparent',
                  color: active ? C.blue500 : 'rgba(255,255,255,0.90)',
                  fontSize: '14px',
                  fontWeight: active ? 700 : 500,
                  fontFamily: font.family,
                }}
              >
                <span style={{ flexShrink: 0 }}>
                  <SPNavIcon id={item.id} active={active} />
                </span>
                {item.label}
              </div>
            </NavLink>
          )
        })}
      </nav>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 10px 16px' }}>
        <button
          onClick={() => logoutMutation.mutate()}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', borderRadius: radius.sm, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 500, fontFamily: font.family, cursor: 'pointer' }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M10 11l3-3-3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  )
}
