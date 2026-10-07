import { useNavigate } from 'react-router-dom'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { ROUTES } from '@/router/routes'
import { formatTime12h } from '@/utils/format'
import { getAppointmentDisplayStatus } from '@/utils/appointments'
import type { Appointment } from '@/types/user.types'

interface DashboardNextAppointmentCardProps {
  /** Upcoming (not completed/cancelled) appointments. */
  appointments: Appointment[]
}

export function DashboardNextAppointmentCard({ appointments }: DashboardNextAppointmentCardProps) {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()

  const next = [...appointments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )[0]

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: `1px solid ${C.border}`,
    borderRadius: radius.lg,
    padding: isMobile ? '18px' : '22px 24px',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font.family,
    boxSizing: 'border-box',
    minHeight: isMobile ? 'auto' : 196,
  }

  // Same header pattern as the wallet card so the pair reads as one row.
  const label = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: C.blue100,
          color: '#0B7BC0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
          <rect x="3" y="4.5" width="14" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 8.5h14M7 2.75v3M13 2.75v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>Next appointment</div>
    </div>
  )

  if (!next) {
    return (
      <section aria-label="Next appointment" style={cardStyle}>
        {label}
        <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginTop: 20, letterSpacing: '-0.02em' }}>
          Nothing booked yet
        </div>
        <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, lineHeight: 1.5 }}>
          Find a verified provider and request a time that suits you.
        </div>
        <button
          type="button"
          onClick={() => navigate(ROUTES.FIND_SERVICE)}
          style={{
            marginTop: 'auto',
            alignSelf: 'flex-start',
            height: 38,
            padding: '0 16px',
            borderRadius: radius.sm,
            border: '1px solid rgba(11,123,192,0.35)',
            background: '#fff',
            color: '#0B7BC0',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: font.family,
            cursor: 'pointer',
          }}
        >
          Book care
        </button>
      </section>
    )
  }

  const status = getAppointmentDisplayStatus(next)
  const confirmed = status === 'confirmed'
  const date = new Date(next.date)
  const awaitingReply = status === 'pending' && !!next.rescheduledAt

  return (
    <button
      type="button"
      aria-label="Next appointment"
      onClick={() => navigate(awaitingReply ? `/app/appointments/${next.id}/reschedule` : ROUTES.APPOINTMENTS)}
      style={{ ...cardStyle, cursor: 'pointer', textAlign: 'left', width: '100%', color: 'inherit' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        {label}
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: radius.full,
            color: confirmed ? '#15803D' : '#B45309',
            background: confirmed ? 'rgba(34,197,94,0.12)' : 'rgba(245,166,35,0.14)',
          }}
        >
          {confirmed ? 'Confirmed' : 'Awaiting provider'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 20 }}>
        <div
          style={{
            width: 52,
            borderRadius: 12,
            background: 'linear-gradient(160deg, #38B6FF 0%, #0B7BC0 100%)',
            boxShadow: '0 6px 14px rgba(11,123,192,0.25)',
            textAlign: 'center',
            padding: '7px 0',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {date.toLocaleDateString('en-US', { month: 'short' })}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{date.getDate()}</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>
            {date.toLocaleDateString('en-US', { weekday: 'long' })} · {formatTime12h(next.time)}
          </div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {next.provider} · {next.service}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 16, fontSize: 13, fontWeight: 700, color: '#0B7BC0' }}>
        {appointments.length > 1 ? `View all ${appointments.length} appointments →` : 'View appointment →'}
      </div>
    </button>
  )
}
