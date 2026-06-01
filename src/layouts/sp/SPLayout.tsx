import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/router/routes'
import { C, font, shadow } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { useNotificationsStore } from '@/store/notifications.store'
import { NotificationPanel } from '@/components/NotificationPanel'
import { SPSidebar } from './SPSidebar'
import { SPBottomNav } from './SPBottomNav'

interface SPLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  notifCount?: number
  back?: boolean
}

export function SPLayout({ children, title, subtitle, back = false }: SPLayoutProps) {
  const { isDesktop } = useResponsive()
  const navigate = useNavigate()
  const { spNotifs, openPanel } = useNotificationsStore()
  const unreadCount = spNotifs.filter(n => !n.read).length

  const topBar = (dark = false) => (
    <div style={{
      background: dark ? C.navy800 : '#fff',
      borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : C.border}`,
      padding: dark ? '12px 16px' : '16px 28px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      boxShadow: shadow.sm,
    }}>
      {back && (
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: dark ? 'rgba(255,255,255,0.8)' : C.textSub, padding: '4px', flexShrink: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: dark ? '15px' : '18px', fontWeight: 800, color: dark ? '#fff' : C.text, fontFamily: font.family, letterSpacing: '-0.03em' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: '12px', color: dark ? 'rgba(255,255,255,0.6)' : C.textSub, fontFamily: font.family, marginTop: '1px' }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Notification bell */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={openPanel}
          style={{
            background: dark ? 'rgba(255,255,255,0.08)' : C.bg,
            border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : C.border}`,
            borderRadius: '10px', width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            color: dark ? 'rgba(255,255,255,0.8)' : C.textSub,
            transition: 'all 0.13s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.15)' : C.blue100; e.currentTarget.style.color = dark ? '#fff' : C.blue500 }}
          onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : C.bg; e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.8)' : C.textSub }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2a5.5 5.5 0 00-5.5 5.5c0 2.5-.8 4-1.5 5h14c-.7-1-1.5-2.5-1.5-5A5.5 5.5 0 009 2z" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M7 14.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        </button>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            width: unreadCount > 9 ? 'auto' : 18,
            height: 18, minWidth: 18,
            padding: unreadCount > 9 ? '0 4px' : '0',
            borderRadius: '9px',
            background: C.error, color: '#fff',
            fontSize: '10px', fontWeight: 700, fontFamily: font.family,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      {/* Sign Out (Mobile only) */}
      {!isDesktop && (
        <button
          onClick={() => navigate(ROUTES.LOGIN)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px', width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.8)',
            transition: 'all 0.13s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M10 11l3-3-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  )

  if (isDesktop) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.bg }}>
        <SPSidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {topBar(false)}
          <main style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
            {children}
          </main>
        </div>
        <NotificationPanel role="sp" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>
      {topBar(true)}
      <main style={{ flex: 1, padding: '16px', paddingBottom: '72px' }}>
        {children}
      </main>
      <SPBottomNav />
      <NotificationPanel role="sp" />
    </div>
  )
}
