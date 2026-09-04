import { useState } from 'react'
import type { ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, font, radius } from '@/design-system/tokens'
import { resolvePatientNotificationRoute } from '@/features/patient/notification-routing'
import { useMarkPatientNotificationReadMutation } from '@/hooks/api/usePatientMutations'
import { useNotificationsStore } from '@/store/notifications.store'
import type { Notification, NotificationType } from '@/types/user.types'
import { formatRelativeTime } from '@/utils/format'

interface Props {
  role: 'patient' | 'sp'
}

type IconFactory = () => ReactElement

const TYPE_ICON: Record<NotificationType, IconFactory> = {
  payment: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3.5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6.5h14" stroke="currentColor" strokeWidth="1.2"/><circle cx="11.5" cy="9.5" r="1.3" fill="currentColor"/></svg>,
  invoice: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  appointment: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="2.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6.5h14M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="8" cy="10" r="1.5" fill="currentColor"/></svg>,
  credit: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  system: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 7v4M8 5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  prescription: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="2" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><line x1="8" y1="5" x2="8" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  ledger: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3.5" y="7" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 7V5.2a2.5 2.5 0 015 0V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
}

const SP_SCREEN_MAP: Record<string, string> = {
  appointments: '/sp/appointments',
  invoices: '/sp/invoices',
  patients: '/sp/patients',
  payments: '/sp/payments',
  settings: '/sp/settings',
}

const TYPE_LABEL: Record<NotificationType, string> = {
  payment: 'Payment',
  invoice: 'Invoice',
  appointment: 'Appointment',
  credit: 'Balance',
  system: 'System',
  prescription: 'Prescription',
  ledger: 'Ledger',
}

function groupNotifications(notifications: Notification[]) {
  const sorted = [...notifications].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000
  const today: Notification[] = []
  const yesterday: Notification[] = []
  const earlier: Notification[] = []

  sorted.forEach(notification => {
    const time = new Date(notification.time).getTime()
    if (time >= todayStart) {
      today.push(notification)
    } else if (time >= yesterdayStart) {
      yesterday.push(notification)
    } else {
      earlier.push(notification)
    }
  })

  return [
    today.length > 0 ? { title: 'Today', items: today } : null,
    yesterday.length > 0 ? { title: 'Yesterday', items: yesterday } : null,
    earlier.length > 0 ? { title: 'Earlier', items: earlier } : null,
  ].filter(Boolean) as Array<{ title: string; items: Notification[] }>
}

export function NotificationPanel({ role }: Props) {
  const navigate = useNavigate()
  const {
    patientNotifs,
    spNotifs,
    panelOpen,
    closePanel,
    dismiss,
    markAllRead,
    markRead,
  } = useNotificationsStore()
  const markPatientNotificationRead = useMarkPatientNotificationReadMutation()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  if (!panelOpen) return null

  const notifications = role === 'patient' ? patientNotifs : spNotifs
  const unreadCount = notifications.filter(notification => !notification.read).length
  const filteredNotifications = filter === 'unread'
    ? notifications.filter(notification => !notification.read)
    : notifications
  const groupedNotifications = groupNotifications(filteredNotifications)

  const handleMarkAll = async () => {
    if (role === 'patient') {
      const unreadNotifications = patientNotifs.filter(notification => !notification.read)
      await Promise.all(
        unreadNotifications.map(notification => markPatientNotificationRead.mutateAsync(notification.id)),
      )
      return
    }

    markAllRead(role)
  }

  const handleNotificationClick = (notification: Notification) => {
    if (role === 'patient') {
      if (!notification.read) {
        markPatientNotificationRead.mutate(notification.id)
      }
      closePanel()
      navigate(resolvePatientNotificationRoute(notification))
      return
    }

    if (!notification.read) {
      markRead(notification.id, role)
    }
    closePanel()
    if (notification.screen.startsWith('/')) {
      navigate(notification.screen)
      return
    }
    const destination = SP_SCREEN_MAP[notification.screen]
    if (destination) navigate(destination)
  }

  const handleMarkSingle = (notification: Notification) => {
    if (role === 'patient') {
      markPatientNotificationRead.mutate(notification.id)
      return
    }
    markRead(notification.id, role)
  }

  return (
    <>
      <style>{`
        @keyframes slideInPanel {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeInBackdrop {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .notif-card {
          transition: all 0.2s ease;
        }
        .notif-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(13, 30, 66, 0.08);
          border-color: ${C.blue500};
        }
        .notif-actions {
          opacity: 0;
          max-height: 0;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        .notif-card:hover .notif-actions {
          opacity: 1;
          max-height: 24px;
          margin-top: 8px;
        }
      `}</style>

      <div
        onClick={closePanel}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(9, 28, 68, 0.4)',
          backdropFilter: 'blur(5px)',
          animation: 'fadeInBackdrop 0.25s ease forwards',
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(420px, 100vw)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          background: C.bg,
          boxShadow: '-8px 0 48px rgba(9, 28, 68, 0.15)',
          animation: 'slideInPanel 0.3s ease forwards',
          fontFamily: font.family,
        }}
      >
        <div style={{ background: '#fff', padding: '20px 20px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: C.text }}>Notifications</div>
                {unreadCount > 0 && (
                  <span style={{ background: C.blue500, color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: radius.full }}>
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: C.textSub, marginTop: '3px', fontWeight: 500 }}>
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {unreadCount > 0 && (
                <button
                  onClick={() => { void handleMarkAll() }}
                  style={{ background: 'none', border: 'none', padding: '6px 10px', color: C.blue500, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: font.family, borderRadius: '8px' }}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={closePanel}
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'transparent', border: 'none', color: C.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', background: 'rgba(9, 28, 68, 0.04)', borderRadius: '10px', padding: '3px' }}>
            {(['all', 'unread'] as const).map(value => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: filter === value ? '#fff' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: font.family,
                  fontSize: '12px',
                  fontWeight: filter === value ? 700 : 500,
                  color: filter === value ? C.navy800 : C.textSub,
                  boxShadow: filter === value ? '0 1px 4px rgba(13, 30, 66, 0.08)' : 'none',
                }}
              >
                {value === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {groupedNotifications.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff', border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3a7.5 7.5 0 00-7.5 7.5c0 3.5-1 5.5-2 7h19c-1-1.5-2-3.5-2-7A7.5 7.5 0 0012 3z" stroke={C.blue500} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.5 19.5a2.5 2.5 0 005 0" stroke={C.blue500} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>All clear!</div>
                <div style={{ fontSize: '13px', color: C.textLight, marginTop: '6px', lineHeight: 1.5 }}>
                  {filter === 'unread' ? "You've read all your notifications." : 'There are no notifications at the moment.'}
                </div>
              </div>
            </div>
          ) : (
            groupedNotifications.map(group => (
              <div key={group.title} style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', paddingLeft: '4px' }}>
                  {group.title}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {group.items.map(notification => {
                    const Icon = TYPE_ICON[notification.type] ?? TYPE_ICON.system
                    const accent = notification.read ? C.textSub : C.blue500
                    return (
                      <div
                        key={notification.id}
                        className="notif-card"
                        onClick={() => handleNotificationClick(notification)}
                        style={{
                          display: 'flex',
                          gap: '12px',
                          padding: '14px 16px',
                          borderRadius: radius.lg,
                          border: `1px solid ${notification.read ? C.border : 'rgba(56,182,255,0.4)'}`,
                          background: notification.read ? '#fff' : 'rgba(56,182,255,0.04)',
                          boxShadow: notification.read ? '0 1px 3px rgba(13,30,66,0.03)' : '0 2px 8px rgba(56,182,255,0.06)',
                          cursor: 'pointer',
                          position: 'relative',
                        }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: notification.read ? C.bg : 'rgba(56,182,255,0.15)', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                          <Icon />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '13px', fontWeight: notification.read ? 600 : 750, color: C.text, lineHeight: 1.35 }}>
                                {notification.title}
                              </span>
                              {!notification.read && (
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue500, display: 'inline-block' }} />
                              )}
                            </div>
                            <span style={{ fontSize: '10px', color: C.textLight, whiteSpace: 'nowrap', flexShrink: 0, marginTop: '2px' }}>
                              {formatRelativeTime(notification.time)}
                            </span>
                          </div>

                          <div style={{ fontSize: '9px', fontWeight: 800, color: C.textSub, background: C.bg, border: `1px solid ${C.border}`, padding: '1px 6px', borderRadius: radius.full, display: 'inline-block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {TYPE_LABEL[notification.type]}
                          </div>

                          <div style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.5 }}>
                            {notification.body}
                          </div>

                          <div className="notif-actions" style={{ display: 'flex', gap: '12px' }}>
                            {!notification.read && (
                              <button
                                onClick={event => {
                                  event.stopPropagation()
                                  handleMarkSingle(notification)
                                }}
                                style={{ background: 'none', border: 'none', padding: 0, fontSize: '11px', fontWeight: 700, color: C.blue500, cursor: 'pointer', fontFamily: font.family }}
                              >
                                Mark as read
                              </button>
                            )}
                            <button
                              onClick={event => {
                                event.stopPropagation()
                                dismiss(notification.id, role)
                              }}
                              style={{ background: 'none', border: 'none', padding: 0, fontSize: '11px', fontWeight: 700, color: C.textSub, cursor: 'pointer', fontFamily: font.family }}
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '14px 18px', borderTop: `1px solid ${C.border}`, background: '#fff', flexShrink: 0 }}>
          <div style={{ fontSize: '11px', color: C.textSub, textAlign: 'center', lineHeight: 1.5 }}>
            Notifications are cleared after 30 days.{` `}
            {unreadCount > 0 && (
              <span
                onClick={() => { void handleMarkAll() }}
                style={{ color: C.blue500, fontWeight: 700, cursor: 'pointer' }}
              >
                Mark all as read
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
