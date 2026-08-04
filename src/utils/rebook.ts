import type { AppointmentRebookContext } from '@/api/services/patient.service'
import { MOCK_PROVIDERS } from '@/mock/patient.mock'
import { ROUTES } from '@/router/routes'
import type { Appointment } from '@/types/user.types'

export interface AppointmentRebookNavigationState {
  providerId?: number
  provider?: AppointmentRebookContext['provider']
  rebook: {
    service: string
    forSelf: boolean
    beneficiaryId?: string
    description?: string
  }
}

export function resolveAppointmentProviderId(appointment: Appointment): number | undefined {
  if (appointment.providerId) return appointment.providerId
  return MOCK_PROVIDERS.find(provider => provider.name === appointment.provider)?.id
}

export function buildAppointmentRebookState(
  appointment: Appointment,
  patientName?: string,
): AppointmentRebookNavigationState {
  const forSelf =
    appointment.forSelf ??
    (appointment.for === 'Self' || (!!patientName && appointment.for === patientName))

  return {
    providerId: resolveAppointmentProviderId(appointment),
    rebook: {
      service: appointment.service,
      forSelf,
      beneficiaryId: appointment.beneficiaryId,
      description: `Follow-up booking for ${appointment.service}`,
    },
  }
}

export function appointmentRebookPath() {
  return ROUTES.BOOKING
}
