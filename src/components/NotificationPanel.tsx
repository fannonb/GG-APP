import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, font, radius } from '@/design-system/tokens'
import { useNotificationsStore } from '@/store/notifications.store'
import { formatRelativeTime } from '@/utils/format'
import type { Notification, NotificationType } from '@/types/user.types'

interface Props {
  role: 'patient' | 'sp'
}

type IconFC = () => React.ReactElement

const TYPE_ICON: Record<NotificationType, IconFC> = {
  payment:     () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3.5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6.5h14" stroke="currentColor" strokeWidth="1.2"/><circle cx="11.5" cy="9.5" r="1.3" fill="currentColor"/></svg>,
  invoice:     () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  appointment: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="2.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6.5h14M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="8" cy="10" r="1.5" fill="currentColor"/></svg>,
  credit:      () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  system:      () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 7v4M8 5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
}

const PATIENT_SCREEN_MAP: Record<string, string> = {
  'transaction-history': '/app/transactions',
  'invoice-review':      '/app/invoices/INV-2026-0842',
  'find-service':        '/app/services',
  'credit-wallet':       '/app/credit',
  'profile':             '/app/profile',
}

const SP_SCREEN_MAP: Record<string, string> = {
  'appointments': '/sp/appointments',
  'payments':     '/sp/payments',
  'invoices':     '/sp/invoices',
  'settings':     '/sp/settings',
  'patients':     '/sp/patients',
}

const TYPE_LABEL: Record<NotificationType, string> = {
  payment:     'Payment',
  invoice:     'Invoice',
  appointment: 'Appointment',
  credit:      'Balance',
  system:      'System',
}

function groupNotifications(notifs: Notification[]) {
  const sorted = [...notifs].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000

  const todayItems: Notification[] = []
  const yesterdayItems: Notification[] = []
  const earlierItems: Notification[] = []

  sorted.forEach(n => {
    const itemTime = new Date(n.time).getTime()
    if (itemTime >= todayStart) {
      todayItems.push(n)
    } else if (itemTime >= yesterdayStart) {
      yesterdayItems.push(n)
    } else {
      earlierItems.push(n)
    }
  })

  const groups: { title: string; items: Notification[] }[] = []
  if (todayItems.length > 0) groups.push({ title: 'Today', items: todayItems })
  if (yesterdayItems.length > 0) groups.push({ title: 'Yesterday', items: yesterdayItems })
  if (earlierItems.length > 0) groups.push({ title: 'Earlier', items: earlierItems })

  return groups
}

export function NotificationPanel({ role }: Props) {
  const navigate = useNavigate()
  const { patientNotifs, spNotifs, panelOpen, closePanel, markRead, markAllRead, dismiss } = useNotificationsStore()
  const notifs = role === 'patient' ? patientNotifs : spNotifs
  const screenMap = role === 'patient' ? PATIENT_SCREEN_MAP : SP_SCREEN_MAP

  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  if (!panelOpen) return null

  const unreadCount = notifs.filter(n => !n.read).length
  const filtered = filter === 'unread' ? notifs.filter(n => !n.read) : notifs
  const grouped = groupNotifications(filtered)

  const handleClick = (id: string, screen: string) => {
    markRead(id, role)
    closePanel()
    const dest = screenMap[screen]
    if (dest) navigate(dest)
  }

  return (
    <>
      <style>{`
        @keyframes slideInPanel {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes fadeInBackdrop {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to   { opacity: 1; backdrop-filter: blur(5px); }
        }
        .notif-card {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .notif-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(13, 30, 66, 0.08) !important;
          border-color: ${C.blue500} !important;
        }
        .notif-actions {
          opacity: 0;
          max-height: 0;
          overflow: hidden;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .notif-card:hover .notif-actions {
          opacity: 1;
          max-height: 24px;
          margin-top: 8px;
        }
      `}</style>

      {/* Backdrop with soft blur */}
      <div
        onClick={closePanel}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(9, 28, 68, 0.4)',
          backdropFilter: 'blur(5px)',
          animation: 'fadeInBackdrop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      />

      {/* Sliding Drawer Panel (Warm Alabaster background) */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(420px, 100vw)',
        zIndex: 1001,
        display: 'flex', flexDirection: 'column',
        background: C.bg,
        boxShadow: '-8px 0 48px rgba(9, 28, 68, 0.15)',
        animation: 'slideInPanel 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        fontFamily: font.family,
      }}>

        {/* Clean White Header */}
        <div style={{
          background: '#ffffff',
          padding: '20px 20px 16px',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>Notifications</div>
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
                  onClick={() => markAllRead(role)}
                  style={{
                    background: 'none', border: 'none', padding: '6px 10px',
                    color: C.blue500, fontSize: '12px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: font.family, whiteSpace: 'nowrap',
                    borderRadius: '8px', transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.blue100 }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={closePanel}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'transparent', border: 'none',
                  color: C.textSub, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.blue100; e.currentTarget.style.color = C.blue500 }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSub }}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Filter Segmented Control Switcher */}
          <div style={{ display: 'flex', background: 'rgba(9, 28, 68, 0.04)', borderRadius: '10px', padding: '3px' }}>
            {(['all', 'unread'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{
                  flex: 1,
                  padding: '8px 12px', background: filter === f ? '#fff' : 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer',
                  fontFamily: font.family, fontSize: '12px', fontWeight: filter === f ? 700 : 500,
                  color: filter === f ? C.navy800 : C.textSub,
                  boxShadow: filter === f ? '0 1px 4px rgba(13, 30, 66, 0.08)' : 'none',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (filter !== f) e.currentTarget.style.color = C.blue500 }}
                onMouseLeave={e => { if (filter !== f) e.currentTarget.style.color = C.textSub }}
              >
                {f === 'all' ? `All (${notifs.length})` : `Unread (${unreadCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable List Area (Warm Alabaster Canvas with Floating White Cards) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {grouped.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#fff', border: `1.5px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3a7.5 7.5 0 00-7.5 7.5c0 3.5-1 5.5-2 7h19c-1-1.5-2-3.5-2-7A7.5 7.5 0 0012 3z" stroke={C.blue500} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.5 19.5a2.5 2.5 0 005 0" stroke={C.blue500} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>All clear!</div>
                <div style={{ fontSize: '13px', color: C.textLight, marginTop: '6px', lineHeight: 1.5, maxWidth: '240px' }}>
                  {filter === 'unread' ? "You've read all your notifications." : "There are no notifications at the moment."}
                </div>
              </div>
            </div>
          ) : (
            grouped.map(group => (
              <div key={group.title} style={{ marginBottom: '20px' }}>
                {/* Timeline Section Header */}
                <div style={{
                  fontSize: '11px', fontWeight: 800, color: C.textSub,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  marginBottom: '10px', paddingLeft: '4px'
                }}>
                  {group.title}
                </div>

                {/* Floating Cards Stack */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {group.items.map(n => {
                    const Icon = TYPE_ICON[n.type] ?? TYPE_ICON.system
                    const isConfirmedAppt = n.type === 'appointment' && n.title.toLowerCase().includes('confirmed')
                    const accentColor = isConfirmedAppt ? '#10B981' : C.blue500
                    const cardBorder = n.read
                      ? C.border
                      : isConfirmedAppt ? 'rgba(16,185,129,0.4)' : 'rgba(56,182,255,0.4)'
                    const cardBg = n.read
                      ? '#ffffff'
                      : isConfirmedAppt ? 'rgba(16,185,129,0.04)' : 'rgba(56,182,255,0.04)'
                    const cardShadow = n.read
                      ? '0 1px 3px rgba(13,30,66,0.03)'
                      : isConfirmedAppt ? '0 2px 8px rgba(16,185,129,0.08)' : '0 2px 8px rgba(56,182,255,0.06)'
                    const iconBg = n.read
                      ? isConfirmedAppt ? 'rgba(16,185,129,0.1)' : C.blue100
                      : isConfirmedAppt ? 'rgba(16,185,129,0.15)' : 'rgba(56,182,255,0.15)'
                    return (
                      <div
                        key={n.id}
                        className="notif-card"
                        style={{
                          display: 'flex', gap: '12px', padding: '14px 16px',
                          borderRadius: radius.lg,
                          border: `1px solid ${cardBorder}`,
                          background: cardBg,
                          boxShadow: cardShadow,
                          cursor: 'pointer', position: 'relative',
                        }}
                        onClick={() => handleClick(n.id, n.screen)}
                      >
                        {/* Rounded Icon frame with type context */}
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          background: iconBg,
                          color: accentColor,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginTop: '2px',
                        }}>
                          <Icon />
                        </div>

                        {/* Card Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '13px', fontWeight: n.read ? 600 : 750, color: C.text, lineHeight: 1.35 }}>
                                {n.title}
                              </span>
                              {!n.read && (
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, display: 'inline-block', flexShrink: 0 }} />
                              )}
                            </div>
                            <span style={{ fontSize: '10px', color: C.textLight, whiteSpace: 'nowrap', flexShrink: 0, marginTop: '2px' }}>
                              {formatRelativeTime(n.time)}
                            </span>
                          </div>

                          {/* Type Badge */}
                          <div style={{
                            fontSize: '9px', fontWeight: 800,
                            color: isConfirmedAppt ? '#10B981' : C.textSub,
                            background: isConfirmedAppt ? 'rgba(16,185,129,0.08)' : C.bg,
                            border: `1px solid ${isConfirmedAppt ? 'rgba(16,185,129,0.25)' : C.border}`,
                            padding: '1px 6px', borderRadius: radius.full,
                            display: 'inline-block', marginBottom: '6px',
                            textTransform: 'uppercase', letterSpacing: '0.04em'
                          }}>
                            {TYPE_LABEL[n.type]}
                          </div>

                          {/* Body */}
                          <div style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {n.body}
                          </div>

                          {/* Hover action links */}
                          <div className="notif-actions" style={{ display: 'flex', gap: '12px' }}>
                            {!n.read && (
                              <button
                                onClick={e => { e.stopPropagation(); markRead(n.id, role) }}
                                style={{ background: 'none', border: 'none', padding: 0, fontSize: '11px', fontWeight: 700, color: accentColor, cursor: 'pointer', fontFamily: font.family }}
                              >
                                Mark as read
                              </button>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); dismiss(n.id, role) }}
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

        {/* Clean White Footer */}
        <div style={{ padding: '14px 18px', borderTop: `1px solid ${C.border}`, background: '#ffffff', flexShrink: 0 }}>
          <div style={{ fontSize: '11px', color: C.textSub, textAlign: 'center', lineHeight: 1.5 }}>
            Notifications are cleared after 30 days.{' '}
            {unreadCount > 0 && (
              <span
                onClick={() => markAllRead(role)}
                style={{ color: C.blue500, fontWeight: 700, cursor: 'pointer', marginLeft: '2px' }}
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
