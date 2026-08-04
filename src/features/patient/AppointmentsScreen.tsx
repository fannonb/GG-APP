import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isMockApi } from '@/api/config'
import { C, font, radius, shadow } from '@/design-system/tokens'
import {
  useCancelPatientAppointmentMutation,
  usePatientAppointments,
} from '@/hooks/api'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatTime12h } from '@/utils/format'
import { getAppointmentDisplayStatus } from '@/utils/appointments'
import { appointmentRebookPath, buildAppointmentRebookState } from '@/utils/rebook'
import { useAuthStore } from '@/store/auth.store'
import { useUserStore } from '@/store/user.store'
import type { Appointment } from '@/types/user.types'

type FilterTab = 'upcoming' | 'past' | 'all'

const STATUS_CFG: Record<
  string,
  { color: string; bg: string; border: string; label: string }
> = {
  confirmed: {
    color: C.blue500,
    bg: 'rgba(56,182,255,0.1)',
    border: 'rgba(56,182,255,0.28)',
    label: 'Confirmed',
  },
  pending: {
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.28)',
    label: 'Pending',
  },
  completed: {
    color: C.navy800,
    bg: 'rgba(9,28,68,0.07)',
    border: 'rgba(9,28,68,0.18)',
    label: 'Completed',
  },
  cancelled: {
    color: C.error,
    bg: C.errorBg,
    border: 'rgba(229,71,77,0.28)',
    label: 'Cancelled',
  },
}

const CAT_LABEL: Record<string, string> = {
  doctor: 'General Practice',
  pharmacy: 'Pharmacy',
  laboratory: 'Laboratory',
  radiology: 'Radiology',
  hospital: 'Hospital',
  clinic: 'Clinic',
}

const CANCEL_REASONS = [
  'Schedule conflict',
  'Feeling better',
  'Found another provider',
  'Provider unavailable',
  'Other',
] as const

function StatusIcon({ status, color }: { status: string; color: string }) {
  if (status === 'confirmed' || status === 'completed') {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path
          d="M2 5l2.5 2.5 4-4"
          stroke={color}
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (status === 'pending') {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <circle cx="5" cy="5" r="4" stroke={color} strokeWidth="1.2" />
        <path
          d="M5 3v2.5"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="5" cy="7" r="0.65" fill={color} />
      </svg>
    )
  }

  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path
        d="M2 2l6 6M8 2L2 8"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function AppointmentCard({
  apt,
  isPast,
  onCancel,
}: {
  apt: Appointment
  isPast: boolean
  onCancel?: () => void
}) {
  const { isMobile } = useResponsive()
  const navigate = useNavigate()
  const userName = useUserStore(s => s.user.name)
  const d = new Date(apt.date)
  const displayStatus = getAppointmentDisplayStatus(apt)
  const isReschedulePending = displayStatus === 'pending' && !!apt.rescheduledAt
  const cfg = isReschedulePending
    ? { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.28)', label: 'Reschedule Pending' }
    : (STATUS_CFG[displayStatus] ?? STATUS_CFG.completed)
  const isBeneficiary = apt.forSelf === false || (apt.forSelf === undefined && apt.for !== userName && apt.for !== 'Self')

  const handleBookAgain = () => {
    navigate(appointmentRebookPath(), {
      state: buildAppointmentRebookState(apt, userName),
    })
  }

  const dateBadgeBg = isPast
    ? 'linear-gradient(145deg, rgba(9,28,68,0.06), rgba(9,28,68,0.03))'
    : `linear-gradient(145deg, ${cfg.bg}, ${cfg.bg.replace('0.1)', '0.05)')})`
  const dateBadgeBorder = isPast ? C.border : cfg.border
  const dateColor = isPast ? C.textSub : cfg.color

  return (
    <div
      style={{
        display: 'flex',
        gap: isMobile ? '14px' : '20px',
        padding: isMobile ? '18px 16px' : '22px 24px',
        background: '#fff',
        borderRadius: radius.lg,
        border: `1px solid ${C.border}`,
        boxShadow: shadow.sm,
        transition: 'all 0.18s ease',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = shadow.md
        e.currentTarget.style.borderColor = isPast ? C.borderDark : cfg.border
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = shadow.sm
        e.currentTarget.style.borderColor = C.border
        e.currentTarget.style.transform = 'none'
      }}
    >
      <div
        style={{
          width: isMobile ? 58 : 68,
          minWidth: isMobile ? 58 : 68,
          height: isMobile ? 68 : 78,
          borderRadius: '14px',
          background: dateBadgeBg,
          border: `1.5px solid ${dateBadgeBorder}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: isPast ? 'none' : `0 3px 10px ${cfg.bg}`,
        }}
      >
        <div
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: dateColor,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            opacity: 0.8,
          }}
        >
          {d.toLocaleDateString('en-US', { weekday: 'short' })}
        </div>
        <div
          style={{
            fontSize: isMobile ? '26px' : '30px',
            fontWeight: 900,
            color: dateColor,
            lineHeight: 1,
            letterSpacing: '-0.05em',
            margin: '1px 0',
          }}
        >
          {d.getDate()}
        </div>
        <div
          style={{
            fontSize: '10px',
            fontWeight: 800,
            color: dateColor,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            opacity: 0.85,
          }}
        >
          {d.toLocaleDateString('en-US', { month: 'short' })}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '14px' : '0',
          alignItems: isMobile ? 'flex-start' : 'center',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '2px 9px',
              borderRadius: radius.full,
              background: C.bg,
              border: `1px solid ${C.border}`,
              marginBottom: '7px',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: C.textSub,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}
            >
              {CAT_LABEL[apt.category] ?? apt.category}
            </span>
          </div>

          <div
            style={{
              fontSize: isMobile ? '15px' : '16px',
              fontWeight: 800,
              color: C.text,
              letterSpacing: '-0.02em',
              marginBottom: '6px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {apt.provider}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
              marginBottom: '9px',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke={C.textSub} strokeWidth="1.2" />
              <path
                d="M6 3.5v2.5l1.5 1.5"
                stroke={C.textSub}
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <span style={{ fontSize: '13px', color: C.textSub, fontWeight: 600 }}>
              {formatTime12h(apt.time)}
            </span>
            <span style={{ color: C.border }}>-</span>
            <span
              style={{
                fontSize: '13px',
                color: C.textSub,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {apt.service}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {isBeneficiary ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 9px',
                  borderRadius: radius.full,
                  background: 'rgba(56,182,255,0.08)',
                  border: '1px solid rgba(56,182,255,0.2)',
                }}
              >
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="3.5" r="2" stroke={C.blue500} strokeWidth="1.2" />
                  <path
                    d="M1 9.5c0-2.2 1.8-4 4-4s4 1.8 4 4"
                    stroke={C.blue500}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                <span style={{ fontSize: '11px', color: C.blue500, fontWeight: 600 }}>
                  {apt.for}
                </span>
              </div>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <circle
                    cx="5"
                    cy="3.5"
                    r="2"
                    stroke={C.textLight}
                    strokeWidth="1.2"
                  />
                  <path
                    d="M1 9.5c0-2.2 1.8-4 4-4s4 1.8 4 4"
                    stroke={C.textLight}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                <span style={{ fontSize: '11px', color: C.textLight }}>Self</span>
              </div>
            )}
            {isPast && (
              <span style={{ fontSize: '11px', color: C.textLight, marginLeft: '2px' }}>
                {d.getFullYear()}
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMobile ? 'flex-start' : 'flex-end',
            gap: '10px',
            flexShrink: 0,
            marginLeft: isMobile ? '0' : '16px',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 13px',
              borderRadius: radius.full,
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
            }}
          >
            <StatusIcon status={displayStatus} color={cfg.color} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: cfg.color }}>
              {cfg.label}
            </span>
          </div>

          {!isPast && displayStatus === 'confirmed' && (
            <button
              onClick={onCancel}
              style={{
                padding: '7px 16px',
                borderRadius: radius.sm,
                border: `1px solid ${C.border}`,
                background: 'transparent',
                fontSize: '12px',
                fontWeight: 600,
                color: C.textSub,
                cursor: 'pointer',
                fontFamily: font.family,
                transition: 'all 0.14s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = C.error
                e.currentTarget.style.color = C.error
                e.currentTarget.style.background = C.errorBg
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.border
                e.currentTarget.style.color = C.textSub
                e.currentTarget.style.background = 'transparent'
              }}
            >
              Cancel
            </button>
          )}

          {!isPast && displayStatus === 'pending' && !apt.rescheduledAt && (
            <span
              style={{
                fontSize: '11px',
                color: C.textLight,
                fontStyle: 'italic',
                maxWidth: '110px',
                textAlign: 'right',
                lineHeight: 1.4,
              }}
            >
              Awaiting provider confirmation
            </span>
          )}

          {!isPast && displayStatus === 'pending' && apt.rescheduledAt && (
            <button
              onClick={() => navigate(`/app/appointments/${apt.id}/reschedule`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 14px',
                borderRadius: radius.sm,
                border: `1.5px solid rgba(74,173,223,0.4)`,
                background: C.blue100,
                fontSize: '12px',
                fontWeight: 700,
                color: C.blue500,
                cursor: 'pointer',
                fontFamily: font.family,
                transition: 'all 0.14s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(74,173,223,0.18)'
                e.currentTarget.style.borderColor = C.blue500
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = C.blue100
                e.currentTarget.style.borderColor = 'rgba(74,173,223,0.4)'
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 5h8M5.5 2L8.5 5l-3 3" stroke={C.blue500} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Review
            </button>
          )}

          {isPast && displayStatus === 'completed' && (
            <button
              onClick={handleBookAgain}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: radius.sm,
                border: 'none',
                background: C.navy800,
                fontSize: '12px',
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer',
                fontFamily: font.family,
                transition: 'opacity 0.14s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Book Again
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2 5h6M5.5 2.5L8 5l-2.5 2.5"
                  stroke="#fff"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          {isPast && displayStatus === 'cancelled' && (
            <button
              onClick={handleBookAgain}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: radius.sm,
                border: '1px solid rgba(56,182,255,0.3)',
                background: 'rgba(56,182,255,0.08)',
                fontSize: '12px',
                fontWeight: 600,
                color: C.blue500,
                cursor: 'pointer',
                fontFamily: font.family,
                transition: 'all 0.14s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = C.blue100
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(56,182,255,0.08)'
              }}
            >
              Rebook
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2 5h6M5.5 2.5L8 5l-2.5 2.5"
                  stroke={C.blue500}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ label, sub }: { label: string; sub: string }) {
  const navigate = useNavigate()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '56px 24px',
        background: '#fff',
        borderRadius: radius.lg,
        border: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '16px',
          background: C.bg,
          border: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <rect
            x="2"
            y="4"
            width="22"
            height="20"
            rx="3"
            stroke={C.blue500}
            strokeWidth="1.5"
          />
          <path
            d="M2 10h22M8.5 2v4M17.5 2v4"
            stroke={C.blue500}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M8 16l3 3 6-6"
            stroke={C.blue500}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '20px' }}>{sub}</div>
      <button
        onClick={() => navigate('/app/services')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 22px',
          borderRadius: radius.sm,
          border: 'none',
          background: C.navy800,
          fontSize: '13px',
          fontWeight: 600,
          color: '#fff',
          cursor: 'pointer',
          fontFamily: font.family,
          transition: 'opacity 0.14s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Find a Service
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 6h8M6.5 3L9.5 6l-3 3"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}

export function AppointmentsScreen() {
  const { isMobile } = useResponsive()
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
  const upcoming = isNew
    ? []
    : (data?.upcoming ?? []).filter(appointment => {
        const status = getAppointmentDisplayStatus(appointment)
        return status !== 'cancelled' && status !== 'completed'
      })
  const past = isNew
    ? []
    : [
        ...(data?.past ?? []),
        ...(data?.upcoming ?? []).filter(appointment => {
          const status = getAppointmentDisplayStatus(appointment)
          return status === 'completed' || status === 'cancelled'
        }),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const all = (
    isNew
      ? []
      : [...past, ...upcoming]
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const completedCount = past.filter(a => getAppointmentDisplayStatus(a) === 'completed').length

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { id: 'past', label: 'Past', count: past.length },
    { id: 'all', label: 'All', count: all.length },
  ]

  const pastGrouped = past.reduce<Record<string, Appointment[]>>((acc, apt) => {
    const key = new Date(apt.date).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
    if (!acc[key]) acc[key] = []
    acc[key].push(apt)
    return acc
  }, {})

  return (
    <AppLayout title="Appointments" subtitle="Your healthcare schedule" notifCount={2}>
      <div
        style={{
          maxWidth: 860,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          fontFamily: font.family,
        }}
      >
        {cancelToast && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: radius.sm,
              background: C.successBg,
              border: '1px solid rgba(34,201,138,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'rgba(34,201,138,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path
                  d="M2 6.5l3 3 6-6"
                  stroke="#22C98A"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0D6B47' }}>
                Appointment cancelled
              </div>
              <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>
                Your appointment with {cancelToast} has been cancelled. The provider has
                been notified.
              </div>
            </div>
            <button
              onClick={() => setCancelToast(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: C.textSub,
                fontSize: '18px',
                lineHeight: 1,
                padding: '0 4px',
              }}
            >
              x
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            {
              label: 'Upcoming',
              val: upcoming.length,
              color: C.blue500,
              icon: (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect
                    x="1.5"
                    y="3"
                    width="15"
                    height="13.5"
                    rx="2.5"
                    stroke={C.blue500}
                    strokeWidth="1.4"
                  />
                  <path
                    d="M1.5 7.5h15M6 1.5v3M12 1.5v3"
                    stroke={C.blue500}
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                  <circle cx="9" cy="11.5" r="1.8" fill={C.blue500} />
                </svg>
              ),
            },
            {
              label: 'Completed',
              val: completedCount,
              color: C.navy800,
              icon: (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke={C.navy800} strokeWidth="1.4" />
                  <path
                    d="M5.5 9l2.5 2.5 4.5-4.5"
                    stroke={C.navy800}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ),
            },
            {
              label: 'Total',
              val: all.length,
              color: C.textSub,
              icon: (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect
                    x="1.5"
                    y="3"
                    width="15"
                    height="13.5"
                    rx="2.5"
                    stroke={C.textSub}
                    strokeWidth="1.4"
                  />
                  <path
                    d="M1.5 7.5h15M6 1.5v3M12 1.5v3"
                    stroke={C.textSub}
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M5 11h8M5 13.5h5"
                    stroke={C.textSub}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              ),
            },
          ].map(s => (
            <div
              key={s.label}
              style={{
                padding: isMobile ? '16px' : '20px 22px',
                background: '#fff',
                borderRadius: radius.lg,
                border: `1px solid ${C.border}`,
                boxShadow: shadow.sm,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: C.textSub,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  {s.label}
                </div>
                <div style={{ opacity: 0.6 }}>{s.icon}</div>
              </div>
              <div
                style={{
                  fontSize: isMobile ? '32px' : '38px',
                  fontWeight: 900,
                  color: s.color,
                  letterSpacing: '-0.06em',
                  lineHeight: 1,
                }}
              >
                {s.val}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            background: '#fff',
            borderRadius: radius.lg,
            border: `1px solid ${C.border}`,
            padding: '4px',
            boxShadow: shadow.sm,
            gap: '2px',
          }}
        >
          {tabs.map(t => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1,
                  padding: '11px 12px',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontFamily: font.family,
                  background: active ? C.navy800 : 'transparent',
                  color: active ? '#fff' : C.textSub,
                  fontSize: '13px',
                  fontWeight: active ? 700 : 500,
                  transition: 'all 0.18s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                }}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.background = C.bg
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.background = 'transparent'
                }}
              >
                {t.label}
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 8px',
                    borderRadius: radius.full,
                    background: active ? C.blue500 : C.bg,
                    color: active ? C.navy800 : C.textSub,
                    border: active ? 'none' : `1px solid ${C.border}`,
                    transition: 'all 0.18s ease',
                  }}
                >
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>

        {tab === 'upcoming' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {upcoming.length === 0 ? (
              <EmptyState
                label="No upcoming appointments"
                sub="Find a service and request an engagement to get started."
              />
            ) : (
              <>
                {(() => {
                  const next = upcoming[0]
                  const nextDate = new Date(next.date)
                  const daysAway = Math.ceil(
                    (nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                  )

                  return (
                    <div
                      style={{
                        padding: '20px 24px',
                        background: 'linear-gradient(135deg, #EBF8FF 0%, #F4FBFF 100%)',
                        borderRadius: radius.lg,
                        border: '1px solid rgba(56,182,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        flexWrap: 'wrap',
                        boxShadow: '0 6px 24px rgba(56,182,255,0.15)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 58,
                          minWidth: 58,
                          height: 64,
                          borderRadius: '14px',
                          background: C.blue500,
                          boxShadow: '0 4px 14px rgba(56,182,255,0.4)',
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            color: 'rgba(255,255,255,0.75)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                          }}
                        >
                          {nextDate.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div
                          style={{
                            fontSize: '28px',
                            fontWeight: 900,
                            color: '#fff',
                            lineHeight: 1,
                            letterSpacing: '-0.05em',
                            margin: '1px 0',
                          }}
                        >
                          {nextDate.getDate()}
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            color: 'rgba(255,255,255,0.75)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                          }}
                        >
                          {nextDate.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                      </div>

                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 10px',
                            borderRadius: radius.full,
                            background: C.blue500,
                            marginBottom: '8px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              color: '#fff',
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                            }}
                          >
                            Next Up
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '15px',
                            fontWeight: 800,
                            color: C.navy800,
                            letterSpacing: '-0.02em',
                            lineHeight: 1.25,
                            marginBottom: '4px',
                          }}
                        >
                          {next.provider}
                        </div>
                        <div style={{ fontSize: '13px', color: C.textSub, fontWeight: 500 }}>
                          {formatTime12h(next.time)} - {next.service}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: '26px',
                            fontWeight: 900,
                            color: C.navy800,
                            letterSpacing: '-0.05em',
                            lineHeight: 1,
                          }}
                        >
                          {daysAway === 0 ? '-' : Math.abs(daysAway)}
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: C.textSub,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            marginTop: '2px',
                          }}
                        >
                          {daysAway === 0 ? 'Today' : daysAway < 0 ? 'days ago' : 'days away'}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {upcoming.map(apt => (
                  <AppointmentCard
                    key={apt.id}
                    apt={apt}
                    isPast={false}
                    onCancel={() => setCancelTarget(apt)}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {tab === 'past' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {past.length === 0 ? (
              <EmptyState
                label="No past appointments yet"
                sub="Your appointment history will appear here."
              />
            ) : (
              Object.entries(pastGrouped).map(([month, apts]) => (
                <div key={month}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: C.textSub,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {month}
                    </div>
                    <div style={{ flex: 1, height: '1px', background: C.border }} />
                    <div style={{ fontSize: '11px', color: C.textLight, whiteSpace: 'nowrap' }}>
                      {apts.length} appointment{apts.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {apts.map(apt => (
                      <AppointmentCard key={apt.id} apt={apt} isPast={true} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'all' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {all.map(apt => {
              const displayStatus = getAppointmentDisplayStatus(apt)
              const isPast =
                displayStatus === 'completed' ||
                displayStatus === 'cancelled' ||
                new Date(apt.date) < new Date()
              return (
                <AppointmentCard
                  key={apt.id}
                  apt={apt}
                  isPast={isPast}
                  onCancel={
                    !isPast && displayStatus === 'confirmed'
                      ? () => setCancelTarget(apt)
                      : undefined
                  }
                />
              )
            })}
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
                letterSpacing: '-0.02em',
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
