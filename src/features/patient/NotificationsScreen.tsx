import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { formatRelativeTime } from '@/utils/format'
import { MOCK_NOTIFICATIONS } from '@/mock/patient.mock'
import type { NotificationType, Notification } from '@/types/user.types'

type TypeConfig = { color: string; bg: string; icon: React.ReactNode }

const TYPE_CONFIG: Record<NotificationType, TypeConfig> = {
  payment:     { color: C.success, bg: C.successBg, icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3.5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6.5h14" stroke="currentColor" strokeWidth="1.2"/><circle cx="11.5" cy="9.5" r="1.3" fill="currentColor"/></svg> },
  invoice:     { color: C.warning, bg: C.warningBg, icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg> },
  appointment: { color: C.blue500, bg: C.blue100,   icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="2.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6h14" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="10" r="1.5" fill="currentColor"/></svg> },
  credit:      { color: C.blue500, bg: C.blue100,   icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
  system:      { color: C.textSub, bg: C.bg,        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 7v5M8 5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
}

const SCREEN_MAP: Record<string, string> = {
  'transaction-history': '/app/transactions',
  'invoice-review':      '/app/invoices/INV-2026-0842',
  'find-service':        '/app/services',
  'credit-wallet':       '/app/credit',
  'profile':             '/app/profile',
}

export function NotificationsScreen() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [notifs, setNotifs] = useState<Notification[]>(MOCK_NOTIFICATIONS)

  const markAllRead  = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  const markRead     = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  const unreadCount  = notifs.filter(n => !n.read).length

  const filtered = filter === 'all'    ? notifs
    : filter === 'unread' ? notifs.filter(n => !n.read)
    : notifs.filter(n => n.type === filter)

  return (
    <AppLayout title="Notifications" subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'} notifCount={unreadCount}>
      <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: font.family }}>

        {/* Filter + mark all read */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[['all','All'],['unread','Unread'],['appointment','Appointments'],['payment','Payments'],['invoice','Invoices'],['credit','Credit']].map(([val, lbl]) => (
              <button key={val} onClick={() => setFilter(val)}
                style={{ padding: '6px 14px', borderRadius: radius.full, border: `1.5px solid ${filter === val ? C.blue500 : C.border}`, background: filter === val ? C.blue100 : '#fff', color: filter === val ? C.blue500 : C.textSub, fontSize: '12px', fontWeight: filter === val ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.13s' }}>
                {lbl}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ background: 'none', border: 'none', fontSize: '13px', color: C.blue500, fontWeight: 600, cursor: 'pointer', fontFamily: font.family }}>
              Mark all read
            </button>
          )}
        </div>

        {/* Notification list */}
        {filtered.length === 0 ? (
          <GGCard padding="48px" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔔</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>No notifications here</div>
            <div style={{ fontSize: '13px', color: C.textSub, marginTop: '4px' }}>You're all caught up!</div>
          </GGCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(n => {
              const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system
              return (
                <div key={n.id}
                  onClick={() => { markRead(n.id); navigate(SCREEN_MAP[n.screen] ?? '/app/dashboard') }}
                  style={{ display: 'flex', gap: '14px', padding: '16px 18px', background: n.read ? '#fff' : C.blue100, borderRadius: radius.lg, border: `1.5px solid ${n.read ? C.border : 'rgba(74,173,223,0.3)'}`, cursor: 'pointer', transition: 'all 0.14s', position: 'relative' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = C.blue500)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = n.read ? C.border : 'rgba(74,173,223,0.3)')}
                >
                  <div style={{ width: 40, height: 40, borderRadius: '12px', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: n.read ? 600 : 700, color: C.text }}>{n.title}</div>
                      <div style={{ fontSize: '11px', color: C.textSub, whiteSpace: 'nowrap', flexShrink: 0 }}>{formatRelativeTime(n.time)}</div>
                    </div>
                    <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.5, marginTop: '3px' }}>{n.body}</div>
                  </div>
                  {!n.read && <div style={{ position: 'absolute', top: 16, right: 16, width: 8, height: 8, borderRadius: '50%', background: C.blue500 }} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
