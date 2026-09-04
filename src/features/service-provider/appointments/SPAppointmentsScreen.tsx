import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGAvatar, GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useSPAppointments } from '@/hooks/api'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { route, ROUTES } from '@/router/routes'
import type { Appointment } from '@/types/appointment.types'
import { getCountryByCode } from '@/config/countries'
import { formatDate, formatPhone, formatTime12h } from '@/utils/format'
import { getAppointmentDisplayStatus, appointmentHasRecordedVisit } from '@/utils/appointments'

const STATUS_LABELS: Record<string, string> = {
  all: 'All',
  new: 'New Requests',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

function AppointmentStatusChip({ status }: { status: Appointment['status'] }) {
  const config = {
    new: { bg: C.warningBg, color: '#8A4D00' },
    confirmed: { bg: C.blue100, color: C.blue500 },
    completed: { bg: C.successBg, color: C.success },
    cancelled: { bg: C.errorBg, color: C.error },
  }[status]

  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: radius.full,
        background: config.bg,
        color: config.color,
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        fontFamily: font.family,
      }}
    >
      {status === 'new' ? 'New' : status}
    </span>
  )
}

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  const navigate = useNavigate()
  const displayStatus = getAppointmentDisplayStatus(appointment)
  const isInvoiceUploaded = !!appointment.hasInvoice
  const hasRecordedVisit = appointmentHasRecordedVisit(appointment)
  const canRecordVisit =
    !isInvoiceUploaded &&
    !hasRecordedVisit &&
    (displayStatus === 'confirmed' || displayStatus === 'completed')
  const canUploadInvoice =
    !isInvoiceUploaded &&
    hasRecordedVisit &&
    (displayStatus === 'confirmed' || displayStatus === 'completed')
  const patientCountry = getCountryByCode(appointment.countryCode ?? '')

  return (
    <GGCard
      padding="20px"
      style={{ cursor: 'pointer' }}
      onClick={() => navigate(route.spAppointment(appointment.id), { state: { apt: appointment } })}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
          <GGAvatar name={appointment.patient} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: C.text, fontFamily: font.family }}>
                {appointment.patient}
              </div>
              {!appointment.forSelf && appointment.beneficiary && (
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: radius.full,
                    background: C.blue100,
                    color: C.blue500,
                    fontSize: '10px',
                    fontWeight: 700,
                    fontFamily: font.family,
                  }}
                >
                  For {appointment.beneficiary.name}
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: C.textSub, marginTop: '5px', fontFamily: font.family }}>
              {appointment.service} · {formatDate(appointment.date)} · {formatTime12h(appointment.time)}
            </div>
            <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px', fontFamily: font.family }}>
              {formatPhone(appointment.phone, patientCountry?.name, appointment.address).display}
            </div>
            <div style={{ fontSize: '13px', color: C.text, marginTop: '10px', lineHeight: 1.6, fontFamily: font.family }}>
              {appointment.description}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
          <AppointmentStatusChip status={displayStatus as Appointment['status']} />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {canRecordVisit && (
              <div onClick={event => event.stopPropagation()}>
                <GGButton
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate(ROUTES.SP_VISIT_RECORD, {
                      state: {
                        ctx: {
                          patientId: appointment.patientId,
                          patientName: appointment.patient,
                          appointmentId: appointment.id,
                          conditions: appointment.medicalHistory,
                          allergies: appointment.allergies,
                        },
                      },
                    })
                  }
                >
                  Record Visit
                </GGButton>
              </div>
            )}
            {canUploadInvoice && (
              <div onClick={event => event.stopPropagation()}>
                <GGButton
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate(ROUTES.SP_INVOICE_UPLOAD, {
                      state: {
                        prefill: {
                          appointmentId: appointment.id,
                          patientId: appointment.patientId,
                          patientName: appointment.patient,
                          visitId: appointment.visitId,
                        },
                      },
                    })
                  }
                >
                  Upload Invoice
                </GGButton>
              </div>
            )}
            <div onClick={event => event.stopPropagation()}>
              <GGButton
                variant="primary"
                size="sm"
                onClick={() => navigate(route.spAppointment(appointment.id), { state: { apt: appointment } })}
              >
                View Detail
              </GGButton>
            </div>
          </div>
        </div>
      </div>
    </GGCard>
  )
}

export function SPAppointmentsScreen() {
  const { data: appointments = [], isLoading } = useSPAppointments()
  const [filter, setFilter] = useState<'all' | Appointment['status']>('all')

  const counts = useMemo(
    () => ({
      new: appointments.filter(appointment => getAppointmentDisplayStatus(appointment) === 'new').length,
      confirmed: appointments.filter(appointment => getAppointmentDisplayStatus(appointment) === 'confirmed').length,
      completed: appointments.filter(appointment => getAppointmentDisplayStatus(appointment) === 'completed').length,
      cancelled: appointments.filter(appointment => getAppointmentDisplayStatus(appointment) === 'cancelled').length,
    }),
    [appointments],
  )

  const filteredAppointments = useMemo(
    () =>
      filter === 'all'
        ? appointments
        : appointments.filter(appointment => getAppointmentDisplayStatus(appointment) === filter),
    [appointments, filter],
  )

  if (isLoading) {
    return (
      <SPLayout title="Appointments">
        <GGCard padding="24px">
          <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
            Loading appointments...
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  return (
    <SPLayout title="Appointments" status={counts.new > 0 ? `${counts.new} new` : undefined}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          {[
            { id: 'new', value: counts.new },
            { id: 'confirmed', value: counts.confirmed },
            { id: 'completed', value: counts.completed },
            { id: 'cancelled', value: counts.cancelled },
          ].map(card => (
            <GGCard
              key={card.id}
              padding="18px"
              style={{
                background: filter === card.id ? C.blue100 : '#fff',
                border: `1px solid ${filter === card.id ? C.blue500 + '44' : C.border}`,
                cursor: 'pointer',
              }}
              onClick={() => setFilter(card.id as Appointment['status'])}
            >
              <div style={{ fontSize: '11px', color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, fontFamily: font.family }}>
                {STATUS_LABELS[card.id]}
              </div>
              <div style={{ fontSize: '30px', fontWeight: 800, color: C.text, marginTop: '8px', letterSpacing: '-0.04em', fontFamily: font.family }}>
                {card.value}
              </div>
            </GGCard>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['all', 'new', 'confirmed', 'completed', 'cancelled'] as const).map(option => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              style={{
                padding: '7px 14px',
                borderRadius: radius.full,
                border: `1px solid ${filter === option ? C.blue500 : C.border}`,
                background: filter === option ? C.blue100 : '#fff',
                color: filter === option ? C.blue500 : C.textSub,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: font.family,
              }}
            >
              {STATUS_LABELS[option]}
            </button>
          ))}
        </div>

        {filteredAppointments.length === 0 ? (
          <GGCard padding="28px">
            <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
              No appointments found for this filter.
            </div>
          </GGCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredAppointments.map(appointment => (
              <AppointmentRow key={appointment.id} appointment={appointment} />
            ))}
          </div>
        )}
      </div>
    </SPLayout>
  )
}
