import { useEffect, useRef, useState, type ReactElement } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ROUTES, LOGO_WORDMARK } from '@/router/routes'
import { C, font } from '@/design-system/tokens'
import { useLogoutMutation } from '@/hooks/api'

const DIVIDER = 'rgba(255,255,255,0.08)'

interface NavItem {
  id: string
  label: string
  path: string
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'admin-dashboard', label: 'Overview',        path: ROUTES.ADMIN_DASHBOARD },
  { id: 'admin-sp-apps',   label: 'SP Applications', path: ROUTES.ADMIN_APPLICATIONS },
  { id: 'admin-credit-apps', label: 'Credit Applications', path: ROUTES.ADMIN_CREDIT_APPLICATIONS },
  { id: 'admin-email-changes', label: 'Email changes', path: ROUTES.ADMIN_EMAIL_CHANGES },
]

const INSIGHTS_NAV: NavItem[] = [
  { id: 'admin-financials',     label: 'Money',                path: ROUTES.ADMIN_INSIGHTS_MONEY },
  { id: 'admin-demographics',   label: 'Patients & credit',    path: ROUTES.ADMIN_INSIGHTS_PATIENTS },
  { id: 'admin-analytics',      label: 'Care activity',        path: ROUTES.ADMIN_INSIGHTS_CARE },
  { id: 'admin-provider-performance', label: 'Provider performance', path: ROUTES.ADMIN_INSIGHTS_PROVIDERS },
  { id: 'admin-disease-burden', label: 'Health insights',      path: ROUTES.ADMIN_INSIGHTS_HEALTH },
]

const MANAGEMENT_NAV: NavItem[] = [
  { id: 'admin-users',     label: 'Patients',  path: ROUTES.ADMIN_USERS },
  { id: 'admin-providers', label: 'Providers', path: ROUTES.ADMIN_PROVIDERS },
  { id: 'admin-payments',  label: 'Payments',  path: ROUTES.ADMIN_PAYMENTS },
  { id: 'admin-ledger',    label: 'Ledger Access', path: ROUTES.ADMIN_LEDGER_ACCESS },
  { id: 'admin-news',      label: 'News',      path: ROUTES.ADMIN_NEWS },
  { id: 'admin-ads',       label: 'Ads',       path: ROUTES.ADMIN_ADS },
]

function AdminNavIcon({ id, active }: { id: string; active: boolean }) {
  const col = active ? C.navy800 : 'rgba(255,255,255,0.75)'
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
    'admin-disease-burden': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M1.5 7.5h3l1.5-4 3 8 2-5h2.5" stroke={col} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    'admin-demographics': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="5" cy="5" r="2.5" stroke={col} strokeWidth="1.2"/>
        <circle cx="10.5" cy="5" r="2" stroke={col} strokeWidth="1.2"/>
        <path d="M1.5 13c0-2.2 1.8-4 4-4s4 1.8 4 4M9 9.5c1.8 0 3.5 1.2 3.5 3.5" stroke={col} strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    'admin-financials': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1.5" y="2.5" width="12" height="10" rx="1.5" stroke={col} strokeWidth="1.2"/>
        <path d="M4.5 7.5h6M7.5 5v5" stroke={col} strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    'admin-consumer-health': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M7.5 13.5l-5-5a3.5 3.5 0 015-5l0 0a3.5 3.5 0 015 5l-5 5z" stroke={col} strokeWidth="1.2" strokeLinejoin="round"/>
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
  // Provider performance shares the providers icon.
  return icons[id] ?? (id === 'admin-provider-performance' ? icons['admin-providers'] : id === 'admin-email-changes' ? icons['admin-users'] : null) ?? null
}

function NavSection({ items, label, compact, pendingCreditCount = 0 }: { items: NavItem[]; label?: string; compact?: boolean; pendingCreditCount?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
      {label && !compact && (
        <div style={{ padding: '6px 12px 4px', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: font.family }}>
          {label}
        </div>
      )}
      {items.map(item => (
        <NavLink key={item.id} to={item.path} style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <div
              data-active={isActive || undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                borderRadius: '12px',
                background: isActive ? '#FFFFFF' : 'transparent',
                color: isActive ? C.navy800 : 'rgba(255,255,255,0.72)',
                fontSize: '13.5px',
                fontWeight: isActive ? 700 : 500,
                fontFamily: font.family,
                cursor: 'pointer',
                boxShadow: isActive ? '0 4px 14px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.color = '#FFFFFF'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.72)'
                }
              }}
            >
              <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}><AdminNavIcon id={item.id} active={isActive} /></span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
              {item.id === 'admin-credit-apps' && pendingCreditCount > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: '9999px',
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
  const { pathname } = useLocation()
  const logoutMutation = useLogoutMutation()
  const navRef = useRef<HTMLElement>(null)
  const [moreBelow, setMoreBelow] = useState(false)

  const handleLogout = () => {
    logoutMutation.mutate()
    onClose?.()
  }

  // Track whether items are hidden below, so the fade only shows when there is more to scroll to.
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const update = () => setMoreBelow(nav.scrollTop + nav.clientHeight < nav.scrollHeight - 4)
    const observer = new ResizeObserver(update)
    observer.observe(nav)
    nav.addEventListener('scroll', update, { passive: true })
    return () => { observer.disconnect(); nav.removeEventListener('scroll', update) }
  }, [])

  // Keep the current page visible, e.g. when landing on an Insights page on a short screen.
  useEffect(() => {
    navRef.current?.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' })
  }, [pathname])

  return (
    <div style={{
      width: 236,
      height: '100%',
      background: C.navy800,
      borderRadius: onClose ? '0' : '24px',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      padding: onClose ? '16px 12px' : '20px 14px 18px 14px',
      boxShadow: '0 12px 36px rgba(9, 28, 68, 0.16)',
      overflow: 'hidden',
    }}>
      {/* Brand Logo */}
      <div style={{
        padding: '4px 10px 12px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        <img src={LOGO_WORDMARK} alt="GG'APP" style={{ height: 30, width: 'auto', display: 'block', margin: '8px 0 4px' }} />

        {onClose && (
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: '6px', display: 'flex', alignItems: 'center' }}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Nav items */}
      {/* minHeight 0 lets the list shrink and scroll instead of being cropped by the sidebar. */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <nav ref={navRef} className="admin-nav-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px', paddingBottom: 12 }}>
          <NavSection items={PRIMARY_NAV} label="Operations" compact={!!onClose} pendingCreditCount={pendingCreditCount} />
          <div style={{ height: 1, background: DIVIDER, margin: '4px', flexShrink: 0 }} />
          <NavSection items={MANAGEMENT_NAV} label="Manage" compact={!!onClose} />
          <div style={{ height: 1, background: DIVIDER, margin: '4px', flexShrink: 0 }} />
          <NavSection items={INSIGHTS_NAV} label="Insights" compact={!!onClose} />
        </nav>
        {/* Fade hints that the list continues below; hidden once the end is reached. */}
        <div aria-hidden style={{ position: 'absolute', left: 0, right: 10, bottom: 0, height: 36, pointerEvents: 'none', background: `linear-gradient(to bottom, rgba(13,30,66,0), ${C.navy800})`, opacity: moreBelow ? 1 : 0, transition: 'opacity 0.15s' }} />
      </div>

      {/* Footer: admin identity with sign out alongside, in one row to leave room for the menu. */}
      <div style={{ borderTop: `1px solid ${DIVIDER}`, paddingTop: '10px', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div
          onClick={() => navigate(ROUTES.ADMIN_DASHBOARD)}
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', borderRadius: '12px', background: 'rgba(56,182,255,0.08)', cursor: 'pointer', transition: 'background 0.14s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56,182,255,0.14)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(56,182,255,0.08)')}
        >
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.blue500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
              <path d="M10 2l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z" fill="white"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: font.family }}>GG'APP Admin</div>
            <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.5)', fontFamily: font.family }}>Administrator</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          title="Sign out"
          aria-label="Sign out"
          style={{
            width: 44, height: 44, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '12px', border: 'none',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.7)',
            cursor: logoutMutation.isPending ? 'not-allowed' : 'pointer',
            opacity: logoutMutation.isPending ? 0.5 : 1,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.14)'
            e.currentTarget.style.color = '#F87171'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" x2="9" y1="12" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
