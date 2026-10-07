import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { isMockApi } from '@/api/config'
import { C, font, radius } from '@/design-system/tokens'
import {
  useCancelPatientAppointmentMutation,
  usePatientAppointments,
  useProvider,
} from '@/hooks/api'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatTime12h } from '@/utils/format'
import { getAppointmentDisplayStatus, getDaysUntilAppointment } from '@/utils/appointments'
import { appointmentRebookPath, buildAppointmentRebookState } from '@/utils/rebook'
import { ROUTES } from '@/router/routes'
import { useAuthStore } from '@/store/auth.store'
import { UnderlineTabs } from '@/components/UnderlineTabs'
import { useUserStore } from '@/store/user.store'
import type { Appointment } from '@/types/user.types'
import type { Provider } from '@/types/provider.types'

type FilterTab = 'upcoming' | 'past'

const CYAN_DEEP = '#0B7BC0'
const CYAN_MID = '#1A9BE6'

const STATUS: Record<string, { label: string; fg: string; bg: string }> = {
  confirmed: { label: 'Confirmed', fg: '#15803D', bg: 'rgba(34,197,94,0.12)' },
  pending: { label: 'Waiting for provider', fg: '#B45309', bg: 'rgba(245,166,35,0.14)' },
  reschedule: { label: 'New time proposed', fg: '#B45309', bg: 'rgba(245,166,35,0.14)' },
  completed: { label: 'Completed', fg: C.textSub, bg: C.bg },
  cancelled: { label: 'Cancelled', fg: '#B91C1C', bg: 'rgba(239,68,68,0.10)' },
}

const CANCEL_REASONS = [
  'Schedule conflict',
  'Feeling better',
  'Found another provider',
  'Provider unavailable',
  'Other',
] as const

const outlineBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 34,
  padding: '0 12px',
  borderRadius: radius.sm,
  border: '1px solid rgba(11,123,192,0.30)',
  background: '#fff',
  color: CYAN_DEEP,
  fontSize: 13,
  fontWeight: 700,
  fontFamily: font.family,
  cursor: 'pointer',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
}

const primaryBtn: React.CSSProperties = {
  ...outlineBtn,
  border: 'none',
  background: `linear-gradient(135deg, ${CYAN_MID} 0%, ${CYAN_DEEP} 100%)`,
  boxShadow: '0 4px 10px rgba(11,123,192,0.22)',
  color: '#fff',
}

function countdown(dateStr: string) {
  const days = getDaysUntilAppointment(dateStr)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days > 1) return `In ${days} days`
  return null
}

function icsStamp(date: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}T${p(date.getHours())}${p(date.getMinutes())}00`
}

function downloadCalendarEvent(apt: Appointment, provider?: Provider) {
  const [h = 9, m = 0] = apt.time.split(':').map(Number)
  const start = new Date(apt.date)
  start.setHours(h, m, 0, 0)
  const end = new Date(start.getTime() + 30 * 60_000)
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GGAPP//Appointments//EN',
    'BEGIN:VEVENT',
    `UID:${apt.id}@ggapp`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${apt.service} · ${apt.provider}`,
    provider?.address ? `LOCATION:${provider.address.replace(/[,;]/g, '\\$&')}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `appointment-${apt.id}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

function directionsUrl(provider: Provider) {
  const query = provider.lat != null && provider.lng != null
    ? `${provider.lat},${provider.lng}`
    : provider.address
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function DateTile({ date, muted }: { date: Date; muted: boolean }) {
  const { isMobile } = useResponsive()
  return (
    <div
      style={{
        width: isMobile ? 54 : 60,
        minWidth: isMobile ? 54 : 60,
        padding: '8px 0',
        borderRadius: 12,
        textAlign: 'center',
        background: muted ? C.bg : `linear-gradient(160deg, #38B6FF 0%, ${CYAN_DEEP} 100%)`,
        boxShadow: muted ? 'none' : '0 6px 14px rgba(11,123,192,0.22)',
        color: muted ? C.textSub : '#fff',
        flexShrink: 0,
        alignSelf: 'flex-start',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85 }}>
        {date.toLocaleDateString('en-US', { weekday: 'short' })}
      </div>
      <div style={{ fontSize: isMobile ? 22 : 24, fontWeight: 800, lineHeight: 1.1, color: muted ? C.text : '#fff' }}>{date.getDate()}</div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85 }}>
        {date.toLocaleDateString('en-US', { month: 'short' })}
      </div>
    </div>
  )
}

function Pill({ fg, bg, children }: { fg: string; bg: string; children: ReactNode }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: radius.full, color: fg, background: bg, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function AppointmentCard({
  apt,
  onCancel,
}: {
  apt: Appointment
  onCancel?: () => void
}) {
  const { isMobile } = useResponsive()
  const { data: provider } = useProvider(apt.providerId)
  const navigate = useNavigate()
  const userName = useUserStore(s => s.user.name)
  const date = new Date(apt.date)
  const displayStatus = getAppointmentDisplayStatus(apt)
  const isPast = displayStatus === 'completed' || displayStatus === 'cancelled'
  const isReschedule = displayStatus === 'pending' && !!apt.rescheduledAt
  const status = STATUS[isReschedule ? 'reschedule' : displayStatus] ?? STATUS.completed
  const isBeneficiary = apt.forSelf === false || (apt.forSelf === undefined && apt.for !== userName && apt.for !== 'Self')
  const when = !isPast ? countdown(apt.date) : null

  const bookAgain = () => navigate(appointmentRebookPath(), { state: buildAppointmentRebookState(apt, userName) })

  return (
    <article
      style={{
        display: 'flex',
        gap: isMobile ? 14 : 18,
        padding: isMobile ? '16px' : '20px 22px',
        background: '#fff',
        borderRadius: radius.lg,
        border: `1px solid ${isReschedule ? 'rgba(245,166,35,0.45)' : C.border}`,
        fontFamily: font.family,
      }}
    >
      <DateTile date={date} muted={isPast} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: '-0.01em', minWidth: 0 }}>{apt.provider}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Pill fg={status.fg} bg={status.bg}>{status.label}</Pill>
            {when && <Pill fg={CYAN_DEEP} bg={C.blue100}>{when}</Pill>}
          </div>
        </div>

        <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, lineHeight: 1.5 }}>
          <span style={{ color: C.text, fontWeight: 600 }}>{apt.service}</span>
          {' · '}{formatTime12h(apt.time)}
          {isPast && ` · ${date.getFullYear()}`}
          {' · '}
          <span style={{ color: isBeneficiary ? CYAN_DEEP : C.textSub, fontWeight: isBeneficiary ? 600 : 400 }}>
            {isBeneficiary ? `For ${apt.for}` : 'For you'}
          </span>
        </div>

        {!isPast && provider?.address && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.textSub, marginTop: 4 }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0 }}>
              <path d="M8 14s4.5-4.2 4.5-7.5a4.5 4.5 0 10-9 0C3.5 9.8 8 14 8 14z" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="8" cy="6.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{provider.address}</span>
          </div>
        )}

        {displayStatus === 'pending' && !isReschedule && (
          <div style={{ fontSize: 12, color: '#8A4D00', marginTop: 8 }}>
            {apt.provider} hasn't confirmed this time yet. We'll let you know when they do.
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          {isReschedule && (
            <button type="button" style={primaryBtn} onClick={() => navigate(`/app/appointments/${apt.id}/reschedule`)}>
              Review new time
            </button>
          )}

          {!isPast && provider && (
            <a href={directionsUrl(provider)} target="_blank" rel="noopener noreferrer" style={outlineBtn}>
              Directions
            </a>
          )}
          {!isPast && provider?.phone && (
            <a href={`tel:${provider.phone.replace(/\s+/g, '')}`} style={outlineBtn}>
              Call
            </a>
          )}
          {!isPast && displayStatus === 'confirmed' && (
            <button type="button" style={outlineBtn} onClick={() => downloadCalendarEvent(apt, provider ?? undefined)}>
              Add to calendar
            </button>
          )}

          {displayStatus === 'completed' && (
            <>
              <button type="button" style={outlineBtn} onClick={() => navigate(ROUTES.LEDGER)}>
                Visit notes
              </button>
              {apt.hasInvoice && (
                <button type="button" style={outlineBtn} onClick={() => navigate(ROUTES.INVOICE_LIST)}>
                  Invoice
                </button>
              )}
              <button type="button" style={outlineBtn} onClick={bookAgain}>
                Book again
              </button>
            </>
          )}
          {displayStatus === 'cancelled' && (
            <button type="button" style={outlineBtn} onClick={bookAgain}>
              Book again
            </button>
          )}

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{ marginLeft: isMobile ? 0 : 'auto', background: 'none', border: 'none', padding: '6px 2px', color: C.textSub, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font.family, textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              Cancel visit
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function EmptyState({ label, sub }: { label: string; sub: string }) {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', background: '#fff', borderRadius: radius.lg, border: `1px solid ${C.border}` }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: C.blue100, color: CYAN_DEEP, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <svg width="24" height="24" viewBox="0 0 26 26" fill="none" aria-hidden>
          <rect x="2" y="4" width="22" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M2 10h22M8.5 2v4M17.5 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.textSub, marginBottom: 18 }}>{sub}</div>
      <button type="button" onClick={() => navigate(ROUTES.FIND_SERVICE)} style={{ ...primaryBtn, height: 40, padding: '0 20px' }}>
        Find care
      </button>
    </div>
  )
}

export function AppointmentsScreen() {
  const { isMobile } = useResponsive()
  const navigate = useNavigate()
  const { userMode } = useAuthStore()
  const { data } = usePatientAppointments()
  const cancelAppointmentMutation = useCancelPatientAppointmentMutation()
  const [tab, setTab] = useState<FilterTab>('upcoming')
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelNote, setCancelNote] = useState('')
  const [cancelToast, setCancelToast] = useState<string | null>(null)

  const closeCancelModal = () => {
    if (cancelAppointmentMutation.isPending) return
    setCancelTarget(null)
    setCancelReason('')
    setCancelNote('')
  }

  const handleConfirmCancel = () => {
    if (!cancelTarget || !cancelReason) return

    cancelAppointmentMutation.mutate(
      {
        id: cancelTarget.id,
        payload: {
          reason: cancelReason,
          note: cancelReason === 'Other' ? cancelNote.trim() || undefined : undefined,
        },
      },
      {
        onSuccess: () => {
          setCancelToast(cancelTarget.provider)
          closeCancelModal()
          setTimeout(() => setCancelToast(null), 5000)
        },
      },
    )
  }

  const isNew = isMockApi && userMode === 'new'
  const upcoming = (isNew ? [] : data?.upcoming ?? [])
    .filter(appointment => {
      const status = getAppointmentDisplayStatus(appointment)
      return status !== 'cancelled' && status !== 'completed'
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time))
  const past = isNew
    ? []
    : [
        ...(data?.past ?? []),
        ...(data?.upcoming ?? []).filter(appointment => {
          const status = getAppointmentDisplayStatus(appointment)
          return status === 'completed' || status === 'cancelled'
        }),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const pastGrouped = past.reduce<Record<string, Appointment[]>>((acc, apt) => {
    const key = new Date(apt.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!acc[key]) acc[key] = []
    acc[key].push(apt)
    return acc
  }, {})

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { id: 'past', label: 'Past', count: past.length },
  ]

  return (
    <AppLayout title="Appointments" notifCount={2}>
      <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 18, fontFamily: font.family }}>
        {cancelToast && (
          <div role="status" style={{ padding: '12px 16px', borderRadius: radius.md, background: 'rgba(34,197,94,0.10)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, fontSize: 13, color: '#15803D', lineHeight: 1.5 }}>
              <strong>Appointment cancelled.</strong> {cancelToast} has been told.
            </div>
            <button type="button" aria-label="Dismiss" onClick={() => setCancelToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSub, fontSize: 16, lineHeight: 1 }}>
              ×
            </button>
          </div>
        )}

        <UnderlineTabs
          tabs={tabs}
          active={tab}
          onChange={setTab}
          trailing={(
            <button type="button" onClick={() => navigate(ROUTES.FIND_SERVICE)} style={primaryBtn}>
              + Book care
            </button>
          )}
        />

        {tab === 'upcoming' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcoming.length === 0 ? (
              <EmptyState label="No upcoming appointments" sub="Find a verified provider and request a time that suits you." />
            ) : (
              upcoming.map(apt => (
                <AppointmentCard
                  key={apt.id}
                  apt={apt}
                  onCancel={getAppointmentDisplayStatus(apt) === 'confirmed' ? () => setCancelTarget(apt) : undefined}
                />
              ))
            )}
          </div>
        )}

        {tab === 'past' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {past.length === 0 ? (
              <EmptyState label="No past appointments yet" sub="Your visit history will appear here." />
            ) : (
              Object.entries(pastGrouped).map(([month, apts]) => (
                <section key={month} aria-label={month}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    {month}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {apts.map(apt => (
                      <AppointmentCard key={apt.id} apt={apt} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        )}
      </div>

      {cancelTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={closeCancelModal}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(9,28,68,0.45)',
              backdropFilter: 'blur(4px)',
            }}
          />
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              background: '#fff',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 32px 80px rgba(9,28,68,0.22)',
              fontFamily: font.family,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: C.errorBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M3.5 3.5l11 11M14.5 3.5l-11 11"
                  stroke={C.error}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div
              style={{
                fontSize: '17px',
                fontWeight: 800,
                color: C.text,
                letterSpacing: '-0.01em',
                marginBottom: '6px',
              }}
            >
              Cancel Appointment
            </div>
            <div
              style={{
                fontSize: '13px',
                color: C.textSub,
                marginBottom: '22px',
                lineHeight: 1.6,
              }}
            >
              Cancelling your appointment with{' '}
              <strong style={{ color: C.text }}>{cancelTarget.provider}</strong>. Your
              provider will be notified.
            </div>

            {cancelAppointmentMutation.isError && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '11px 12px',
                  borderRadius: radius.sm,
                  background: C.errorBg,
                  border: '1px solid rgba(229,71,77,0.24)',
                  color: C.error,
                  fontSize: '12px',
                  lineHeight: 1.5,
                }}
              >
                {cancelAppointmentMutation.error instanceof Error
                  ? cancelAppointmentMutation.error.message
                  : 'Unable to cancel the appointment right now.'}
              </div>
            )}

            <div style={{ marginBottom: '18px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: C.textLight,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  marginBottom: '10px',
                }}
              >
                Reason for cancelling
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {CANCEL_REASONS.map(reason => (
                  <div
                    key={reason}
                    onClick={() => {
                      if (!cancelAppointmentMutation.isPending) {
                        setCancelReason(reason)
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 13px',
                      borderRadius: radius.sm,
                      border: `1.5px solid ${
                        cancelReason === reason ? C.blue500 : C.border
                      }`,
                      background: cancelReason === reason ? C.blue100 : '#fff',
                      cursor: cancelAppointmentMutation.isPending
                        ? 'default'
                        : 'pointer',
                      transition: 'all 0.12s',
                      opacity: cancelAppointmentMutation.isPending ? 0.7 : 1,
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        border: `2px solid ${
                          cancelReason === reason ? C.blue500 : C.border
                        }`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {cancelReason === reason && (
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: C.blue500,
                          }}
                        />
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '13px',
                        color: C.text,
                        fontWeight: cancelReason === reason ? 600 : 400,
                      }}
                    >
                      {reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {cancelReason === 'Other' && (
              <div style={{ marginBottom: '16px' }}>
                <textarea
                  value={cancelNote}
                  onChange={e => setCancelNote(e.target.value)}
                  disabled={cancelAppointmentMutation.isPending}
                  placeholder="Add any additional details..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 13px',
                    border: `1.5px solid ${C.border}`,
                    borderRadius: radius.sm,
                    fontSize: '13px',
                    color: C.text,
                    fontFamily: font.family,
                    resize: 'none',
                    outline: 'none',
                    boxSizing: 'border-box',
                    lineHeight: 1.5,
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = C.blue500
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = C.border
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={closeCancelModal}
                disabled={cancelAppointmentMutation.isPending}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: radius.sm,
                  border: `1.5px solid ${C.border}`,
                  background: 'transparent',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: C.textSub,
                  cursor: cancelAppointmentMutation.isPending ? 'default' : 'pointer',
                  fontFamily: font.family,
                }}
              >
                Keep Appointment
              </button>
              <button
                disabled={
                  !cancelReason ||
                  cancelAppointmentMutation.isPending ||
                  (cancelReason === 'Other' && !cancelNote.trim())
                }
                onClick={handleConfirmCancel}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: radius.sm,
                  border: 'none',
                  background:
                    !cancelReason ||
                    cancelAppointmentMutation.isPending ||
                    (cancelReason === 'Other' && !cancelNote.trim())
                      ? C.border
                      : C.error,
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#fff',
                  cursor:
                    !cancelReason || cancelAppointmentMutation.isPending
                      ? 'default'
                      : 'pointer',
                  fontFamily: font.family,
                  transition: 'opacity 0.14s',
                }}
                onMouseEnter={e => {
                  if (
                    cancelReason &&
                    !cancelAppointmentMutation.isPending &&
                    !(cancelReason === 'Other' && !cancelNote.trim())
                  ) {
                    e.currentTarget.style.opacity = '0.85'
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = '1'
                }}
              >
                {cancelAppointmentMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
