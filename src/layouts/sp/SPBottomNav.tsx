import { NavLink } from 'react-router-dom'
import { C, font } from '@/design-system/tokens'

const SP_TABS = [
  { id: 'sp-dashboard',    label: 'Home',     path: '/sp/dashboard',    icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill={a ? C.blue500 : C.textSub}/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill={a ? C.blue500 : C.textSub}/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill={a ? C.blue500 : C.textSub}/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill={a ? C.blue500 : C.textSub}/></svg> },
  { id: 'sp-appointments', label: 'Appts',    path: '/sp/appointments', icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 15 15" fill="none"><rect x="1" y="2.5" width="13" height="11" rx="1.5" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3"/><path d="M1 6h13" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3"/><circle cx="7.5" cy="9.5" r="1.5" fill={a ? C.blue500 : C.textSub}/></svg> },
  { id: 'sp-patients',     label: 'Patients', path: '/sp/patients',     icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 15 15" fill="none"><circle cx="5.5" cy="4.5" r="2.5" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3"/><path d="M1 13c0-2.5 2-4.5 4.5-4.5S10 10.5 10 13" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3" strokeLinecap="round"/></svg> },
  { id: 'sp-invoice',      label: 'Invoices', path: '/sp/invoices',     icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 15 15" fill="none"><rect x="2" y="1" width="11" height="13" rx="1.5" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3"/><path d="M5 5h5M5 8h5M5 11h3" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.1" strokeLinecap="round"/></svg> },
  { id: 'sp-settings',     label: 'Settings', path: '/sp/settings',     icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3"/><path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3" strokeLinecap="round"/></svg> },
]

export function SPBottomNav() {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
      background: '#fff',
      borderTop: `1px solid ${C.border}`,
      display: 'flex',
      boxShadow: '0 -4px 16px rgba(13,30,66,0.08)',
    }}>
      {SP_TABS.map(tab => (
        <NavLink key={tab.id} to={tab.path} style={{ flex: 1, textDecoration: 'none' }}>
          {({ isActive }) => (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '8px 4px', color: isActive ? C.blue500 : C.textSub }}>
              {tab.icon(isActive)}
              <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500, fontFamily: font.family }}>{tab.label}</span>
            </div>
          )}
        </NavLink>
      ))}
    </div>
  )
}
