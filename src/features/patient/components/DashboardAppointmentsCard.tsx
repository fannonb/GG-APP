import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton } from '@/design-system'
import { C } from '@/design-system/tokens'
import { formatTime12h } from '@/utils/format'
import { getAppointmentDisplayStatus, getAppointmentUrgency } from '@/utils/appointments'
import { useUserStore } from '@/store/user.store'
import type { Appointment } from '@/types/user.types'

type EmptyVariant = 'default' | 'first-time'

interface DashboardAppointmentsCardProps {
  appointments: Appointment[]
  emptyVariant?: EmptyVariant
}

export function DashboardAppointmentsCard({
  appointments,
  emptyVariant = 'default',
}: DashboardAppointmentsCardProps) {
  const navigate = useNavigate()
  const userName = useUserStore(s => s.user.name)

  return (
    <GGCard padding="24px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '9px', background: 'rgba(74,173,223,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="2.5" width="14" height="12" rx="2" stroke={C.blue500} strokeWidth="1.4"/>
              <path d="M1 6.5h14M5 1v3M11 1v3" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="8" cy="10.5" r="1.4" fill={C.blue500}/>
            </svg>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Appointments</div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/app/appointments')}
          style={{ all: 'unset', fontSize: '13px', color: C.blue500, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          View all →
        </button>
      </div>

      {appointments.length === 0 ? (
        emptyVariant === 'first-time' ? (
          <div style={{ padding: '16px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>
              No appointments yet
            </div>
            <div style={{ fontSize: '12px', color: C.textSub, marginTop: '6px', lineHeight: 1.5 }}>
              Find a verified provider and book your first visit.
            </div>
            <div style={{ marginTop: '12px' }}>
              <GGButton variant="primary" size="sm" onClick={() => navigate('/app/services')}>
                Book first appointment
              </GGButton>
            </div>
          </div>
        ) : (
          <div style={{ padding: '8px 0 4px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.textSub }}>No upcoming appointments</div>
            <button
              type="button"
              onClick={() => navigate('/app/services')}
              style={{
                marginTop: 8,
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '12px',
                color: C.blue500,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Book via Find Service →
            </button>
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {appointments.map((apt, i) => {
            const aptDate = new Date(apt.date)
            const displayStatus = getAppointmentDisplayStatus(apt)
            const urgency = getAppointmentUrgency(apt.date)
            const dayNum = aptDate.getDate()
            const monthStr = aptDate.toLocaleDateString('en-US', { month: 'short' })
            const isConfirmed = displayStatus === 'confirmed'
            const isCompleted = displayStatus === 'completed'
            const isReschedulePending = displayStatus === 'pending' && !!apt.rescheduledAt
            const isBeneficiary = apt.for !== userName

            const dateBadgeColor = isConfirmed
              ? C.blue500
              : isCompleted
              ? C.navy800
              : isReschedulePending
              ? '#7C3AED'
              : C.warning
            const dateBadgeBg = isConfirmed
              ? 'linear-gradient(145deg, rgba(56,182,255,0.16), rgba(56,182,255,0.07))'
              : isCompleted
              ? 'linear-gradient(145deg, rgba(9,28,68,0.12), rgba(9,28,68,0.05))'
              : isReschedulePending
              ? 'linear-gradient(145deg, rgba(124,58,237,0.18), rgba(124,58,237,0.08))'
              : 'linear-gradient(145deg, rgba(245,166,35,0.18), rgba(245,166,35,0.08))'
            const dateBadgeBorder = isConfirmed
              ? 'rgba(56,182,255,0.28)'
              : isCompleted
              ? 'rgba(9,28,68,0.18)'
              : isReschedulePending
              ? 'rgba(124,58,237,0.3)'
              : 'rgba(245,166,35,0.3)'

            const urgencyColor = urgency?.isToday ? '#DC2626' : '#D97706'
            const urgencyBg = urgency?.isToday ? 'rgba(220,38,38,0.09)' : 'rgba(245,158,11,0.11)'

            const handleClick = () => {
              if (isReschedulePending) {
                navigate(`/app/appointments/${apt.id}/reschedule`)
              } else {
                navigate('/app/appointments')
              }
            }

            return (
              <button
                key={apt.id}
                type="button"
                onClick={handleClick}
                style={{
                  all: 'unset',
                  display: 'flex', gap: '14px', padding: '14px 0',
                  borderBottom: i < appointments.length - 1 ? `1px solid ${C.border}` : 'none',
                  cursor: 'pointer',
                  width: '100%', boxSizing: 'border-box',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.80' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
              >
                {/* Date badge */}
                <div style={{
                  width: 54, minWidth: 54, height: 62,
                  borderRadius: '14px',
                  background: dateBadgeBg,
                  border: `1.5px solid ${dateBadgeBorder}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: `0 2px 8px ${
                    isConfirmed
                      ? 'rgba(56,182,255,0.12)'
                      : isCompleted
                      ? 'rgba(9,28,68,0.08)'
                      : isReschedulePending
                      ? 'rgba(124,58,237,0.12)'
                      : 'rgba(245,166,35,0.12)'
                  }`,
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: dateBadgeColor, lineHeight: 1, letterSpacing: '-0.04em' }}>{dayNum}</div>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: dateBadgeColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '3px', opacity: 0.85 }}>{monthStr}</div>
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {/* Provider name + urgency badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', marginBottom: '5px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{apt.provider}</div>
                    {urgency && !isCompleted && (
                      <span style={{
                        fontSize: '9px', fontWeight: 800,
                        color: urgencyColor, background: urgencyBg,
                        padding: '2px 7px', borderRadius: '20px',
                        letterSpacing: '0.07em', textTransform: 'uppercase', flexShrink: 0,
                      }}>
                        {urgency.label}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '7px' }}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke={C.textSub} strokeWidth="1.2"/><path d="M6 3.5v2.5l1.5 1.5" stroke={C.textSub} strokeWidth="1.2" strokeLinecap="round"/></svg>
                    <span style={{ fontSize: '12px', color: C.textSub, fontWeight: 500 }}>{formatTime12h(apt.time)}</span>
                    <span style={{ fontSize: '12px', color: C.border }}>·</span>
                    <span style={{ fontSize: '12px', color: C.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.service}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {isBeneficiary && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '20px', background: 'rgba(56,182,255,0.08)', border: '1px solid rgba(56,182,255,0.2)', flexShrink: 0 }}>
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="3.5" r="2" stroke={C.blue500} strokeWidth="1.2"/><path d="M1 9.5c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke={C.blue500} strokeWidth="1.2" strokeLinecap="round"/></svg>
                        <span style={{ fontSize: '11px', color: C.blue500, fontWeight: 600 }}>{apt.for}</span>
                      </div>
                    )}
                    {isReschedulePending ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}>
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><rect x="1" y="1.5" width="8" height="7" rx="1.5" stroke="#7C3AED" strokeWidth="1.2"/><path d="M1 4h8M3.5 0.5v2M6.5 0.5v2" stroke="#7C3AED" strokeWidth="1.1" strokeLinecap="round"/></svg>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED' }}>Reschedule → Review</span>
                      </div>
                    ) : (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '3px 10px', borderRadius: '20px',
                        background: isCompleted ? 'rgba(9,28,68,0.06)' : isConfirmed ? C.blue100 : 'rgba(245,166,35,0.12)',
                        border: `1px solid ${isCompleted ? 'rgba(9,28,68,0.14)' : isConfirmed ? 'rgba(56,182,255,0.28)' : 'rgba(245,166,35,0.28)'}`,
                      }}>
                        {isConfirmed
                          ? <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke={C.blue500} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          : isCompleted
                          ? <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke={C.navy800} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          : <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="#F59E0B" strokeWidth="1.2"/><path d="M5 3v2.5" stroke="#F59E0B" strokeWidth="1.4" strokeLinecap="round"/><circle cx="5" cy="7" r="0.6" fill="#F59E0B"/></svg>
                        }
                        <span style={{ fontSize: '11px', fontWeight: 700, color: isCompleted ? C.navy800 : isConfirmed ? C.blue500 : '#92400E' }}>
                          {isCompleted ? 'Completed' : isConfirmed ? 'Confirmed' : 'Pending'}
                        </span>
                      </div>
                    )}

                    {/* Inline CTA for urgent confirmed appointments */}
                    {isConfirmed && urgency && !isCompleted && (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: C.blue500, marginLeft: 'auto' }}>
                        View →
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </GGCard>
  )
}
