import type { ReactElement } from 'react'
import { NavLink } from 'react-router-dom'
import { ROUTES, LOGO } from '@/router/routes'
import { font, radius } from '@/design-system/tokens'

const ACCENT = '#F5A623'

const ADMIN_NAV = [
  { id: 'admin-dashboard',    label: 'Dashboard',       path: ROUTES.ADMIN_DASHBOARD },
  { id: 'admin-sp-apps',      label: 'SP Applications', path: ROUTES.ADMIN_APPLICATIONS },
  { id: 'admin-disputes',     label: 'Disputes',        path: ROUTES.ADMIN_DISPUTES },
  { id: 'admin-invoices',     label: 'Invoice Review',  path: ROUTES.ADMIN_INVOICES },
]

function AdminNavIcon({ id, active }: { id: string; active: boolean }) {
  const col = active ? ACCENT : 'rgba(255,255,255,0.55)'
  const icons: Record<string, ReactElement> = {
    'admin-dashboard': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill={col}/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill={col}/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill={col}/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill={col}/></svg>,
    'admin-sp-apps': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="1.5" width="12" height="12" rx="2" stroke={col} strokeWidth="1.3"/><path d="M5 7.5h5M7.5 5v5" stroke={col} strokeWidth="1.3" strokeLinecap="round"/></svg>,
    'admin-disputes': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke={col} strokeWidth="1.3"/><path d="M7.5 4.5v3.5M7.5 10.5v.5" stroke={col} strokeWidth="1.5" strokeLinecap="round"/></svg>,
    'admin-invoices': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="1" width="11" height="13" rx="1.5" stroke={col} strokeWidth="1.3"/><path d="M5 5h5M5 8h5M5 11h3" stroke={col} strokeWidth="1.1" strokeLinecap="round"/></svg>,
  }
  return icons[id] ?? null
}

export function AdminSidebar() {
  return (
    <div style={{
      width: 210,
      minHeight: '100vh',
      background: '#0A1628',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      boxShadow: '4px 0 24px rgba(8,21,40,0.3)',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <img src={LOGO} alt="GG'APP" width={72} height={72} style={{ borderRadius: '12px', objectFit: 'contain' }} />
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: font.family }}>Admin Console</div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        {ADMIN_NAV.map(item => (
          <NavLink key={item.id} to={item.path} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: radius.sm,
                marginBottom: '2px',
                background: isActive ? 'rgba(245,166,35,0.12)' : 'transparent',
                color: isActive ? ACCENT : 'rgba(255,255,255,0.70)',
                fontSize: '14px',
                fontWeight: isActive ? 700 : 500,
                fontFamily: font.family,
                cursor: 'pointer',
                transition: 'all 0.14s ease',
              }}>
                <span style={{ flexShrink: 0 }}><AdminNavIcon id={item.id} active={isActive} /></span>
                {item.label}
                {isActive && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: ACCENT }} />}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontFamily: font.family, textAlign: 'center' }}>
          Admin Console
        </div>
      </div>
    </div>
  )
}
