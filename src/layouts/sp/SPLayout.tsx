import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { useNotificationsStore } from '@/store/notifications.store'
import { useLogoutMutation, useSPNotifications } from '@/hooks/api'
import { NotificationPanel } from '@/components/NotificationPanel'
import { ROUTES } from '@/router/routes'
import { SPSidebar } from './SPSidebar'
import { SPTopBar } from './SPTopBar'
import { SPBottomNav } from './SPBottomNav'

interface SPLayoutProps {
  children: ReactNode
  title: string
  status?: string
  /** @deprecated Prefer `status` for actionable counts. Ignored in the top bar. */
  subtitle?: string
  notifCount?: number
  back?: boolean
}

export function SPLayout({ children, title, status, back = false }: SPLayoutProps) {
  const { isDesktop } = useResponsive()
  const navigate = useNavigate()
  const logoutMutation = useLogoutMutation()
  const { data: notifications } = useSPNotifications()
  const { spNotifs, openPanel } = useNotificationsStore()
  const unreadCount = spNotifs.filter(n => !n.read).length
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileSearchQuery, setMobileSearchQuery] = useState('')

  useEffect(() => {
    if (notifications) {
      useNotificationsStore.setState({ spNotifs: notifications })
    }
  }, [notifications])

  const handleSignOut = () => {
    logoutMutation.mutate()
  }

  const handleMobileSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = mobileSearchQuery.trim()
    if (!q) return
    setMobileSearchOpen(false)
    navigate(`${ROUTES.SP_INVOICES}?q=${encodeURIComponent(q)}`)
  }

  const topBar = (dark = false) => (
    <div style={{
      background: dark ? C.navy800 : '#fff',
      borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : C.border}`,
      padding: dark ? '10px 14px' : '16px 28px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minHeight: dark ? '58px' : 'auto',
      boxSizing: 'border-box',
      boxShadow: shadow.sm,
    }}>
      {mobileSearchOpen ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen(false)
              setMobileSearchQuery('')
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', padding: '6px', display: 'flex', alignItems: 'center' }}
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <form
            onSubmit={handleMobileSearchSubmit}
            style={{
              flex: 1,
              background: '#FFFFFF',
              borderRadius: '9999px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              autoFocus
              type="text"
              value={mobileSearchQuery}
              onChange={e => setMobileSearchQuery(e.target.value)}
              placeholder="Search invoices, appointments..."
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                color: C.navy800,
                width: '100%',
                fontFamily: font.family,
              }}
            />
            {mobileSearchQuery && (
              <button
                type="button"
                onClick={() => setMobileSearchQuery('')}
                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#94A3B8' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </form>
          <button
            type="button"
            onClick={handleMobileSearchSubmit}
            style={{
              background: C.blue500,
              border: 'none',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: radius.full,
              padding: '8px 14px',
              cursor: 'pointer',
              fontFamily: font.family,
              flexShrink: 0,
            }}
          >
            Search
          </button>
        </div>
      ) : (
        <>
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
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: dark ? '18px' : '22px', fontWeight: 800, color: dark ? '#fff' : C.text, fontFamily: font.family, letterSpacing: '-0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </div>
            {status && (
              <span style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                padding: dark ? '2px 8px' : '4px 10px',
                borderRadius: '9999px',
                background: dark ? 'rgba(56,182,255,0.18)' : C.blue100,
                color: dark ? C.blue300 : C.blue500,
                fontSize: dark ? '10px' : '11px',
                fontWeight: 700,
                fontFamily: font.family,
              }}>
                {status}
              </span>
            )}
          </div>

          {/* Mobile Search Button */}
          {!isDesktop && (
            <button
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Search"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.85)',
                flexShrink: 0,
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          )}

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
                borderRadius: '9999px',
                background: C.error, color: '#fff',
                fontSize: '10px', fontWeight: 700, fontFamily: font.family,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>

          {!isDesktop && (
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
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
        </>
      )}
    </div>
  )

  if (isDesktop) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: '#EEF4FB',
        padding: '16px 20px 16px 16px',
        gap: '20px',
        boxSizing: 'border-box',
      }}>
        <SPSidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%', overflow: 'hidden' }}>
          <SPTopBar title={title} status={status} back={back} />
          <main style={{ flex: 1, overflowY: 'auto', padding: '0 8px 24px 8px' }}>
            {children}
          </main>
        </div>
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
