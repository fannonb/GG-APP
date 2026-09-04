import { useNavigate } from 'react-router-dom'
import { GGBadge, GGButton, GGCard } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { useUpdateSPAppointmentStatusMutation } from '@/hooks/api'
import { route, ROUTES } from '@/router/routes'
import type { Appointment } from '@/types/appointment.types'
import type { Payment } from '@/types/invoice.types'
import type { PrescriptionRequest } from '@/types/prescription.types'
import { getAppointmentDisplayStatus, getDaysUntilAppointment } from '@/utils/appointments'
import { formatCurrency, formatDate, formatRelativeTime, formatTime12h } from '@/utils/format'
import { SP_ONBOARDING_STEP_COUNT } from '@/store/auth.store'
import type { SpSetupStep } from '@/utils/sp-onboarding'
import { useResponsive } from '@/hooks/useResponsive'

interface SPDashboardWorkspaceProps {
  upcomingSchedule: Appointment[]
  prescriptionRequests?: PrescriptionRequest[]
  showAppointments?: boolean
  showPrescriptions?: boolean
  recentPayments: Payment[]
  onboardingComplete: boolean
  setupSteps: SpSetupStep[]
  doneCount: number
  onStepAction: (stepN: number, ctaPath: string | null) => void
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
      gap: '12px',
    }}>
      <div style={{ fontSize: '15px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>
        {title}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            border: 'none',
            background: 'transparent',
            color: C.blue500,
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '13px',
            fontFamily: font.family,
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

function QueueCardHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string
  subtitle: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div style={{
      padding: '16px 20px',
      background: C.surface,
      borderBottom: `1px solid ${C.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
    }}>
      <div>
        <div style={{ fontSize: '15px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>
          {title}
        </div>
        <div style={{ fontSize: '11px', color: C.textSub, marginTop: '2px' }}>{subtitle}</div>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            border: 'none',
            background: 'transparent',
            color: C.blue500,
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '13px',
            fontFamily: font.family,
            padding: '4px 0',
            flexShrink: 0,
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

function PrescriptionRequestRow({ request, isLast }: { request: PrescriptionRequest; isLast: boolean }) {
  const navigate = useNavigate()
  const attachmentLabel = request.attachment?.name?.trim() || 'Prescription attached'
  const fulfillment = request.fulfillmentMode === 'delivery' ? 'Delivery' : 'Pickup'

  return (
    <button
      type="button"
      onClick={() => navigate(route.spPrescription(request.id))}
      style={{
        all: 'unset',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        boxSizing: 'border-box',
        padding: '14px 16px',
        marginBottom: isLast ? 0 : '8px',
        background: C.surface,
        border: '1px solid rgba(56,182,255,0.28)',
        borderRadius: radius.lg,
        cursor: 'pointer',
        fontFamily: font.family,
        textAlign: 'left',
        flexWrap: 'wrap',
      }}
    >
      <div style={{
        width: 42,
        height: 42,
        borderRadius: radius.md,
        background: C.blue100,
        color: C.blue500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <rect x="4" y="2" width="14" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M8 7h6M8 11h6M8 15h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 800,
            color: C.navy800,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {request.patient ?? 'Patient'}
          </div>
          <GGBadge type="navy" size="sm">New</GGBadge>
        </div>
        <div style={{ fontSize: '12px', color: C.textSub, marginTop: '3px' }}>
          {request.id} · Uploaded {formatRelativeTime(request.submittedAt)}
        </div>
        <div style={{
          fontSize: '12px',
          color: C.textSub,
          marginTop: '2px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {attachmentLabel} · {fulfillment}
        </div>
      </div>
      <span style={{ fontSize: '12px', fontWeight: 700, color: C.blue500, flexShrink: 0 }}>
        Review & quote →
      </span>
    </button>
  )
}

export function PrescriptionRequestsCard({
  requests,
  showWhenEmpty = false,
}: {
  requests: PrescriptionRequest[]
  showWhenEmpty?: boolean
}) {
  const navigate = useNavigate()
  if (requests.length === 0 && !showWhenEmpty) return null

  const visible = requests.slice(0, 3)

  return (
    <GGCard padding="0" style={{ overflow: 'hidden' }}>
      <QueueCardHeader
        title="Prescription quotes"
        subtitle={
          requests.length === 0
            ? 'No quotes waiting right now'
            : `${requests.length} prescription${requests.length === 1 ? '' : 's'} awaiting a quote`
        }
        actionLabel="View all"
        onAction={() => navigate(ROUTES.SP_PRESCRIPTIONS)}
      />
      {requests.length === 0 ? (
        <div style={{ padding: '28px 18px', textAlign: 'center', background: C.bg }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family }}>
            No prescription quotes yet
          </div>
          <div
            style={{
              fontSize: '13px',
              color: C.textSub,
              marginTop: '6px',
              lineHeight: 1.55,
              maxWidth: 300,
              marginInline: 'auto',
              fontFamily: font.family,
            }}
          >
            When patients upload a prescription to your pharmacy, quote requests will appear here.
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 14px 14px', background: C.bg }}>
          {visible.map((request, index) => (
            <PrescriptionRequestRow
              key={request.id}
              request={request}
              isLast={index === visible.length - 1}
            />
          ))}
        </div>
      )}
    </GGCard>
  )
}

function visitActionKind(appointment: Appointment): 'confirm' | 'record' | null {
  const displayStatus = getAppointmentDisplayStatus(appointment)
  if (displayStatus === 'new') return 'confirm'
  if (displayStatus === 'confirmed' && getDaysUntilAppointment(appointment.date) <= 0) return 'record'
  return null
}

function VisitActions({ appointment }: { appointment: Appointment }) {
  const navigate = useNavigate()
  const updateStatus = useUpdateSPAppointmentStatusMutation()
  const kind = visitActionKind(appointment)
  const confirming = updateStatus.isPending && updateStatus.variables?.id === appointment.id

  if (!kind) return null

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {kind === 'confirm' && (
        <GGButton
          variant="success"
          size="xs"
          disabled={confirming}
          onClick={() => updateStatus.mutate({ id: appointment.id, payload: { status: 'confirmed' } })}
        >
          {confirming ? 'Saving...' : 'Confirm'}
        </GGButton>
      )}
      {kind === 'record' && (
        <GGButton
          variant="primary"
          size="xs"
          onClick={() => navigate('/sp/visits/record', {
            state: {
              ctx: {
                patientId: appointment.patientId,
                patientName: appointment.patient,
                appointmentId: appointment.id,
                conditions: appointment.medicalHistory,
                allergies: appointment.allergies,
              },
            },
          })}
        >
          Record visit
        </GGButton>
      )}
    </div>
  )
}

function appointmentDateParts(dateStr: string) {
  const date = new Date(dateStr)
  return {
    day: date.getDate(),
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
  }
}

function CalendarTile({ dateStr, featured }: { dateStr: string; featured?: boolean }) {
  const { day, month, weekday } = appointmentDateParts(dateStr)
  const width = featured ? 58 : 48
  return (
    <div style={{
      width,
      minWidth: width,
      borderRadius: radius.md,
      overflow: 'hidden',
      border: `1px solid ${featured ? 'rgba(56,182,255,0.45)' : C.border}`,
      background: C.surface,
      flexShrink: 0,
      textAlign: 'center',
      fontFamily: font.family,
    }}>
      <div style={{
        background: C.blue500,
        color: '#fff',
        fontSize: featured ? '10px' : '9px',
        fontWeight: 800,
        letterSpacing: '0.12em',
        padding: featured ? '5px 0 4px' : '4px 0 3px',
      }}>
        {month}
      </div>
      <div style={{
        fontSize: featured ? '22px' : '18px',
        fontWeight: 800,
        color: C.navy800,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        padding: featured ? '6px 0 2px' : '5px 0 1px',
      }}>
        {day}
      </div>
      <div style={{
        fontSize: '10px',
        fontWeight: 700,
        color: C.textLight,
        letterSpacing: '0.08em',
        paddingBottom: featured ? '7px' : '6px',
      }}>
        {weekday}
      </div>
    </div>
  )
}

function AppointmentCard({
  appointment,
  featured = false,
  isLast = false,
}: {
  appointment: Appointment
  featured?: boolean
  isLast?: boolean
}) {
  const navigate = useNavigate()
  const displayStatus = getAppointmentDisplayStatus(appointment)
  const isNew = displayStatus === 'new'
  const hasActions = visitActionKind(appointment) !== null

  return (
    <div
      style={{
        marginBottom: isLast ? 0 : '8px',
        background: C.surface,
        border: `1px solid ${featured || isNew ? 'rgba(56,182,255,0.35)' : C.border}`,
        borderRadius: radius.lg,
        boxShadow: featured ? shadow.sm : 'none',
        overflow: 'hidden',
        fontFamily: font.family,
      }}
    >
      <button
        type="button"
        onClick={() => navigate(route.spAppointment(appointment.id), { state: { apt: appointment } })}
        style={{
          all: 'unset',
          display: 'flex',
          alignItems: 'center',
          gap: featured ? '14px' : '12px',
          width: '100%',
          boxSizing: 'border-box',
          padding: featured ? '14px 14px 12px' : '10px 12px',
          cursor: 'pointer',
        }}
      >
        <CalendarTile dateStr={appointment.date} featured={featured} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
          }}>
            <div style={{
              fontSize: featured ? '18px' : '14px',
              fontWeight: 800,
              color: C.navy800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
            }}>
              {formatTime12h(appointment.time)}
            </div>
            <GGBadge type={isNew ? 'navy' : 'primary'} size="sm">
              {isNew ? 'New request' : 'Confirmed'}
            </GGBadge>
          </div>
          <div style={{
            fontSize: featured ? '15px' : '13px',
            fontWeight: 700,
            color: C.text,
            marginTop: featured ? '6px' : '3px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {appointment.patient}
          </div>
          <div style={{
            fontSize: featured ? '13px' : '12px',
            color: C.textSub,
            marginTop: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {appointment.service}
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: C.textLight }}>
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {hasActions && (
        <div
          style={{ padding: featured ? '0 14px 14px' : '0 12px 10px' }}
          onClick={event => event.stopPropagation()}
        >
          <VisitActions appointment={appointment} />
        </div>
      )}
    </div>
  )
}

function PaymentRow({ payment, isLast }: { payment: Payment; isLast: boolean }) {
  return (
    <div style={{
      padding: '12px 0',
      borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
      alignItems: 'flex-start',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{payment.patient}</div>
        <div style={{ fontSize: '11px', color: C.textSub, marginTop: '3px' }}>
          {payment.ref} · {formatDate(payment.date)}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: C.text }}>
          {formatCurrency(payment.amount)}
        </div>
      </div>
    </div>
  )
}

function GettingStartedPanel({
  setupSteps,
  doneCount,
  onStepAction,
}: {
  setupSteps: SpSetupStep[]
  doneCount: number
  onStepAction: (stepN: number, ctaPath: string | null) => void
}) {
  return (
    <GGCard padding="0" style={{ overflow: 'hidden', height: '100%' }}>
      <div style={{ padding: '20px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: C.text }}>Getting Started</div>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            color: C.blue500,
            background: C.blue100,
            padding: '3px 10px',
            borderRadius: radius.full,
          }}>
            {doneCount}/{SP_ONBOARDING_STEP_COUNT} done
          </span>
        </div>
        <div style={{ height: '4px', background: C.blue100, borderRadius: '2px', marginBottom: '18px', overflow: 'hidden' }}>
          <div style={{
            width: `${(doneCount / SP_ONBOARDING_STEP_COUNT) * 100}%`,
            height: '100%',
            background: C.blue500,
            borderRadius: '2px',
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
      <div style={{ padding: '0 22px 22px', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '38px', top: '18px', bottom: '18px', width: '2px', background: C.border, zIndex: 0 }} />
        {setupSteps.map((step, index) => {
          const isLast = index === setupSteps.length - 1
          const isAction = step.status === 'action'
          const nodeBg = step.status === 'done'
            ? C.blue500
            : step.status === 'action'
              ? C.blue500
              : step.status === 'next'
                ? C.blue400
                : 'transparent'
          const nodeBorder = step.status === 'pending' ? `2px solid ${C.border}` : 'none'

          return (
            <div key={step.n} style={{ display: 'flex', gap: '14px', paddingTop: index === 0 ? '0' : '12px', position: 'relative' }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: nodeBg,
                border: nodeBorder,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                zIndex: 1,
              }}>
                {step.status === 'done' && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {(step.status === 'next' || step.status === 'pending') && (
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: step.status === 'next' ? '#fff' : C.textLight,
                  }}>
                    {step.n}
                  </span>
                )}
                {step.status === 'action' && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1L8.5 5.2H13L9.6 7.6 11 12 7 9.4 3 12l1.4-4.4L1 5.2h4.5z" fill="rgba(255,255,255,0.3)" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div style={{
                flex: 1,
                minWidth: 0,
                paddingTop: '4px',
                paddingBottom: isLast ? '0' : '12px',
                borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
                paddingLeft: isAction ? '10px' : '0',
                background: isAction ? C.blue100 : 'transparent',
                borderLeft: isAction ? `3px solid ${C.blue500}` : 'none',
                borderRadius: isAction ? `0 ${radius.sm} ${radius.sm} 0` : '0',
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: step.status === 'pending' ? 500 : 700,
                  color: step.status === 'pending' ? C.textLight : C.text,
                }}>
                  {step.label}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: isAction ? C.blue500 : C.textSub,
                  lineHeight: 1.5,
                  marginTop: '3px',
                  opacity: step.status === 'pending' ? 0.55 : 1,
                }}>
                  {step.desc}
                </div>
                {step.cta && step.status !== 'pending' && step.status !== 'done' && (
                  <span
                    onClick={() => onStepAction(step.n, step.ctaPath)}
                    style={{
                      display: 'inline-flex',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: C.blue500,
                      cursor: 'pointer',
                      marginTop: '6px',
                    }}
                  >
                    {step.cta}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </GGCard>
  )
}

function UpcomingScheduleCard({ appointments }: { appointments: Appointment[] }) {
  const navigate = useNavigate()
  if (appointments.length === 0) return null

  const [nextVisit, ...rest] = appointments
  const subtitle = `${appointments.length} scheduled visit${appointments.length === 1 ? '' : 's'}`

  return (
    <GGCard padding="0" style={{ overflow: 'hidden' }}>
      <QueueCardHeader
        title="Upcoming visits"
        subtitle={subtitle}
        actionLabel="View all"
        onAction={() => navigate(ROUTES.SP_APPOINTMENTS)}
      />
      <div style={{ padding: '14px 16px 16px', background: C.bg }}>
        <AppointmentCard key={nextVisit.id} appointment={nextVisit} featured />
        {rest.map((appointment, index) => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            isLast={index === rest.length - 1}
          />
        ))}
      </div>
    </GGCard>
  )
}

export function SPDashboardWorkspace({
  upcomingSchedule,
  prescriptionRequests = [],
  showAppointments = true,
  showPrescriptions = false,
  recentPayments,
  onboardingComplete,
  setupSteps,
  doneCount,
  onStepAction,
}: SPDashboardWorkspaceProps) {
  const navigate = useNavigate()
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet
  const toQuote = prescriptionRequests.filter(request => request.status === 'submitted')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: font.family }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isNarrow ? '1fr' : 'minmax(0, 1.55fr) minmax(300px, 1fr)',
        gap: '16px',
        alignItems: 'start',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {showAppointments && <UpcomingScheduleCard appointments={upcomingSchedule} />}
          {showPrescriptions && (
            <PrescriptionRequestsCard
              requests={toQuote}
              showWhenEmpty={!showAppointments}
            />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!onboardingComplete ? (
            <GettingStartedPanel
              setupSteps={setupSteps}
              doneCount={doneCount}
              onStepAction={onStepAction}
            />
          ) : (
            <GGCard padding="0" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '20px 22px 0' }}>
                <SectionHeader
                  title="Recent disbursements"
                  actionLabel="View all"
                  onAction={() => navigate(ROUTES.SP_PAYMENTS)}
                />
              </div>
              {recentPayments.length === 0 ? (
                <div style={{ padding: '20px 22px', fontSize: '13px', color: C.textSub }}>
                  No disbursements recorded yet.
                </div>
              ) : (
                <div style={{ padding: '0 22px 12px' }}>
                  {recentPayments.map((payment, index) => (
                    <PaymentRow
                      key={payment.id}
                      payment={payment}
                      isLast={index === recentPayments.length - 1}
                    />
                  ))}
                </div>
              )}
            </GGCard>
          )}
        </div>
      </div>
    </div>
  )
}
