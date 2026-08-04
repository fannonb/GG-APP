import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useMarkPatientNotificationReadMutation, usePatientNotifications } from '@/hooks/api'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useNotificationsStore } from '@/store/notifications.store'
import type { Notification, NotificationType } from '@/types/user.types'
import { formatRelativeTime } from '@/utils/format'
import { resolvePatientNotificationRoute } from './notification-routing'

type TypeConfig = { color: string; bg: string; icon: React.ReactNode }

const TYPE_CONFIG: Record<NotificationType, TypeConfig> = {
  payment: { color: C.success, bg: C.successBg, icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3.5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6.5h14" stroke="currentColor" strokeWidth="1.2"/><circle cx="11.5" cy="9.5" r="1.3" fill="currentColor"/></svg> },
  invoice: { color: C.warning, bg: C.warningBg, icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg> },
  appointment: { color: C.blue500, bg: C.blue100, icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="2.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6h14" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="10" r="1.5" fill="currentColor"/></svg> },
  credit: { color: C.blue500, bg: C.blue100, icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
  prescription: { color: C.blue500, bg: C.blue100, icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="2" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><line x1="8" y1="5" x2="8" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
  system: { color: C.textSub, bg: C.bg, icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 7v5M8 5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
}

const FILTERS = [
  ['all', 'All'],
  ['unread', 'Unread'],
  ['appointment', 'Appointments'],
  ['payment', 'Payments'],
  ['invoice', 'Invoices'],
  ['credit', 'Credit'],
] as const

export function NotificationsScreen() {
  const navigate = useNavigate()
  const { data: fetchedNotifications = [], isLoading } = usePatientNotifications()
  const markNotificationRead = useMarkPatientNotificationReadMutation()
  const patientNotifications = useNotificationsStore(s => s.patientNotifs)
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('all')

  const notifications: Notification[] =
    patientNotifications.length > 0 ? patientNotifications : fetchedNotifications

  const unreadCount = notifications.filter(notification => !notification.read).length
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications
    if (filter === 'unread') return notifications.filter(notification => !notification.read)
    return notifications.filter(notification => notification.type === filter)
  }, [filter, notifications])

  const handleMarkAllRead = async () => {
    const unreadNotifications = notifications.filter(notification => !notification.read)
    await Promise.all(
      unreadNotifications.map(notification => markNotificationRead.mutateAsync(notification.id)),
    )
  }

  const handleOpenNotification = (notification: Notification) => {
    if (!notification.read) {
      markNotificationRead.mutate(notification.id)
    }
    navigate(resolvePatientNotificationRoute(notification))
  }

  return (
    <AppLayout
      title="Notifications"
      subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
      notifCount={unreadCount}
    >
      <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: font.family }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {FILTERS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: radius.full,
                  border: `1.5px solid ${filter === value ? C.blue500 : C.border}`,
                  background: filter === value ? C.blue100 : '#fff',
                  color: filter === value ? C.blue500 : C.textSub,
                  fontSize: '12px',
                  fontWeight: filter === value ? 700 : 500,
                  cursor: 'pointer',
                  fontFamily: font.family,
                  transition: 'all 0.13s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => { void handleMarkAllRead() }}
              style={{ background: 'none', border: 'none', fontSize: '13px', color: C.blue500, fontWeight: 600, cursor: 'pointer', fontFamily: font.family }}
            >
              Mark all read
            </button>
          )}
        </div>

        {isLoading && notifications.length === 0 ? (
          <GGCard padding="48px" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Loading notifications...</div>
            <div style={{ fontSize: '13px', color: C.textSub, marginTop: '4px' }}>Syncing your latest patient activity from the shared backend.</div>
          </GGCard>
        ) : filteredNotifications.length === 0 ? (
          <GGCard padding="48px" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>Bell</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>No notifications here</div>
            <div style={{ fontSize: '13px', color: C.textSub, marginTop: '4px' }}>You're all caught up!</div>
          </GGCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredNotifications.map(notification => {
              const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.system
              return (
                <div
                  key={notification.id}
                  onClick={() => handleOpenNotification(notification)}
                  style={{
                    display: 'flex',
                    gap: '14px',
                    padding: '16px 18px',
                    background: notification.read ? '#fff' : C.blue100,
                    borderRadius: radius.lg,
                    border: `1.5px solid ${notification.read ? C.border : 'rgba(74,173,223,0.3)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.14s',
                    position: 'relative',
                  }}
                  onMouseEnter={event => { event.currentTarget.style.borderColor = C.blue500 }}
                  onMouseLeave={event => { event.currentTarget.style.borderColor = notification.read ? C.border : 'rgba(74,173,223,0.3)' }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: '12px', background: config.bg, color: config.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {config.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: notification.read ? 600 : 700, color: C.text }}>
                        {notification.title}
                      </div>
                      <div style={{ fontSize: '11px', color: C.textSub, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {formatRelativeTime(notification.time)}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.5, marginTop: '3px' }}>
                      {notification.body}
                    </div>
                  </div>
                  {!notification.read && (
                    <div style={{ position: 'absolute', top: 16, right: 16, width: 8, height: 8, borderRadius: '50%', background: C.blue500 }} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
