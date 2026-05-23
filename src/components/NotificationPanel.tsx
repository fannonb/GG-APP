import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, font, radius } from '@/design-system/tokens'
import { useNotificationsStore } from '@/store/notifications.store'
import { formatRelativeTime } from '@/utils/format'
import type { NotificationType } from '@/types/user.types'

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

const TYPE_STYLE: Record<NotificationType, { color: string; bg: string; border: string }> = {
  payment:     { color: C.success,  bg: C.successBg, border: 'rgba(34,201,138,0.2)' },
  invoice:     { color: '#D97706',  bg: '#FFFBEB',   border: 'rgba(245,158,11,0.25)' },
  appointment: { color: C.blue500,  bg: C.blue100,   border: 'rgba(74,173,223,0.25)' },
  credit:      { color: '#7C5BF0',  bg: '#F3F0FF',   border: 'rgba(124,91,240,0.2)' },
  system:      { color: C.textSub,  bg: C.bg,        border: C.border },
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
  credit:      'Credit',
  system:      'System',
}

export function NotificationPanel({ role }: Props) {
  const navigate = useNavigate()
  const { patientNotifs, spNotifs, panelOpen, closePanel, markRead, markAllRead, dismiss } = useNotificationsStore()
  const notifs = role === 'patient' ? patientNotifs : spNotifs
  const screenMap = role === 'patient' ? PATIENT_SCREEN_MAP : SP_SCREEN_MAP

  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  if (!panelOpen) return null

  const unreadCount = notifs.filter(n => !n.read).length
  const filtered = filter === 'unread' ? notifs.filter(n => !n.read) : notifs

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
          from { transform: translateX(100%); opacity: 0 }
          to   { transform: translateX(0);   opacity: 1 }
        }
        @keyframes fadeInBackdrop {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        .notif-row:hover { background: #F8FAFF !important; }
        .notif-actions { opacity: 0; transition: opacity 0.15s; }
        .notif-row:hover .notif-actions { opacity: 1; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={closePanel}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(9,28,68,0.45)',
          backdropFilter: 'blur(2px)',
          animation: 'fadeInBackdrop 0.2s ease',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(420px, 100vw)',
        zIndex: 1001,
        display: 'flex', flexDirection: 'column',
        background: '#fff',
        boxShadow: '-8px 0 48px rgba(9,28,68,0.18)',
        animation: 'slideInPanel 0.25s cubic-bezier(0.22,1,0.36,1)',
        fontFamily: font.family,
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #091c44 0%, #0d2f6e 100%)',
          padding: '20px 20px 0',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>Notifications</div>
                {unreadCount > 0 && (
                  <span style={{ background: C.error, color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: radius.full }}>
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead(role)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 12px', color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: font.family, whiteSpace: 'nowrap' }}>
                  Mark all read
                </button>
              )}
              <button
                onClick={closePanel}
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.family, flexShrink: 0 }}>
                ✕
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {(['all', 'unread'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{
                  padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: font.family, fontSize: '13px', fontWeight: filter === f ? 700 : 500,
                  color: filter === f ? '#fff' : 'rgba(255,255,255,0.45)',
                  borderBottom: `2px solid ${filter === f ? C.blue500 : 'transparent'}`,
                  marginBottom: '-1px', transition: 'all 0.15s',
                }}>
                {f === 'all' ? `All (${notifs.length})` : `Unread (${unreadCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.bg, border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3a7.5 7.5 0 00-7.5 7.5c0 3.5-1 5.5-2 7h19c-1-1.5-2-3.5-2-7A7.5 7.5 0 0012 3z" stroke={C.textSub} strokeWidth="1.4"/>
                  <path d="M9.5 19.5a2.5 2.5 0 005 0" stroke={C.textSub} strokeWidth="1.4"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>No notifications</div>
                <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px' }}>
                  {filter === 'unread' ? 'You\'ve read everything.' : 'Nothing here yet.'}
                </div>
              </div>
            </div>
          ) : (
            filtered.map((n, idx) => {
              const ts = TYPE_STYLE[n.type] ?? TYPE_STYLE.system
              const Icon = TYPE_ICON[n.type] ?? TYPE_ICON.system
              const isLast = idx === filtered.length - 1
              return (
                <div
                  key={n.id}
                  className="notif-row"
                  onMouseEnter={() => setHoveredId(n.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    display: 'flex', gap: '13px', padding: '14px 18px',
                    borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
                    background: n.read ? '#fff' : '#F0F7FF',
                    cursor: 'pointer', position: 'relative', transition: 'background 0.13s',
                  }}
                  onClick={() => handleClick(n.id, n.screen)}
                >
                  {/* Unread left bar */}
                  {!n.read && (
                    <div style={{ position: 'absolute', left: 0, top: '16px', bottom: '16px', width: 3, borderRadius: '0 2px 2px 0', background: C.blue500 }} />
                  )}

                  {/* Icon */}
                  <div style={{
                    width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                    background: ts.bg, color: ts.color,
                    border: `1px solid ${ts.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: '1px',
                  }}>
                    <Icon />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', marginBottom: '3px' }}>
                      <div style={{ fontSize: '13px', fontWeight: n.read ? 600 : 700, color: C.text, lineHeight: 1.3 }}>{n.title}</div>
                      <div style={{ fontSize: '10px', color: C.textLight, whiteSpace: 'nowrap', flexShrink: 0, marginTop: '2px' }}>{formatRelativeTime(n.time)}</div>
                    </div>
                    <div style={{
                      fontSize: '11px', fontWeight: 500,
                      color: ts.color, background: ts.bg, border: `1px solid ${ts.border}`,
                      padding: '1px 7px', borderRadius: radius.full,
                      display: 'inline-block', marginBottom: '5px',
                    }}>
                      {TYPE_LABEL[n.type]}
                    </div>
                    <div style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {n.body}
                    </div>

                    {/* Hover actions */}
                    <div className="notif-actions" style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      {!n.read && (
                        <button
                          onClick={e => { e.stopPropagation(); markRead(n.id, role) }}
                          style={{ background: 'none', border: 'none', padding: 0, fontSize: '11px', fontWeight: 600, color: C.blue500, cursor: 'pointer', fontFamily: font.family }}>
                          Mark as read
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); dismiss(n.id, role) }}
                        style={{ background: 'none', border: 'none', padding: 0, fontSize: '11px', fontWeight: 600, color: C.textSub, cursor: 'pointer', fontFamily: font.family }}>
                        Dismiss
                      </button>
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!n.read && hoveredId !== n.id && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.blue500, flexShrink: 0, marginTop: '6px' }} />
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 18px', borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
          <div style={{ fontSize: '11px', color: C.textSub, textAlign: 'center', lineHeight: 1.5 }}>
            Notifications are cleared after 30 days.{' '}
            {unreadCount > 0 && (
              <span onClick={() => markAllRead(role)} style={{ color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>
                Mark all as read
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
