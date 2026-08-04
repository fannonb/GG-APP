import { useNavigate } from 'react-router-dom'
import { GGCard } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { route, ROUTES } from '@/router/routes'
import type { Appointment } from '@/types/appointment.types'
import type { Payment } from '@/types/invoice.types'
import type { PrescriptionRequest, PrescriptionRequestStatus } from '@/types/prescription.types'

const PRESCRIPTION_STATUS_LABELS: Record<PrescriptionRequestStatus, string> = {
  submitted: 'New upload',
  quoted: 'Awaiting patient review',
  accepted: 'Quote accepted',
  preparing: 'Preparing',
  ready: 'Ready to deliver',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
}
import { getAppointmentDisplayStatus, getAppointmentUrgency } from '@/utils/appointments'
import { formatCurrency, formatDate, formatPhone, formatTime12h } from '@/utils/format'
import { getCountryByCode } from '@/config/countries'
import { SP_ONBOARDING_STEP_COUNT } from '@/store/auth.store'
import type { SpSetupStep } from '@/utils/sp-onboarding'
import { useResponsive } from '@/hooks/useResponsive'

interface SPDashboardWorkspaceProps {
  upcomingAppointments: Appointment[]
  prescriptionRequests?: PrescriptionRequest[]
  showAppointments?: boolean
  showPrescriptions?: boolean
  recentPayments: Payment[]
  patientsCount: number
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

function getAppointmentRowTheme(
  urgency: ReturnType<typeof getAppointmentUrgency>,
  isNew: boolean,
) {
  if (urgency?.isToday) {
    return {
      rowBg: C.blue100,
      rowBorder: '1px solid rgba(56,182,255,0.38)',
      accentBar: C.blue500,
      dateBg: C.surface,
      dateColor: C.blue500,
      dateMonthColor: C.blue400,
      dateBorder: '1px solid rgba(56,182,255,0.35)',
      urgencyBg: C.blue500,
      urgencyColor: '#fff',
      urgencyBorder: 'transparent',
      statusBg: C.surface,
      statusColor: C.blue500,
      statusBorder: '1px solid rgba(56,182,255,0.35)',
      chevronColor: C.blue500,
      timeColor: C.blue500,
    }
  }

  if (urgency?.isTomorrow) {
    return {
      rowBg: 'rgba(230,245,255,0.65)',
      rowBorder: '1px solid rgba(56,182,255,0.28)',
      accentBar: C.blue400,
      dateBg: C.surface,
      dateColor: C.blue500,
      dateMonthColor: C.blue400,
      dateBorder: '1px solid rgba(56,182,255,0.28)',
      urgencyBg: 'rgba(56,182,255,0.12)',
      urgencyColor: C.blue500,
      urgencyBorder: '1px solid rgba(56,182,255,0.35)',
      statusBg: isNew ? 'rgba(56,182,255,0.10)' : C.surface,
      statusColor: C.blue500,
      statusBorder: '1px solid rgba(56,182,255,0.28)',
      chevronColor: C.blue500,
      timeColor: C.blue500,
    }
  }

  if (urgency || isNew) {
    return {
      rowBg: C.surface,
      rowBorder: '1px solid rgba(56,182,255,0.22)',
      accentBar: C.blue300,
      dateBg: C.blue100,
      dateColor: C.blue500,
      dateMonthColor: C.blue400,
      dateBorder: '1px solid rgba(56,182,255,0.18)',
      urgencyBg: 'rgba(56,182,255,0.10)',
      urgencyColor: C.blue500,
      urgencyBorder: '1px solid rgba(56,182,255,0.28)',
      statusBg: isNew ? 'rgba(56,182,255,0.10)' : C.blue100,
      statusColor: C.blue500,
      statusBorder: '1px solid rgba(56,182,255,0.22)',
      chevronColor: C.blue400,
      timeColor: C.text,
    }
  }

  return {
    rowBg: C.surface,
    rowBorder: `1px solid ${C.border}`,
    accentBar: C.blue100,
    dateBg: C.blue100,
    dateColor: C.blue500,
    dateMonthColor: C.blue400,
    dateBorder: '1px solid rgba(56,182,255,0.14)',
    urgencyBg: C.blue100,
    urgencyColor: C.blue500,
    urgencyBorder: '1px solid rgba(56,182,255,0.18)',
    statusBg: C.blue100,
    statusColor: C.blue500,
    statusBorder: '1px solid rgba(56,182,255,0.18)',
    chevronColor: C.textLight,
    timeColor: C.text,
  }
}

function PrescriptionRow({ request, isLast }: { request: PrescriptionRequest; isLast: boolean }) {
  const navigate = useNavigate()
  const statusLabel = PRESCRIPTION_STATUS_LABELS[request.status] ?? request.status
  const patientCountry = getCountryByCode(request.countryCode ?? '')
  const patientPhone = formatPhone(
    request.patientPhone ?? '',
    patientCountry?.name,
    request.deliveryAddress,
  )

  return (
    <button
      type="button"
      onClick={() => navigate(route.spPrescription(request.id))}
      style={{
        textAlign: 'left',
        width: '100%',
        padding: '14px 16px',
        marginBottom: isLast ? 0 : '10px',
        background: request.status === 'submitted' ? C.warningBg : C.surface,
        border: `1px solid ${request.status === 'submitted' ? 'rgba(245,158,11,0.28)' : C.border}`,
        borderRadius: radius.lg,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        fontFamily: font.family,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>
          {request.patient ?? 'Patient'}
        </div>
        <div style={{ fontSize: '12px', color: C.textSub }}>
          {request.id} · {request.fulfillmentMode === 'delivery' ? 'Delivery' : 'Pickup'}
          {request.patientPhone ? ` · ${patientPhone.display}` : ''}
        </div>
        <span style={{
          display: 'inline-flex',
          marginTop: '8px',
          padding: '4px 10px',
          borderRadius: radius.full,
          background: C.blue100,
          color: C.blue500,
          fontSize: '10px',
          fontWeight: 700,
        }}>
          {statusLabel}
        </span>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: C.textLight }}>
        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

function AppointmentRow({ appointment, isLast }: { appointment: Appointment; isLast: boolean }) {
  const navigate = useNavigate()
  const displayStatus = getAppointmentDisplayStatus(appointment)
  const urgency = getAppointmentUrgency(appointment.date)
  const isConfirmed = displayStatus === 'confirmed'
  const isNew = displayStatus === 'new'
  const aptDate = new Date(appointment.date)
  const dayNum = aptDate.getDate()
  const monthStr = aptDate.toLocaleDateString('en-US', { month: 'short' })
  const theme = getAppointmentRowTheme(urgency, isNew)

  return (
    <button
      type="button"
      onClick={() => navigate(route.spAppointment(appointment.id))}
      style={{
        textAlign: 'left',
        width: '100%',
        padding: '0',
        marginBottom: isLast ? 0 : '10px',
        background: theme.rowBg,
        border: theme.rowBorder,
        borderRadius: radius.lg,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'stretch',
        overflow: 'hidden',
        boxShadow: shadow.sm,
        transition: 'transform 0.15s, box-shadow 0.15s',
        fontFamily: font.family,
      }}
      onMouseEnter={event => {
        event.currentTarget.style.transform = 'translateY(-1px)'
        event.currentTarget.style.boxShadow = shadow.md
        event.currentTarget.style.borderColor = 'rgba(56,182,255,0.34)'
      }}
      onMouseLeave={event => {
        event.currentTarget.style.transform = 'translateY(0)'
        event.currentTarget.style.boxShadow = shadow.sm
        event.currentTarget.style.borderColor = theme.rowBorder
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        flex: 1,
        minWidth: 0,
        padding: '14px 16px',
      }}>
        <div style={{
          width: 54,
          minWidth: 54,
          height: 58,
          borderRadius: '13px',
          background: theme.dateBg,
          border: theme.dateBorder,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(56,182,255,0.10)',
        }}>
          <div style={{
            fontSize: '21px',
            fontWeight: 900,
            color: theme.dateColor,
            lineHeight: 1,
            letterSpacing: '-0.04em',
          }}>
            {dayNum}
          </div>
          <div style={{
            fontSize: '9px',
            fontWeight: 800,
            color: theme.dateMonthColor,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginTop: '3px',
          }}>
            {monthStr}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '5px' }}>
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: theme.accentBar,
              boxShadow: '0 0 0 2px rgba(56,182,255,0.14)',
              flexShrink: 0,
            }} />
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: C.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {appointment.patient}
            </div>
            {urgency && (
              <span style={{
                fontSize: '9px',
                fontWeight: 800,
                color: theme.urgencyColor,
                background: theme.urgencyBg,
                border: theme.urgencyBorder,
                padding: '3px 8px',
                borderRadius: radius.full,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}>
                {urgency.label}
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '8px', fontWeight: 500 }}>
            <span style={{ color: theme.timeColor, fontWeight: 700 }}>{formatTime12h(appointment.time)}</span>
            {' · '}
            {appointment.service}
          </div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: radius.full,
            background: theme.statusBg,
            border: `1px solid ${theme.statusBorder}`,
            fontSize: '10px',
            fontWeight: 700,
            color: theme.statusColor,
            textTransform: 'capitalize',
            letterSpacing: '0.03em',
          }}>
            {isNew && (
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: C.blue500,
                boxShadow: '0 0 0 2px rgba(56,182,255,0.22)',
              }} />
            )}
            {isConfirmed && (
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {isNew ? 'New request' : displayStatus}
          </span>
        </div>

        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: theme.chevronColor }}>
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
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

function WorkspaceListCard({
  kind,
  appointments,
  prescriptions,
}: {
  kind: 'appointments' | 'prescriptions'
  appointments: Appointment[]
  prescriptions: PrescriptionRequest[]
}) {
  const navigate = useNavigate()
  const isPharmacy = kind === 'prescriptions'
  const items = isPharmacy ? prescriptions : appointments

  const title = isPharmacy ? 'Prescription Requests' : 'Upcoming Appointments'
  const emptyTitle = isPharmacy ? 'No prescription requests' : 'No upcoming appointments'
  const emptyBody = isPharmacy
    ? 'New prescription uploads from patients will appear here.'
    : 'New booking requests will appear here.'
  const route = isPharmacy ? ROUTES.SP_PRESCRIPTIONS : ROUTES.SP_APPOINTMENTS

  return (
    <GGCard padding="0" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '18px 22px',
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: C.blue100,
            border: '1px solid rgba(56,182,255,0.20)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: C.blue500,
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1.5" y="3" width="15" height="13.5" rx="2" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M1.5 7.5h15M6 1.5v3M12 1.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>
              {title}
            </div>
            <div style={{ fontSize: '11px', color: C.textSub, marginTop: '2px' }}>
              {items.length > 0
                ? isPharmacy
                  ? `${items.length} in progress`
                  : `${items.length} active`
                : isPharmacy ? 'No uploads yet' : 'No bookings yet'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(route)}
          style={{
            border: 'none',
            background: 'transparent',
            color: C.blue500,
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '13px',
            fontFamily: font.family,
            padding: '4px 0',
          }}
        >
          View all
        </button>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '40px 22px', textAlign: 'center', flex: 1 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '14px',
            margin: '0 auto 14px',
            background: C.blue100,
            border: '1px solid rgba(56,182,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {isPharmacy ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" rx="3" stroke={C.blue500} strokeWidth="1.5"/>
                <path d="M12 7v10M7 12h10" stroke={C.blue500} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="18" rx="3" stroke={C.blue500} strokeWidth="1.5"/>
                <path d="M2 9h20M8 2v4M16 2v4" stroke={C.blue500} strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            )}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{emptyTitle}</div>
          <div style={{ fontSize: '12px', color: C.textSub, marginTop: '5px', lineHeight: 1.5 }}>
            {emptyBody}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, padding: '14px 16px 16px', background: C.bg }}>
          {isPharmacy
            ? prescriptions.map((request, index) => (
                <PrescriptionRow
                  key={request.id}
                  request={request}
                  isLast={index === prescriptions.length - 1}
                />
              ))
            : appointments.map((appointment, index) => (
                <AppointmentRow
                  key={appointment.id}
                  appointment={appointment}
                  isLast={index === appointments.length - 1}
                />
              ))}
        </div>
      )}
    </GGCard>
  )
}

export function SPDashboardWorkspace({
  upcomingAppointments,
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

  const activePrescriptions = prescriptionRequests.filter(
    request =>
      request.status === 'submitted' ||
      request.status === 'quoted' ||
      request.status === 'accepted' ||
      request.status === 'preparing' ||
      request.status === 'ready',
  ).slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: font.family }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isNarrow ? '1fr' : 'minmax(0, 1.55fr) minmax(300px, 1fr)',
        gap: '16px',
        alignItems: 'stretch',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {showAppointments && (
            <WorkspaceListCard kind="appointments" appointments={upcomingAppointments} prescriptions={activePrescriptions} />
          )}
          {showPrescriptions && (
            <WorkspaceListCard kind="prescriptions" appointments={upcomingAppointments} prescriptions={activePrescriptions} />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '100%' }}>
          {!onboardingComplete ? (
            <GettingStartedPanel
              setupSteps={setupSteps}
              doneCount={doneCount}
              onStepAction={onStepAction}
            />
          ) : (
            <>
              <GGCard padding="0" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '20px 22px 0' }}>
                  <SectionHeader
                    title="Recent Payments"
                    actionLabel="View all"
                    onAction={() => navigate(ROUTES.SP_PAYMENTS)}
                  />
                </div>
                {recentPayments.length === 0 ? (
                  <div style={{ padding: '20px 22px', fontSize: '13px', color: C.textSub }}>
                    No payments recorded yet.
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
