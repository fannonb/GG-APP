import { useNavigate } from 'react-router-dom'
import { C, font, shadow } from '@/design-system/tokens'
import { useNotificationsStore } from '@/store/notifications.store'
import { NotificationPanel } from '@/components/NotificationPanel'

interface AppTopBarProps {
  title: string
  subtitle?: string
  notifCount?: number
  back?: boolean
  backLabel?: string
}

export function AppTopBar({ title, subtitle, back = false, backLabel = 'Back' }: AppTopBarProps) {
  const navigate = useNavigate()
  const { patientNotifs, openPanel } = useNotificationsStore()
  const unreadCount = patientNotifs.filter(n => !n.read).length

  return (
    <>
      <div style={{
        background: '#fff',
        borderBottom: `1px solid ${C.border}`,
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: shadow.sm,
      }}>
        {back && (
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: C.textSub,
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: font.family,
              padding: '6px 12px 6px 8px',
              borderRadius: '8px',
              transition: 'background 0.13s',
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {backLabel}
          </button>
        )}

        {/* Title + subtitle */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, fontFamily: font.family, letterSpacing: '-0.03em' }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family, marginTop: '2px' }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* Search bar */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: '10px', padding: '9px 14px', marginLeft: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="7" cy="7" r="4.5" stroke={C.textSub} strokeWidth="1.4"/>
            <line x1="10.5" y1="10.5" x2="13.5" y2="13.5" stroke={C.textSub} strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search..."
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: C.text, fontFamily: font.family }}
          />
        </div>

        {/* Notification bell */}
        <button
          onClick={openPanel}
          style={{
            position: 'relative',
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: C.textSub,
            transition: 'all 0.13s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.blue100; e.currentTarget.style.color = C.blue500 }}
          onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.textSub }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2a5.5 5.5 0 00-5.5 5.5c0 2.5-.8 4-1.5 5h14c-.7-1-1.5-2.5-1.5-5A5.5 5.5 0 009 2z" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M7 14.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -4, right: -4,
              background: C.error,
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: font.family,
              width: 18, height: 18,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      <NotificationPanel role="patient" />
    </>
  )
}
