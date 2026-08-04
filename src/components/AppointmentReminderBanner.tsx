import { GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { formatDate, formatTime12h } from '@/utils/format'
import { getAppointmentUrgency } from '@/utils/appointments'

interface AppointmentReminderSource {
  id: string
  patient: string
  service: string
  date: string
  time: string
}

interface AppointmentReminderBannerProps {
  appointment: AppointmentReminderSource
  variant: 'new-request' | 'upcoming'
  onView: () => void
}

export function AppointmentReminderBanner({
  appointment,
  variant,
  onView,
}: AppointmentReminderBannerProps) {
  const urgency = getAppointmentUrgency(appointment.date)
  const appointmentDate = formatDate(appointment.date)
  const appointmentTime = formatTime12h(appointment.time)

  if (variant === 'new-request') {
    return (
      <div style={{
        padding: '18px 22px',
        background: 'linear-gradient(90deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
        borderRadius: radius.lg,
        border: '1.5px solid rgba(245,158,11,0.32)',
        display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap',
        boxShadow: '0 2px 12px rgba(245,158,11,0.12)',
        fontFamily: font.family,
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: '12px',
          background: '#F59E0B',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: '0 3px 10px rgba(245,158,11,0.35)',
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="2" y="3.5" width="18" height="16" rx="2.5" stroke="#fff" strokeWidth="1.5"/>
            <path d="M2 8.5h18M7 2v3M15 2v3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="11" cy="14" r="2.5" stroke="#fff" strokeWidth="1.3"/>
            <path d="M11 12.5v1.5l1 1" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400E', marginBottom: '3px', letterSpacing: '-0.01em' }}>
            New Booking Request
            {urgency ? ` · ${urgency.label}` : ''}
          </div>
          <div style={{ fontSize: '13px', color: '#A16207', lineHeight: 1.5 }}>
            <strong>{appointment.patient}</strong> requested {appointment.service} on {appointmentDate} at {appointmentTime}.
          </div>
        </div>
        <GGButton
          variant="primary"
          size="sm"
          onClick={onView}
          style={{
            background: '#F59E0B',
            border: 'none',
            boxShadow: '0 2px 8px rgba(245,158,11,0.30)',
            flexShrink: 0,
          }}
        >
          Review Request →
        </GGButton>
      </div>
    )
  }

  const isToday = urgency?.isToday ?? false
  const isTomorrow = urgency?.isTomorrow ?? false
  const headline = isToday
    ? `Appointment Today — ${appointmentTime}`
    : isTomorrow
      ? `Appointment Tomorrow — ${appointmentTime}`
      : `Upcoming Appointment — ${urgency?.label ?? appointmentDate}`

  const accent = isToday ? C.error : isTomorrow ? '#F59E0B' : C.blue500
  const accentDark = isToday ? '#C0393F' : isTomorrow ? '#A16207' : C.blue500
  const accentBg = isToday
    ? 'linear-gradient(90deg, rgba(229,71,77,0.08), rgba(229,71,77,0.04))'
    : isTomorrow
      ? 'linear-gradient(90deg, rgba(245,158,11,0.10), rgba(245,158,11,0.04))'
      : 'linear-gradient(90deg, rgba(56,182,255,0.10), rgba(56,182,255,0.04))'
  const accentBorder = isToday
    ? 'rgba(229,71,77,0.28)'
    : isTomorrow
      ? 'rgba(245,158,11,0.30)'
      : 'rgba(56,182,255,0.28)'

  return (
    <div style={{
      padding: '18px 22px',
      background: accentBg,
      borderRadius: radius.lg,
      border: `1.5px solid ${accentBorder}`,
      display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap',
      boxShadow: `0 2px 12px ${isToday ? 'rgba(229,71,77,0.1)' : isTomorrow ? 'rgba(245,158,11,0.12)' : 'rgba(56,182,255,0.10)'}`,
      fontFamily: font.family,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: '12px',
        background: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: `0 3px 10px ${accent}55`,
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="2" y="3.5" width="18" height="16" rx="2.5" stroke="#fff" strokeWidth="1.5"/>
          <path d="M2 8.5h18M7 2v3M15 2v3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/>
          <circle cx="11" cy="14" r="2.5" stroke="#fff" strokeWidth="1.3"/>
          <path d="M11 12.5v1.5l1 1" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: accentDark, marginBottom: '3px', letterSpacing: '-0.01em' }}>
          {headline}
        </div>
        <div style={{ fontSize: '13px', color: isToday || isTomorrow ? accentDark : C.textSub, lineHeight: 1.5 }}>
          <strong>{appointment.patient}</strong> · {appointment.service}
          {!isToday && !isTomorrow && (
            <span> · {appointmentDate} at {appointmentTime}</span>
          )}
        </div>
      </div>
      <GGButton
        variant="primary"
        size="sm"
        onClick={onView}
        style={{
          background: accent,
          border: 'none',
          boxShadow: `0 2px 8px ${accent}55`,
          flexShrink: 0,
        }}
      >
        View Appointment →
      </GGButton>
    </div>
  )
}
