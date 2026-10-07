import { useEffect, useRef, useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, font, radius } from '@/design-system/tokens'
import { resolvePatientNotificationRoute } from '@/features/patient/notification-routing'
import { useMarkPatientNotificationReadMutation } from '@/hooks/api/usePatientMutations'
import { useMarkSPNotificationReadMutation } from '@/hooks/api/useSPMutations'
import { useResponsive } from '@/hooks/useResponsive'
import { ROUTES } from '@/router/routes'
import { useNotificationsStore } from '@/store/notifications.store'
import type { Notification, NotificationType } from '@/types/user.types'
import { formatRelativeTime } from '@/utils/format'

interface Props {
  role: 'patient' | 'sp'
}

const CYAN_DEEP = '#0B7BC0'
const DAY = 86_400_000

const s = { stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const TYPE_STYLE: Record<NotificationType, { fg: string; bg: string; icon: () => ReactElement }> = {
  invoice: { fg: '#B45309', bg: '#FEF3C7', icon: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2.5" y="1.5" width="11" height="13" rx="2" {...s} /><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" {...s} /></svg> },
  payment: { fg: '#15803D', bg: '#DCFCE7', icon: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3.5" width="13" height="9" rx="2" {...s} /><path d="M1.5 6.5h13" {...s} /><path d="M10.5 9.5h1.5" {...s} /></svg> },
  appointment: { fg: CYAN_DEEP, bg: C.blue100, icon: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="12" rx="2" {...s} /><path d="M1.5 6.5h13M5 1v3M11 1v3" {...s} /></svg> },
  prescription: { fg: '#0F766E', bg: '#CCFBF1', icon: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="1.5" width="10" height="13" rx="2" {...s} /><path d="M8 5v6M5 8h6" {...s} /></svg> },
  credit: { fg: '#1D4ED8', bg: '#DBEAFE', icon: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" {...s} /><path d="M8 4.5v7M10 6.2c-.4-.6-1.1-.9-2-.9-1.1 0-2 .6-2 1.4 0 1.9 4 .9 4 2.8 0 .8-.9 1.4-2 1.4-.9 0-1.6-.3-2-.9" {...s} /></svg> },
  ledger: { fg: '#7C3AED', bg: '#EDE9FE', icon: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3.5" y="7" width="9" height="7" rx="1.5" {...s} /><path d="M5.5 7V5.2a2.5 2.5 0 015 0V7" {...s} /></svg> },
  system: { fg: C.textSub, bg: C.bg, icon: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" {...s} /><path d="M8 7.2v4M8 4.8v.2" {...s} strokeWidth={1.7} /></svg> },
}

const SP_SCREEN_MAP: Record<string, string> = {
  appointments: '/sp/appointments',
  invoices: '/sp/invoices',
  patients: '/sp/patients',
  payments: '/sp/payments',
  settings: '/sp/settings',
}

/** A short call to action for notifications that are waiting on the reader. */
function actionLabel(n: Notification, role: 'patient' | 'sp') {
  if (n.read) return null
  const text = `${n.title} ${n.body}`.toLowerCase()
  if (role === 'patient') {
    if (n.type === 'invoice' && /pending|authori[sz]|approve|review/.test(text)) return 'Review invoice'
    if (/reschedul|new time/.test(text)) return 'See new time'
    if (n.type === 'prescription' && /quote|price/.test(text)) return 'Review quote'
    if (n.type === 'ledger' && /expir/.test(text)) return 'Set new PIN'
    return null
  }
  if (n.type === 'appointment' && /new appointment request|requested/.test(text)) return 'Respond'
  if (n.type === 'prescription' && /new prescription|uploaded/.test(text)) return 'Send quote'
  return null
}

function groupLabel(iso: string, now: number) {
  const date = new Date(iso)
  const today = new Date(now)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const time = date.getTime()
  if (time >= start) return 'Today'
  if (time >= start - DAY) return 'Yesterday'
  if (time >= start - 6 * DAY) return 'This week'
  return date.toLocaleDateString('en-GB', { month: 'long', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

function groupNotifications(list: Notification[], now: number) {
  const groups: Array<{ title: string; items: Notification[] }> = []
  for (const n of [...list].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())) {
    const title = groupLabel(n.time, now)
    const last = groups[groups.length - 1]
    if (last?.title === title) last.items.push(n)
    else groups.push({ title, items: [n] })
  }
  return groups
}

/** Mark many as read without firing every request at once. */
async function inBatches(ids: string[], run: (id: string) => Promise<unknown>, size = 4) {
  for (let i = 0; i < ids.length; i += size) {
    await Promise.allSettled(ids.slice(i, i + size).map(run))
  }
}

function RowMenu({ unread, onRead, onDismiss }: { unread: boolean; onRead: () => void; onDismiss: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const item: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', fontSize: 13.5, color: C.text, fontFamily: font.family, cursor: 'pointer', whiteSpace: 'nowrap' }
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }} onClick={event => event.stopPropagation()}>
      <button
        type="button"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        style={{ width: 32, height: 32, borderRadius: radius.full, border: 'none', background: open ? C.bg : 'transparent', color: C.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden><circle cx="3.5" cy="8" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="12.5" cy="8" r="1.3" /></svg>
      </button>
      {open && (
        <div role="menu" style={{ position: 'absolute', right: 0, top: 34, zIndex: 5, background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.sm, boxShadow: '0 8px 24px rgba(13,30,66,0.14)', padding: '4px 0', minWidth: 150 }}>
          {unread && <button type="button" role="menuitem" style={item} onClick={() => { setOpen(false); onRead() }}>Mark as read</button>}
          <button type="button" role="menuitem" style={item} onClick={() => { setOpen(false); onDismiss() }}>Dismiss</button>
        </div>
      )}
    </div>
  )
}

function NotificationRow({ n, role, onOpen, onRead, onDismiss }: { n: Notification; role: 'patient' | 'sp'; onOpen: () => void; onRead: () => void; onDismiss: () => void }) {
  const { isMobile } = useResponsive()
  const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.system
  const Icon = style.icon
  const cta = actionLabel(n, role)
  // Swipe left on touch screens to dismiss.
  const startX = useRef<number | null>(null)
  const [dx, setDx] = useState(0)
  const [swiping, setSwiping] = useState(false)

  return (
    <li style={{ position: 'relative', overflow: 'hidden', borderBottom: `1px solid ${C.border}` }}>
      {dx < 0 && (
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: '#FEE2E2', color: '#B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 20, fontSize: 13, fontWeight: 700 }}>
          Dismiss
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={event => { if (event.key === 'Enter') onOpen() }}
        onTouchStart={event => { startX.current = event.touches[0].clientX; setSwiping(true) }}
        onTouchMove={event => {
          if (startX.current == null) return
          setDx(Math.min(0, event.touches[0].clientX - startX.current))
        }}
        onTouchEnd={() => {
          if (dx < -90) onDismiss()
          setDx(0)
          setSwiping(false)
          startX.current = null
        }}
        className="notif-row"
        style={{
          position: 'relative',
          display: 'flex',
          gap: 12,
          padding: isMobile ? '14px 12px 14px 16px' : '14px 12px 14px 20px',
          background: n.read ? '#fff' : '#F5FAFE',
          cursor: 'pointer',
          transform: dx ? `translateX(${dx}px)` : 'none',
          transition: swiping ? 'none' : 'transform 0.2s ease',
          outline: 'none',
        }}
      >
        <span aria-hidden style={{ width: 36, height: 36, borderRadius: radius.full, background: style.bg, color: style.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: n.read ? 600 : 800, color: C.text, lineHeight: 1.35 }}>{n.title}</span>
            <span style={{ fontSize: 12, color: C.textLight, whiteSpace: 'nowrap', flexShrink: 0 }}>{formatRelativeTime(n.time)}</span>
          </div>
          <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.45, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {n.body}
          </div>
          {cta && (
            <span style={{ display: 'inline-block', marginTop: 8, padding: '6px 12px', borderRadius: radius.sm, background: CYAN_DEEP, color: '#fff', fontSize: 12.5, fontWeight: 700 }}>
              {cta}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <RowMenu unread={!n.read} onRead={onRead} onDismiss={onDismiss} />
          {!n.read && <span aria-label="Unread" style={{ width: 8, height: 8, borderRadius: '50%', background: C.blue500 }} />}
        </div>
      </div>
    </li>
  )
}

export function NotificationPanel({ role }: Props) {
  const panelOpen = useNotificationsStore(state => state.panelOpen)
  // Mounted only while open, so the clock, filter and focus start fresh each time.
  return panelOpen ? <PanelBody role={role} /> : null
}

function PanelBody({ role }: Props) {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const { patientNotifs, spNotifs, dismissed, closePanel, dismiss, markRead } = useNotificationsStore()
  const markPatientRead = useMarkPatientNotificationReadMutation()
  const markSPRead = useMarkSPNotificationReadMutation()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [markingAll, setMarkingAll] = useState(false)
  const [now] = useState(() => Date.now())
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dialogRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closePanel() }
    // Keep the page behind still while the panel is open.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [closePanel])

  const hidden = new Set(dismissed[role])
  const notifications = (role === 'patient' ? patientNotifs : spNotifs).filter(n => !hidden.has(n.id))
  const unread = notifications.filter(n => !n.read)
  const shown = filter === 'unread' ? unread : notifications
  const groups = groupNotifications(shown, now)

  const readOne = (n: Notification) => {
    if (n.read) return
    if (role === 'patient') markPatientRead.mutate(n.id)
    else markSPRead.mutate(n.id)
  }

  const markAll = async () => {
    setMarkingAll(true)
    const ids = unread.map(n => n.id)
    // Optimistic: clear the dots now, then save in small batches.
    ids.forEach(id => markRead(id, role))
    await inBatches(ids, id => (role === 'patient' ? markPatientRead.mutateAsync(id) : markSPRead.mutateAsync(id)))
    setMarkingAll(false)
  }

  const open = (n: Notification) => {
    readOne(n)
    closePanel()
    if (role === 'patient') {
      navigate(resolvePatientNotificationRoute(n))
      return
    }
    if (n.screen.startsWith('/')) navigate(n.screen)
    else if (SP_SCREEN_MAP[n.screen]) navigate(SP_SCREEN_MAP[n.screen])
  }

  const remove = (n: Notification) => {
    // A dismissed item shouldn't keep the bell badge lit.
    readOne(n)
    dismiss(n.id, role)
  }

  return (
    <>
      <style>{`
        @keyframes notifSlideIn { from { transform: translateX(100%) } to { transform: none } }
        @keyframes notifSlideUp { from { transform: translateY(100%) } to { transform: none } }
        @keyframes notifFade { from { opacity: 0 } to { opacity: 1 } }
        .notif-row:hover { background: #F2F7FC !important; }
        .notif-row:focus-visible { box-shadow: inset 0 0 0 2px ${CYAN_DEEP}; }
      `}</style>

      <div onClick={closePanel} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(9,28,68,0.35)', animation: 'notifFade 0.2s ease' }} />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        tabIndex={-1}
        style={{
          position: 'fixed',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          fontFamily: font.family,
          outline: 'none',
          ...(isMobile
            ? { left: 0, right: 0, bottom: 0, height: '88vh', borderRadius: `${radius.lg} ${radius.lg} 0 0`, animation: 'notifSlideUp 0.25s ease', boxShadow: '0 -8px 40px rgba(9,28,68,0.18)' }
            : { top: 0, right: 0, bottom: 0, width: 420, animation: 'notifSlideIn 0.25s ease', boxShadow: '-8px 0 40px rgba(9,28,68,0.15)' }),
        }}
      >
        {isMobile && (
          <div aria-hidden style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0' }}>
            <span style={{ width: 40, height: 4, borderRadius: 2, background: C.border }} />
          </div>
        )}

        <div style={{ padding: isMobile ? '10px 16px 12px' : '20px 20px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ flex: 1, margin: 0, fontSize: 19, fontWeight: 800, color: C.text }}>Notifications</h2>
            <button
              type="button"
              aria-label="Close notifications"
              onClick={closePanel}
              style={{ width: 40, height: 40, borderRadius: radius.full, background: C.bg, border: 'none', color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12 }}>
            <div role="tablist" aria-label="Filter" style={{ display: 'inline-flex', padding: 3, gap: 2, background: '#E3ECF6', borderRadius: radius.sm }}>
              {(['all', 'unread'] as const).map(value => {
                const active = filter === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(value)}
                    style={{ height: 32, padding: '0 14px', border: 'none', borderRadius: 7, background: active ? '#fff' : 'transparent', boxShadow: active ? '0 1px 3px rgba(13,30,66,0.12)' : 'none', color: active ? C.text : C.textSub, fontSize: 13, fontWeight: 700, fontFamily: font.family, cursor: 'pointer' }}
                  >
                    {value === 'all' ? 'All' : 'Unread'}
                    {value === 'unread' && unread.length > 0 && <span style={{ marginLeft: 6, color: CYAN_DEEP }}>{unread.length}</span>}
                  </button>
                )
              })}
            </div>
            {unread.length > 0 && (
              <button type="button" disabled={markingAll} onClick={() => void markAll()} style={{ background: 'none', border: 'none', padding: '6px 0', color: CYAN_DEEP, fontSize: 13, fontWeight: 700, fontFamily: font.family, cursor: 'pointer', opacity: markingAll ? 0.6 : 1 }}>
                Mark all as read
              </button>
            )}
          </div>
        </div>

        <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {groups.length === 0 ? (
            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
              <span aria-hidden style={{ width: 52, height: 52, margin: '0 auto 14px', borderRadius: radius.full, background: C.blue100, color: CYAN_DEEP, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>You’re all caught up</div>
              <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>
                {filter === 'unread' ? 'No unread notifications.' : 'New updates will show up here.'}
              </div>
            </div>
          ) : (
            groups.map(group => (
              <section key={group.title} aria-label={group.title}>
                <h3 style={{ margin: 0, padding: isMobile ? '14px 16px 6px' : '16px 20px 6px', fontSize: 13, fontWeight: 700, color: C.textSub, background: '#fff' }}>{group.title}</h3>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: `1px solid ${C.border}` }}>
                  {group.items.map(n => (
                    <NotificationRow key={n.id} n={n} role={role} onOpen={() => open(n)} onRead={() => readOne(n)} onDismiss={() => remove(n)} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        {role === 'patient' && (
          <div style={{ padding: isMobile ? '12px 16px calc(12px + env(safe-area-inset-bottom))' : '12px 20px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => { closePanel(); navigate(ROUTES.NOTIFICATIONS) }}
              style={{ width: '100%', height: 40, borderRadius: radius.sm, border: `1px solid ${C.border}`, background: '#fff', color: C.text, fontSize: 13.5, fontWeight: 700, fontFamily: font.family, cursor: 'pointer' }}
            >
              See all notifications
            </button>
          </div>
        )}
      </div>
    </>
  )
}
