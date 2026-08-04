import { isMockApi } from '@/api/config'
import { apiClient } from '@/api/client'
import { mockDelay } from '@/api/mock/delay'
import { getCountryByCode } from '@/config/countries'
import type {
  CancelPatientAppointmentPayload,
  ChangePatientPasswordPayload,
  ChangePatientPasswordResult,
  CreateAppointmentPayload,
  CreateAppointmentResult,
  PatientProfileResponse,
  UpdatePatientProfilePayload,
  SetupPaymentPinPayload,
  SetupPaymentPinResult,
  UpsertBeneficiaryPayload,
} from '@/api/types'
import type { Provider } from '@/types/provider.types'
import type { UserMode } from '@/store/auth.store'
import { useUserStore } from '@/store/user.store'
import type {
  Patient,
  Beneficiary,
  NewsItem,
  Transaction,
  Appointment,
  Notification,
} from '@/types/user.types'
import {
  MOCK_USER,
  MOCK_BENEFICIARIES,
  MOCK_NEWS,
  MOCK_TRANSACTIONS,
  MOCK_APPOINTMENTS,
  MOCK_PAST_APPOINTMENTS,
  MOCK_NOTIFICATIONS,
  MOCK_PROVIDERS,
} from '@/mock/patient.mock'

const mockReadNotificationIds = new Set<string>()

export interface PatientProfile {
  user: Patient
  beneficiaries: Beneficiary[]
}

export interface PatientDashboard {
  user: Patient
  transactions: Transaction[]
  news: NewsItem[]
  appointments: Appointment[]
}

export interface PatientAppointments {
  upcoming: Appointment[]
  past: Appointment[]
}

export interface AppointmentRebookContext {
  appointmentId: string
  provider: Provider
  service: string
  forSelf: boolean
  beneficiaryId?: string
  description?: string
}

const NEW_USER: Patient = {
  ...MOCK_USER,
  creditLimit: 0,
  creditUsed: 0,
  creditAvailable: 0,
  creditStatus: 'not_applied',
  hasPaymentPin: false,
  financePartnerId: undefined,
  creditAccountRef: undefined,
  beneficiariesEnabled: false,
}

function resolveUser(mode: UserMode): Patient {
  return mode === 'new' ? NEW_USER : MOCK_USER
}

function buildDashboard(mode: UserMode): PatientDashboard {
  return {
    user: resolveUser(mode),
    transactions: mode === 'new' ? [] : MOCK_TRANSACTIONS,
    news: MOCK_NEWS,
    appointments: mode === 'new' ? [] : MOCK_APPOINTMENTS,
  }
}

function buildProfile(mode: UserMode): PatientProfile {
  return {
    user: resolveUser(mode),
    beneficiaries: mode === 'new' ? [] : MOCK_BENEFICIARIES,
  }
}

function buildAppointments(mode: UserMode): PatientAppointments {
  return {
    upcoming: mode === 'new' ? [] : MOCK_APPOINTMENTS,
    past: mode === 'new' ? [] : MOCK_PAST_APPOINTMENTS,
  }
}

function normalizePatient(user: Patient): Patient {
  const country = getCountryByCode(user.countryCode)
  const name = user.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')

  return {
    ...user,
    name,
    country: user.residesAbroad ? (user.residenceCountry ?? user.country) : (country?.name ?? user.country),
    residenceCountry: user.residenceCountry ?? country?.name ?? user.country,
    residesAbroad: Boolean(user.residesAbroad),
  }
}

function resolveMockProfile(mode: UserMode): PatientProfile {
  const base = buildProfile(mode)
  const stored = useUserStore.getState()
  if (!stored.user.email) {
    return base
  }

  return {
    user: normalizePatient({ ...base.user, ...stored.user }),
    beneficiaries:
      stored.beneficiaries.length > 0 || mode === 'new'
        ? stored.beneficiaries
        : base.beneficiaries,
  }
}

export const patientService = {
  getDashboardMock: buildDashboard,
  getProfileMock: (mode: UserMode = 'existing') => resolveMockProfile(mode),
  getAppointmentsMock: buildAppointments,
  getNewsMock: () => MOCK_NEWS,

  async getProfile(mode: UserMode = 'existing'): Promise<PatientProfile> {
    if (isMockApi) {
      await mockDelay(250)
      return resolveMockProfile(mode)
    }
    const { data } = await apiClient.get<PatientProfile>('/patient/profile')
    return {
      ...data,
      user: normalizePatient(data.user),
    }
  },

  async updateProfile(
    payload: UpdatePatientProfilePayload,
    mode: UserMode = 'existing',
  ): Promise<PatientProfileResponse> {
    if (isMockApi) {
      await mockDelay(250)
      const profile = resolveMockProfile(mode)
      const code = payload.residenceCountryCode?.toUpperCase()
      const isOperating = code === 'KE' || code === 'ZW' || code === 'ZM'
      const residenceName = isOperating
        ? ({ KE: 'Kenya', ZW: 'Zimbabwe', ZM: 'Zambia' } as const)[code as 'KE' | 'ZW' | 'ZM']
        : (payload.residenceCountryName ?? payload.residenceCountryCode ?? profile.user.residenceCountry)

      const nextUser = normalizePatient({
        ...profile.user,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        ...(payload.beneficiariesEnabled !== undefined
          ? { beneficiariesEnabled: payload.beneficiariesEnabled }
          : {}),
        ...(payload.residenceCountryCode || payload.residenceCountryName
          ? {
              residenceCountry: residenceName,
              residesAbroad: !isOperating,
              country: isOperating ? residenceName : profile.user.country,
              ...(isOperating ? { countryCode: code as 'KE' | 'ZW' | 'ZM' } : {}),
            }
          : {}),
      })

      useUserStore.setState({
        user: nextUser,
        beneficiaries: profile.beneficiaries,
      })

      return {
        user: nextUser,
        beneficiaries: profile.beneficiaries,
      }
    }

    const { data } = await apiClient.patch<PatientProfileResponse>('/patient/profile', payload)
    return {
      ...data,
      user: normalizePatient(data.user),
    }
  },

  async setBeneficiariesEnabled(
    enabled: boolean,
    mode: UserMode = 'existing',
  ): Promise<PatientProfileResponse> {
    if (isMockApi) {
      await mockDelay(200)
      const profile = buildProfile(mode)
      const current = useUserStore.getState()
      return {
        user: {
          ...(current.user.email ? current.user : profile.user),
          beneficiariesEnabled: enabled,
        },
        beneficiaries: current.beneficiaries.length > 0 ? current.beneficiaries : profile.beneficiaries,
      }
    }

    const { data } = await apiClient.patch<PatientProfileResponse>('/patient/beneficiaries/enabled', {
      enabled,
    })
    return {
      ...data,
      user: normalizePatient(data.user),
    }
  },

  async getDashboard(mode: UserMode = 'existing'): Promise<PatientDashboard> {
    if (isMockApi) {
      await mockDelay(300)
      return buildDashboard(mode)
    }
    const { data } = await apiClient.get<PatientDashboard>('/patient/dashboard')
    return {
      ...data,
      user: normalizePatient(data.user),
    }
  },

  async getAppointments(mode: UserMode = 'existing'): Promise<PatientAppointments> {
    if (isMockApi) {
      await mockDelay(250)
      return buildAppointments(mode)
    }
    const { data } = await apiClient.get<PatientAppointments>('/patient/appointments')
    return data
  },

  async getRebookContext(appointmentId: string, mode: UserMode = 'existing'): Promise<AppointmentRebookContext> {
    if (isMockApi) {
      await mockDelay(200)
      const appointment = [...buildAppointments(mode).upcoming, ...buildAppointments(mode).past].find(
        item => item.id === appointmentId,
      )
      if (!appointment) {
        throw new Error('Appointment not found')
      }
      const provider =
        MOCK_PROVIDERS.find(item => item.id === appointment.providerId) ??
        MOCK_PROVIDERS.find(item => item.name === appointment.provider) ??
        MOCK_PROVIDERS[0]
      return {
        appointmentId: appointment.id,
        provider,
        service: appointment.service,
        forSelf: appointment.forSelf ?? appointment.for === 'Self',
        beneficiaryId: appointment.beneficiaryId,
        description: `Follow-up booking for ${appointment.service}`,
      }
    }

    const { data } = await apiClient.get<AppointmentRebookContext>(`/patient/appointments/${appointmentId}/rebook`)
    return data
  },

  async getTransactions(mode: UserMode = 'existing'): Promise<Transaction[]> {
    if (isMockApi) {
      await mockDelay(250)
      return mode === 'new' ? [] : MOCK_TRANSACTIONS
    }
    const { data } = await apiClient.get<Transaction[]>('/patient/transactions')
    return data
  },

  async getNotifications(mode: UserMode = 'existing'): Promise<Notification[]> {
    if (isMockApi) {
      await mockDelay(200)
      const base = mode === 'new'
        ? MOCK_NOTIFICATIONS.filter(n => n.type === 'system')
        : MOCK_NOTIFICATIONS
      return base.map(notification => ({
        ...notification,
        read: notification.read || mockReadNotificationIds.has(notification.id),
      }))
    }
    const { data } = await apiClient.get<Notification[]>('/patient/notifications')
    return data
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    if (isMockApi) {
      await mockDelay(100)
      mockReadNotificationIds.add(id)
      return { success: true }
    }
    const { data } = await apiClient.post<{ success: boolean }>(`/patient/notifications/${id}/read`)
    return data
  },

  async getNews(): Promise<NewsItem[]> {
    if (isMockApi) {
      await mockDelay(200)
      return MOCK_NEWS
    }
    const { data } = await apiClient.get<NewsItem[]>('/health/news')
    return data
  },

  async createAppointment(
    payload: CreateAppointmentPayload,
    mode: UserMode = 'existing',
  ): Promise<CreateAppointmentResult> {
    if (isMockApi) {
      await mockDelay(400)
      return {
        id: `BK-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        provider:
          MOCK_PROVIDERS.find(provider => provider.id === payload.providerId)?.name ??
          'Provider',
        status: 'pending',
        date: payload.date,
        time: payload.time,
        service: payload.selectedServices?.[0] ?? 'General Consultation',
        for: payload.forSelf
          ? 'Self'
          : MOCK_BENEFICIARIES.find(
              beneficiary => beneficiary.id === payload.beneficiaryId,
            )?.name ?? 'Beneficiary',
        message:
          mode === 'new'
            ? 'Appointment request created successfully.'
            : 'Appointment request created successfully.',
      }
    }

    const { data } = await apiClient.post<CreateAppointmentResult>(
      '/patient/appointments',
      payload,
    )
    return data
  },

  async confirmRescheduledAppointment(
    appointmentId: string,
    mode: UserMode = 'existing',
  ): Promise<Appointment> {
    if (isMockApi) {
      await mockDelay(300)
      const existing = [...buildAppointments(mode).upcoming, ...buildAppointments(mode).past].find(
        appointment => appointment.id === appointmentId,
      )
      if (!existing) throw new Error('Appointment not found')
      return { ...existing, status: 'confirmed', rescheduledAt: null }
    }

    const { data } = await apiClient.patch<Appointment>(
      `/patient/appointments/${appointmentId}/confirm-reschedule`,
    )
    return data
  },

  async cancelAppointment(
    appointmentId: string,
    payload: CancelPatientAppointmentPayload,
    mode: UserMode = 'existing',
  ): Promise<Appointment> {
    if (isMockApi) {
      await mockDelay(300)
      const existing =
        [...buildAppointments(mode).upcoming, ...buildAppointments(mode).past].find(
          appointment => appointment.id === appointmentId,
        )

      if (!existing) {
        throw new Error('Appointment not found')
      }

      return {
        ...existing,
        status: 'cancelled',
      }
    }

    const { data } = await apiClient.patch<Appointment>(
      `/patient/appointments/${appointmentId}/cancel`,
      payload,
    )
    return data
  },

  async setupPaymentPin(
    payload: SetupPaymentPinPayload,
  ): Promise<SetupPaymentPinResult> {
    if (isMockApi) {
      await mockDelay(250)
      return {
        configured: true,
        message: payload.currentPin
          ? 'Payment PIN updated successfully.'
          : 'Payment PIN created successfully.',
      }
    }

    const { data } = await apiClient.post<SetupPaymentPinResult>(
      '/patient/security/payment-pin',
      payload,
    )
    return data
  },

  async changePassword(
    payload: ChangePatientPasswordPayload,
  ): Promise<ChangePatientPasswordResult> {
    if (isMockApi) {
      await mockDelay(250)
      if (payload.newPassword !== payload.confirmPassword) {
        throw new Error('New password confirmation does not match')
      }
      if (payload.newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters')
      }
      if (!payload.currentPassword.trim()) {
        throw new Error('Current password is required')
      }
      return { message: 'Password updated successfully.' }
    }

    const { data } = await apiClient.patch<ChangePatientPasswordResult>(
      '/patient/security/password',
      payload,
    )
    return data
  },

  async addBeneficiary(
    payload: UpsertBeneficiaryPayload,
    mode: UserMode = 'existing',
  ): Promise<PatientProfileResponse> {
    if (isMockApi) {
      await mockDelay(250)
      const profile = buildProfile(mode)
      const beneficiary: Beneficiary = {
        id: `BEN-${Date.now()}`,
        name: payload.name,
        relation: payload.relation,
        dob: payload.dob,
        countryCode: payload.countryCode,
        nationalId: payload.nationalId ? `****${payload.nationalId.slice(-4)}` : '',
        age: payload.dob ? Math.floor((Date.now() - new Date(payload.dob).getTime()) / 31557600000) : 0,
      }
      return {
        ...profile,
        beneficiaries: [...profile.beneficiaries, beneficiary],
      }
    }

    const { data } = await apiClient.post<PatientProfileResponse>('/patient/beneficiaries', payload)
    return {
      ...data,
      user: normalizePatient(data.user),
    }
  },

  async updateBeneficiary(
    beneficiaryId: string,
    payload: UpsertBeneficiaryPayload,
    mode: UserMode = 'existing',
  ): Promise<PatientProfileResponse> {
    if (isMockApi) {
      await mockDelay(250)
      const profile = buildProfile(mode)
      return {
        ...profile,
        beneficiaries: profile.beneficiaries.map(beneficiary =>
          beneficiary.id === beneficiaryId
            ? {
                ...beneficiary,
                name: payload.name,
                relation: payload.relation,
                dob: payload.dob,
                countryCode: payload.countryCode,
                nationalId: payload.nationalId ? `****${payload.nationalId.slice(-4)}` : beneficiary.nationalId,
                age: payload.dob ? Math.floor((Date.now() - new Date(payload.dob).getTime()) / 31557600000) : beneficiary.age,
              }
            : beneficiary,
        ),
      }
    }

    const { data } = await apiClient.patch<PatientProfileResponse>(
      `/patient/beneficiaries/${beneficiaryId}`,
      payload,
    )
    return {
      ...data,
      user: normalizePatient(data.user),
    }
  },

  async deleteBeneficiary(
    beneficiaryId: string,
    mode: UserMode = 'existing',
  ): Promise<PatientProfileResponse> {
    if (isMockApi) {
      await mockDelay(250)
      const profile = buildProfile(mode)
      return {
        ...profile,
        beneficiaries: profile.beneficiaries.filter(beneficiary => beneficiary.id !== beneficiaryId),
      }
    }

    const { data } = await apiClient.delete<PatientProfileResponse>(`/patient/beneficiaries/${beneficiaryId}`)
    return {
      ...data,
      user: normalizePatient(data.user),
    }
  },

  async createPrescriptionRequest(
    payload: import('@/types/prescription.types').CreatePrescriptionRequestPayload,
  ): Promise<import('@/types/prescription.types').PrescriptionRequest> {
    if (isMockApi) {
      await mockDelay(400)
      const provider = MOCK_PROVIDERS.find(item => item.id === payload.providerId)
      const { addMockPrescriptionRequest } = await import('@/mock/prescription.mock')
      return addMockPrescriptionRequest({
        id: `RX-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        providerId: payload.providerId,
        provider: provider?.name ?? 'Pharmacy',
        status: 'submitted',
        fulfillmentMode: payload.fulfillmentMode ?? 'pickup',
        deliveryAddress: payload.deliveryAddress,
        patientNotes: payload.patientNotes,
        attachment: payload.attachment,
        forSelf: payload.forSelf,
        for: payload.forSelf ? 'Self' : 'Beneficiary',
        submittedAt: new Date().toISOString(),
        patient: 'Sarah Johnson',
        patientPhone: '+263 77 123 4567',
        patientEmail: 'sarah.j@email.com',
        countryCode: 'ZW',
      })
    }

    const { data } = await apiClient.post('/patient/prescription-requests', payload)
    return data
  },

  async getPrescriptionRequests(): Promise<import('@/types/prescription.types').PrescriptionRequest[]> {
    if (isMockApi) {
      await mockDelay(200)
      const { getMockPrescriptionRequestsForPatient } = await import('@/mock/prescription.mock')
      return getMockPrescriptionRequestsForPatient()
    }

    const { data } = await apiClient.get('/patient/prescription-requests')
    return data
  },

  async markPrescriptionQuoteReviewed(id: string): Promise<import('@/types/prescription.types').PrescriptionRequest> {
    if (isMockApi) {
      await mockDelay(150)
      const { updateMockPrescriptionRequest } = await import('@/mock/prescription.mock')
      const updated = updateMockPrescriptionRequest(id, {
        quoteReviewedAt: new Date().toISOString(),
      })
      if (!updated) throw new Error('Prescription request not found')
      return updated
    }

    const { data } = await apiClient.patch(`/patient/prescription-requests/${id}/review`)
    return data
  },

  async acceptPrescriptionQuote(id: string): Promise<import('@/types/prescription.types').PrescriptionRequest> {
    if (isMockApi) {
      await mockDelay(200)
      const { updateMockPrescriptionRequest } = await import('@/mock/prescription.mock')
      const updated = updateMockPrescriptionRequest(id, { status: 'accepted', acceptedAt: new Date().toISOString() })
      if (!updated) throw new Error('Prescription request not found')
      return updated
    }

    const { data } = await apiClient.patch(`/patient/prescription-requests/${id}/accept`)
    return data
  },

  async declinePrescriptionQuote(
    id: string,
    reason?: string,
  ): Promise<import('@/types/prescription.types').PrescriptionRequest> {
    if (isMockApi) {
      await mockDelay(200)
      const { updateMockPrescriptionRequest } = await import('@/mock/prescription.mock')
      const updated = updateMockPrescriptionRequest(id, {
        status: 'cancelled',
        declinedAt: new Date().toISOString(),
        declineReason: reason,
      })
      if (!updated) throw new Error('Prescription request not found')
      return updated
    }

    const { data } = await apiClient.patch(`/patient/prescription-requests/${id}/decline`, { reason })
    return data
  },
}
