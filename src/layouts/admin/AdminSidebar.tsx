import type { ReactElement } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { ROUTES, LOGO } from '@/router/routes'
import { C, font, radius } from '@/design-system/tokens'
import { useLogoutMutation } from '@/hooks/api'

const DIVIDER = 'rgba(255,255,255,0.07)'

interface NavItem {
  id: string
  label: string
  path: string
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'admin-dashboard', label: 'Dashboard',       path: ROUTES.ADMIN_DASHBOARD },
  { id: 'admin-sp-apps',   label: 'SP Applications', path: ROUTES.ADMIN_APPLICATIONS },
  { id: 'admin-credit-apps', label: 'Credit Applications', path: ROUTES.ADMIN_CREDIT_APPLICATIONS },
]

const MANAGEMENT_NAV: NavItem[] = [
  { id: 'admin-users',     label: 'Users',     path: ROUTES.ADMIN_USERS },
  { id: 'admin-providers', label: 'Providers', path: ROUTES.ADMIN_PROVIDERS },
  { id: 'admin-payments',  label: 'Payments',  path: ROUTES.ADMIN_PAYMENTS },
  { id: 'admin-ledger',    label: 'Ledger Access', path: ROUTES.ADMIN_LEDGER_ACCESS },
  { id: 'admin-analytics', label: 'Analytics', path: ROUTES.ADMIN_ANALYTICS },
  { id: 'admin-news',      label: 'News',      path: ROUTES.ADMIN_NEWS },
  { id: 'admin-ads',       label: 'Ads',       path: ROUTES.ADMIN_ADS },
]

function AdminNavIcon({ id, active }: { id: string; active: boolean }) {
  const col = active ? C.blue500 : 'rgba(255,255,255,0.65)'
  const icons: Record<string, ReactElement> = {
    'admin-dashboard': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill={col}/>
        <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill={col}/>
        <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill={col}/>
        <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill={col}/>
      </svg>
    ),
    'admin-sp-apps': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1.5" y="1.5" width="12" height="12" rx="2" stroke={col} strokeWidth="1.3"/>
        <path d="M5 7.5h5M7.5 5v5" stroke={col} strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    'admin-credit-apps': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1.5" y="2.5" width="12" height="10" rx="1.8" stroke={col} strokeWidth="1.3"/>
        <path d="M1.5 5.5h12" stroke={col} strokeWidth="1.1"/>
        <path d="M4 8.5h4" stroke={col} strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    'admin-users': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="5" r="3" stroke={col} strokeWidth="1.3"/>
        <path d="M2 13c0-2.76 2.46-5 5.5-5s5.5 2.24 5.5 5" stroke={col} strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    'admin-providers': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 13V6l5.5-4L13 6v7" stroke={col} strokeWidth="1.3" strokeLinejoin="round"/>
        <rect x="5.5" y="9" width="4" height="4" rx="0.5" stroke={col} strokeWidth="1.1"/>
      </svg>
    ),
    'admin-payments': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1.5" y="3.5" width="12" height="8" rx="1.5" stroke={col} strokeWidth="1.3"/>
        <path d="M1.5 6.5h12" stroke={col} strokeWidth="1.1"/>
        <path d="M4 9.5h2M9 9.5h2" stroke={col} strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
    'admin-ledger': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="2" y="1.5" width="11" height="12" rx="1.8" stroke={col} strokeWidth="1.3"/>
        <path d="M7.5 5v3M6 6.5h3" stroke={col} strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M5 10.5h5" stroke={col} strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    'admin-analytics': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 12l3.5-4 3 2.5 4.5-6" stroke={col} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="2" cy="12" r="1" fill={col}/>
        <circle cx="5.5" cy="8" r="1" fill={col}/>
        <circle cx="8.5" cy="10.5" r="1" fill={col}/>
        <circle cx="13" cy="4.5" r="1" fill={col}/>
      </svg>
    ),
    'admin-news': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1.5" y="2" width="12" height="11" rx="1.5" stroke={col} strokeWidth="1.3"/>
        <path d="M4 5.5h7M4 8h7M4 10.5h4" stroke={col} strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
    'admin-ads': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M1.5 5.5h4.5l3.5-3v9l-3.5-3H1.5a1 1 0 01-1-1v-2a1 1 0 011-1z" stroke={col} strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M9.5 5.5a2.5 2.5 0 010 4" stroke={col} strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M11.5 3.5a5 5 0 010 8" stroke={col} strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  }
  return icons[id] ?? null
}

function NavSection({ items, label, compact, pendingCreditCount = 0 }: { items: NavItem[]; label?: string; compact?: boolean; pendingCreditCount?: number }) {
  return (
    <div>
      {label && !compact && (
        <div style={{ padding: '8px 14px 4px', fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: font.family }}>
          {label}
        </div>
      )}
      {items.map(item => (
        <NavLink key={item.id} to={item.path} style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: radius.sm,
                marginBottom: '2px',
                background: isActive ? 'rgba(56,182,255,0.15)' : 'transparent',
                color: isActive ? C.blue500 : 'rgba(255,255,255,0.90)',
                fontSize: '14px',
                fontWeight: isActive ? 700 : 500,
                fontFamily: font.family,
                cursor: 'pointer',
                transition: 'all 0.14s ease',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ flexShrink: 0 }}><AdminNavIcon id={item.id} active={isActive} /></span>
              {item.label}
              {item.id === 'admin-credit-apps' && pendingCreditCount > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: radius.full,
                  background: '#7C3AED',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {pendingCreditCount > 9 ? '9+' : pendingCreditCount}
                </span>
              )}
              {isActive && item.id !== 'admin-credit-apps' && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: C.blue500 }} />}
              {isActive && item.id === 'admin-credit-apps' && pendingCreditCount === 0 && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: C.blue500 }} />}
            </div>
          )}
        </NavLink>
      ))}
    </div>
  )
}

interface AdminSidebarProps {
  onClose?: () => void
  pendingCreditCount?: number
}

export function AdminSidebar({ onClose, pendingCreditCount = 0 }: AdminSidebarProps) {
  const navigate = useNavigate()
  const logoutMutation = useLogoutMutation()

  const handleLogout = () => {
    logoutMutation.mutate()
    onClose?.()
  }

  return (
    <div style={{
      width: 210,
      height: '100%',
      minHeight: '100vh',
      background: C.navy800,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      boxShadow: '4px 0 24px rgba(13,30,66,0.14)',
    }}>
      {/* Logo — same treatment as patient/SP */}
      <div style={{
        padding: '12px 18px',
        borderBottom: `1px solid ${DIVIDER}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        position: 'relative',
      }}>
        <img src={LOGO} alt="GG'APP" style={{ width: 102, height: 102, objectFit: 'contain' }} />
        {!onClose && (
          <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: font.family }}>
            Admin Console
          </div>
        )}
        {onClose && (
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Sign out — visible in mobile header */}
            <button
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              title="Sign Out"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: radius.sm, cursor: 'pointer', color: 'rgba(255,255,255,0.55)', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M10 11l3-3-3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
            {/* Close drawer */}
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: radius.sm, cursor: 'pointer', color: 'rgba(255,255,255,0.55)', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ padding: '8px 10px', flex: 1, overflowY: 'auto' }}>
        <NavSection items={PRIMARY_NAV} label="Operations" compact={!!onClose} pendingCreditCount={pendingCreditCount} />
        <div style={{ height: 1, background: DIVIDER, margin: '10px 4px' }} />
        <NavSection items={MANAGEMENT_NAV} label="Management" compact={!!onClose} />
      </nav>

      {/* Footer: sign out + admin identity card */}
      <div style={{ borderTop: `1px solid ${DIVIDER}` }}>
        <div style={{ padding: '4px 10px 0' }}>
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: '11px 14px',
              borderRadius: radius.sm, border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.38)',
              fontSize: '13px', fontWeight: 500,
              fontFamily: font.family, cursor: logoutMutation.isPending ? 'not-allowed' : 'pointer',
              transition: 'color 0.14s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.38)')}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M10 11l3-3-3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            {logoutMutation.isPending ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>

        <div style={{ margin: '0 10px', height: '1px', background: DIVIDER }} />

        {/* Admin identity card */}
        <div style={{ padding: '8px 10px 16px' }}>
          <div
            onClick={() => navigate(ROUTES.ADMIN_DASHBOARD)}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: radius.sm, background: 'rgba(56,182,255,0.08)', cursor: 'pointer', transition: 'background 0.14s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56,182,255,0.14)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(56,182,255,0.08)')}
          >
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.blue500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z" fill="white"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: font.family }}>GG'APP Admin</div>
              {!onClose && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: font.family }}>Administrator</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
