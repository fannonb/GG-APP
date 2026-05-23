import type { ReactElement } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ROUTES, LOGO } from '@/router/routes'
import { C, font, radius } from '@/design-system/tokens'
import { MOCK_USER } from '@/mock/patient.mock'

interface NavItem {
  id: string
  label: string
  path: string
  matchPaths?: string[]
}

const NAV: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',      path: ROUTES.DASHBOARD },
  { id: 'services',     label: 'Find Service',   path: ROUTES.FIND_SERVICE,     matchPaths: [ROUTES.FIND_SERVICE, ROUTES.BOOKING] },
  { id: 'credit',       label: 'Credit Wallet',  path: ROUTES.CREDIT_WALLET },
  { id: 'invoices',     label: 'Invoices',       path: ROUTES.INVOICE_LIST },
  { id: 'transactions', label: 'Transactions',   path: ROUTES.TRANSACTIONS },
  { id: 'profile',      label: 'My Profile',     path: ROUTES.PROFILE },
]

function NavIcon({ id, active }: { id: string; active: boolean }) {
  const col = active ? C.blue500 : 'currentColor'
  const op = active ? 1 : 0.6

  const icons: Record<string, ReactElement> = {
    dashboard: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill={col} opacity={op}/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill={col} opacity={op}/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill={col} opacity={op}/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill={col} opacity={op}/>
      </svg>
    ),
    services: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5" stroke={col} strokeWidth="1.5" opacity={op}/>
        <line x1="11" y1="11" x2="14.5" y2="14.5" stroke={col} strokeWidth="1.5" strokeLinecap="round" opacity={op}/>
      </svg>
    ),
    credit: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="4" width="14" height="9" rx="2" stroke={col} strokeWidth="1.5" opacity={op}/>
        <path d="M1 7h14" stroke={col} strokeWidth="1.5" opacity={op}/>
        <circle cx="11.5" cy="10.5" r="1.5" fill={col} opacity={op}/>
      </svg>
    ),
    invoices: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="1" width="10" height="14" rx="2" stroke={col} strokeWidth="1.5" opacity={op}/>
        <line x1="5.5" y1="5" x2="10.5" y2="5" stroke={col} strokeWidth="1.3" strokeLinecap="round" opacity={op}/>
        <line x1="5.5" y1="8" x2="10.5" y2="8" stroke={col} strokeWidth="1.3" strokeLinecap="round" opacity={op}/>
        <line x1="5.5" y1="11" x2="8.5" y2="11" stroke={col} strokeWidth="1.3" strokeLinecap="round" opacity={op}/>
      </svg>
    ),
    transactions: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 5h12M2 8h8M2 11h5" stroke={col} strokeWidth="1.5" strokeLinecap="round" opacity={op}/>
        <path d="M12 10l2 2-2 2" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={op}/>
      </svg>
    ),
    profile: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5.5" r="3" stroke={col} strokeWidth="1.5" opacity={op}/>
        <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={col} strokeWidth="1.5" strokeLinecap="round" opacity={op}/>
      </svg>
    ),
  }
  return icons[id] ?? null
}

export function AppSidebar() {
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

      {/* Nav items */}
      <nav style={{ padding: '8px 10px', flex: 1 }}>
        {NAV.map(item => {
          const active = isActive(item)
          return (
            <NavLink
              key={item.id}
              to={item.path}
              style={{ textDecoration: 'none' }}
            >
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
                  <NavIcon id={item.id} active={active} />
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

      {/* Footer: Sign Out + User profile */}
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

        {/* User profile */}
        <div style={{ padding: '8px 10px 16px' }}>
          <NavLink to={ROUTES.PROFILE} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: radius.sm, background: 'rgba(74,173,223,0.08)', cursor: 'pointer', transition: 'background 0.14s' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.blue500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: font.family }}>{MOCK_USER.name.split(' ').map(n => n[0]).join('')}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: font.family }}>{MOCK_USER.name}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: font.family }}>
                  <img src="https://flagcdn.com/w20/zw.png" srcSet="https://flagcdn.com/w40/zw.png 2x" alt="Zimbabwe" style={{ height: '12px', width: 'auto', borderRadius: '2px' }} />
                  <span>Patient Account</span>
                </div>
              </div>
            </div>
          </NavLink>
        </div>
      </div>
    </div>
  )
}
