import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { ROUTES, LOGO } from '@/router/routes'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { useNotificationsStore } from '@/store/notifications.store'
import { NotificationPanel } from '@/components/NotificationPanel'
import { AppSidebar } from './AppSidebar'
import { AppTopBar } from './AppTopBar'

interface AppLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  notifCount?: number
  back?: boolean
  backLabel?: string
}

// Minimal bottom nav for mobile
const BOTTOM_NAV = [
  { id: 'dashboard',    label: 'Home',       path: ROUTES.DASHBOARD,     icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill={a ? C.blue500 : C.textSub}/><rect x="9" y="1" width="6" height="6" rx="1.5" fill={a ? C.blue500 : C.textSub}/><rect x="1" y="9" width="6" height="6" rx="1.5" fill={a ? C.blue500 : C.textSub}/><rect x="9" y="9" width="6" height="6" rx="1.5" fill={a ? C.blue500 : C.textSub}/></svg> },
  { id: 'services',     label: 'Services',   path: ROUTES.FIND_SERVICE,      icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5"/><line x1="11" y1="11" x2="14.5" y2="14.5" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { id: 'credit',       label: 'Credit',     path: ROUTES.CREDIT_WALLET,        icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="9" rx="2" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5"/><path d="M1 7h14" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5"/></svg> },
  { id: 'invoices',     label: 'Invoices',   path: ROUTES.INVOICE_LIST,      icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="14" rx="2" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5"/><line x1="5.5" y1="5" x2="10.5" y2="5" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3" strokeLinecap="round"/><line x1="5.5" y1="8" x2="10.5" y2="8" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3" strokeLinecap="round"/></svg> },
  { id: 'profile',      label: 'Profile',    path: ROUTES.PROFILE,       icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5" strokeLinecap="round"/></svg> },
]

export function AppLayout({ children, title, subtitle, back = false, backLabel }: AppLayoutProps) {
  const { isDesktop } = useResponsive()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { patientNotifs, openPanel } = useNotificationsStore()
  const unreadCount = patientNotifs.filter(n => !n.read).length

  if (isDesktop) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.bg }}>
        <AppSidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppTopBar title={title} subtitle={subtitle} back={back} backLabel={backLabel} />
          <main style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
            {children}
          </main>
        </div>
      </div>
    )
  }

  // Mobile/tablet layout
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>
      {/* Mobile top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: C.navy800,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        {back ? (
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        ) : (
          <button onClick={() => setMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: font.family }}>{title}</div>
          {subtitle && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: font.family }}>{subtitle}</div>}
        </div>
        <button onClick={openPanel} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '4px' }}>
          <svg width="20" height="20" viewBox="0 0 18 18" fill="none"><path d="M9 2a5.5 5.5 0 00-5.5 5.5c0 2.5-.8 4-1.5 5h14c-.7-1-1.5-2.5-1.5-5A5.5 5.5 0 009 2z" stroke="currentColor" strokeWidth="1.4"/><path d="M7 14.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4"/></svg>
          {unreadCount > 0 && <span style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: C.error }} />}
        </button>
      </div>

      {/* Slide-out drawer */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(8,21,40,0.55)' }} />
          <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 260, zIndex: 50, background: C.navy800, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
              <img src={LOGO} alt="GG'APP" width={80} height={80} style={{ borderRadius: radius.lg }} />
            </div>
            <nav style={{ padding: '8px 10px', flex: 1 }}>
              {BOTTOM_NAV.map(item => (
                <NavLink key={item.id} to={item.path} style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                  {({ isActive }) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: radius.sm, marginBottom: '2px', background: isActive ? 'rgba(74,173,223,0.15)' : 'transparent', color: isActive ? C.blue500 : 'rgba(255,255,255,0.90)', fontSize: '14px', fontWeight: isActive ? 700 : 500, fontFamily: font.family }}>
                      {item.icon(isActive)}
                      {item.label}
                    </div>
                  )}
                </NavLink>
              ))}
            </nav>
            <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '10px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', fontFamily: font.family }}>
              GG'APP v1.0
            </div>
          </div>
        </>
      )}

      <main style={{ flex: 1, padding: '16px', paddingBottom: '72px' }}>
        {children}
      </main>

      <NotificationPanel role="patient" />

      {/* Bottom tab bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        background: '#fff',
        borderTop: `1px solid ${C.border}`,
        display: 'flex',
        boxShadow: '0 -4px 16px rgba(13,30,66,0.08)',
      }}>
        {BOTTOM_NAV.map(item => (
          <NavLink key={item.id} to={item.path} style={{ flex: 1, textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '8px 4px', color: isActive ? C.blue500 : C.textSub }}>
                {item.icon(isActive)}
                <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500, fontFamily: font.family }}>{item.label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
