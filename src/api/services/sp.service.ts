import { isMockApi } from '@/api/config'
import { apiClient } from '@/api/client'
import { mockDelay } from '@/api/mock/delay'
import { generateRef } from '@/utils/refgen'
import type {
  ChangeProviderPasswordPayload,
  CreateProviderVisitPayload,
  CreateProviderVisitResponse,
  DeleteProviderPayoutAccountResponse,
  ProviderNotificationPreferences,
  ProviderPasswordChangeResponse,
  ProviderPayoutAccount,
  ProviderProfileResponse,
  ProviderSessionInfo,
  ProviderSessionRevokeResponse,
  ProviderSettingsResponse,
  ProviderVisitRecord,
  RescheduleSPAppointmentPayload,
  UpdateSPAppointmentStatusPayload,
  UpdateProviderProfilePayload,
  UpsertProviderPayoutAccountPayload,
  UpsertSPInvoicePayload,
} from '@/api/types'
import type { UserMode } from '@/store/auth.store'
import { getSpProfileCompletionFromProfile } from '@/utils/sp-profile-completion'
import { computeSpOnboardingProgress } from '@/utils/sp-onboarding'

const INVOICE_UPLOAD_TIMEOUT_MS = 120_000

function prepareInvoicePayload(payload: UpsertSPInvoicePayload): Omit<UpsertSPInvoicePayload, 'attachmentBlobUrl'> {
  const { attachmentBlobUrl, attachment, ...rest } = payload
  const dataUrl = attachment?.dataUrl ?? attachmentBlobUrl

  return {
    ...rest,
    attachment: attachment
      ? {
          ...attachment,
          dataUrl,
        }
      : undefined,
  }
}
import type { Appointment, SPPatient } from '@/types/appointment.types'
import type { Payment, SPInvoice, InvoiceAttachment } from '@/types/invoice.types'
import type { Notification } from '@/types/user.types'
import {
  MOCK_SP,
  MOCK_SP_NEW,
  MOCK_SP_APPOINTMENTS,
  MOCK_SP_INVOICES,
  MOCK_SP_NEW_NOTIFICATIONS,
  MOCK_SP_NOTIFICATIONS,
  MOCK_SP_PATIENTS,
  MOCK_SP_PAYMENTS,
} from '@/mock/sp.mock'

import type { SpOnboardingProgress } from '@/utils/sp-onboarding'
import type { PrescriptionRequest, QuotePrescriptionRequestPayload } from '@/types/prescription.types'

export interface SPDashboardData {
  sp: typeof MOCK_SP & {
    category?: string
    categories?: string[]
    isPharmacy?: boolean
    pendingPrescriptionRequests?: number
  }
  isPharmacy?: boolean
  isPharmacyOnly?: boolean
  appointments: Appointment[]
  prescriptionRequests?: PrescriptionRequest[]
  patients: SPPatient[]
  payments: Payment[]
  invoices: SPInvoice[]
  notifications: Notification[]
  onboarding?: SpOnboardingProgress
}

function buildSPDashboard(mode: UserMode): SPDashboardData {
  const isNew = mode === 'new'
  const appointments = isNew ? [] : MOCK_SP_APPOINTMENTS
  const invoices = isNew ? [] : MOCK_SP_INVOICES
  const profile = buildMockProfile(mode)
  const payoutAccounts = buildMockSettings(mode).payoutAccounts
  const profileCompletion = getSpProfileCompletionFromProfile(profile, payoutAccounts)
  const onboarding = computeSpOnboardingProgress({
    settings: {
      profile,
      payoutAccounts,
    } as ProviderSettingsResponse,
    appointmentCount: appointments.length,
    invoiceCount: invoices.length,
  })!

  return {
    sp: {
      ...(isNew ? MOCK_SP_NEW : MOCK_SP),
      category: profile.category,
      categories: [profile.category],
      isPharmacy: profile.category.toLowerCase().includes('pharmacy'),
      pendingPrescriptionRequests: 0,
    },
    isPharmacy: profile.category.toLowerCase().includes('pharmacy'),
    isPharmacyOnly: profile.isPharmacyOnly,
    appointments,
    prescriptionRequests: [],
    patients: isNew ? [] : MOCK_SP_PATIENTS,
    payments: isNew ? [] : MOCK_SP_PAYMENTS,
    invoices,
    notifications: isNew ? MOCK_SP_NEW_NOTIFICATIONS : MOCK_SP_NOTIFICATIONS,
    onboarding: onboarding ?? {
      completedSteps: profileCompletion.isComplete ? [1, 2, 3] : [1, 2],
      isComplete: false,
      profileComplete: profileCompletion.isComplete,
      profilePendingLabels: profileCompletion.pendingLabels,
      hasFirstAppointment: appointments.length > 0,
      hasFirstInvoice: invoices.length > 0,
    },
  }
}

function buildMockProfile(mode: UserMode = 'existing'): ProviderProfileResponse {
  const dashboard = buildSPDashboard(mode)

  if (mode === 'new') {
    return {
      id: 1,
      name: dashboard.sp.name,
      email: dashboard.sp.email,
      phone: '',
      category: '',
      isPharmacyOnly: false,
      about: '',
      address: '',
      country: dashboard.sp.country,
      status: 'closed',
      verified: true,
      languages: [],
      tags: [],
      establishedYear: null,
      lat: null,
      lng: null,
      openingHours: {
        Mon: { open: false, from: '08:00', to: '17:00' },
        Tue: { open: false, from: '08:00', to: '17:00' },
        Wed: { open: false, from: '08:00', to: '17:00' },
        Thu: { open: false, from: '08:00', to: '17:00' },
        Fri: { open: false, from: '08:00', to: '17:00' },
        Sat: { open: false, from: '08:00', to: '13:00' },
        Sun: { open: false, from: '', to: '' },
      },
      license: dashboard.sp.license,
    }
  }

  return {
    id: 1,
    name: dashboard.sp.name,
    email: dashboard.sp.email,
    phone: dashboard.sp.phone,
    category: dashboard.sp.type,
    isPharmacyOnly: false,
    about:
      'City Medical Centre is a multi-disciplinary outpatient facility serving Harare with evidence-based primary care.',
    address: '12 Samora Machel Avenue, Harare',
    country: dashboard.sp.country,
    status: 'open',
    verified: true,
    languages: ['English', 'Shona'],
    tags: ['General Practice', 'Paediatrics', 'Minor Surgery'],
    establishedYear: 2009,
    lat: -17.8292,
    lng: 31.0522,
    openingHours: {
      Mon: { open: true, from: '08:00', to: '17:00' },
      Tue: { open: true, from: '08:00', to: '17:00' },
      Wed: { open: true, from: '08:00', to: '17:00' },
      Thu: { open: true, from: '08:00', to: '17:00' },
      Fri: { open: true, from: '08:00', to: '17:00' },
      Sat: { open: true, from: '08:00', to: '13:00' },
      Sun: { open: false, from: '', to: '' },
    },
    license: dashboard.sp.license,
  }
}

function buildMockSettings(mode: UserMode = 'existing'): ProviderSettingsResponse {
  return {
    profile: buildMockProfile(mode),
    notificationPreferences: {
      newAppointmentEmail: true,
      paymentEmail: true,
      invoiceEmail: true,
      disputeEmail: true,
      systemEmail: false,
    },
    payoutAccounts: mode === 'new'
      ? []
      : [
          {
            id: 'mock-payout-1',
            method: 'bank',
            accountNumber: '9180012345678',
            accountName: 'City Medical Centre',
            country: 'Zimbabwe',
            isDefault: true,
            status: 'active',
          },
        ],
    sessions: [
      {
        id: 'mock-session-1',
        sessionId: 'mock-session-1',
        device: 'Provider portal session',
        location: 'Harare, ZW',
        active: true,
        time: 'Active now',
        lastSeenAt: new Date().toISOString(),
      },
    ],
  }
}

export const spService = {
  getDashboardMock: buildSPDashboard,

  async getDashboard(mode: UserMode = 'existing'): Promise<SPDashboardData> {
    if (isMockApi) {
      await mockDelay(300)
      const dashboard = buildSPDashboard(mode)
      const { getMockPrescriptionRequests } = await import('@/mock/prescription.mock')
      const prescriptionRequests = getMockPrescriptionRequests()
      return {
        ...dashboard,
        prescriptionRequests,
        sp: {
          ...dashboard.sp,
          pendingPrescriptionRequests: prescriptionRequests.filter(
            request => request.status === 'submitted' || request.status === 'quoted' || request.status === 'ready',
          ).length,
        },
      }
    }
    const { data } = await apiClient.get<SPDashboardData>('/sp/dashboard')
    return data
  },

  async getAppointments(mode: UserMode = 'existing'): Promise<Appointment[]> {
    if (isMockApi) {
      await mockDelay(200)
      return mode === 'new' ? [] : MOCK_SP_APPOINTMENTS
    }
    const { data } = await apiClient.get<Appointment[]>('/sp/appointments')
    return data
  },

  async getAppointment(id: string, mode: UserMode = 'existing'): Promise<Appointment | null> {
    if (isMockApi) {
      await mockDelay(200)
      if (mode === 'new') return null
      return MOCK_SP_APPOINTMENTS.find(a => a.id === id) ?? null
    }
    const { data } = await apiClient.get<Appointment>(`/sp/appointments/${id}`)
    return data
  },

  async updateAppointmentStatus(
    id: string,
    payload: UpdateSPAppointmentStatusPayload,
  ): Promise<Appointment> {
    if (isMockApi) {
      await mockDelay(200)
      const appointment = MOCK_SP_APPOINTMENTS.find(item => item.id === id)
      if (!appointment) {
        throw new Error('Appointment not found')
      }

      return {
        ...appointment,
        status: payload.status === 'confirmed' ? 'confirmed' : 'cancelled',
      }
    }

    const { data } = await apiClient.patch<Appointment>(
      `/sp/appointments/${id}/status`,
      payload,
    )
    return data
  },

  async rescheduleAppointment(
    id: string,
    payload: RescheduleSPAppointmentPayload,
  ): Promise<Appointment> {
    if (isMockApi) {
      await mockDelay(200)
      const appointment = MOCK_SP_APPOINTMENTS.find(item => item.id === id)
      if (!appointment) {
        throw new Error('Appointment not found')
      }

      return {
        ...appointment,
        date: payload.date,
        time: payload.time,
        status: 'new',
      }
    }

    const { data } = await apiClient.patch<Appointment>(
      `/sp/appointments/${id}/reschedule`,
      payload,
    )
    return data
  },

  async getPatients(mode: UserMode = 'existing'): Promise<SPPatient[]> {
    if (isMockApi) {
      await mockDelay(200)
      return mode === 'new' ? [] : MOCK_SP_PATIENTS
    }
    const { data } = await apiClient.get<SPPatient[]>('/sp/patients')
    return data
  },

  async getPatient(id: string, mode: UserMode = 'existing'): Promise<SPPatient | null> {
    if (isMockApi) {
      await mockDelay(200)
      if (mode === 'new') return null
      return MOCK_SP_PATIENTS.find(p => p.id === id) ?? null
    }
    const { data } = await apiClient.get<SPPatient>(`/sp/patients/${id}`)
    return data
  },

  async createVisit(payload: CreateProviderVisitPayload): Promise<CreateProviderVisitResponse> {
    if (isMockApi) {
      await mockDelay(300)
      return {
        id: `visit-${Date.now()}`,
        patientId: payload.patientId,
        appointmentId: payload.appointmentId ?? null,
        beneficiaryId: payload.beneficiaryId ?? null,
        diagnosis: payload.diagnosis ?? null,
        treatment: payload.treatment ?? null,
        followUp: payload.followUp ?? null,
        internalNote: payload.internalNote ?? null,
        services: payload.services ?? [],
        vitals: payload.vitals,
        createdAt: new Date().toISOString(),
      }
    }
    const { data } = await apiClient.post<CreateProviderVisitResponse>('/sp/visits', payload)
    return data
  },

  async getVisits(patientId?: string): Promise<ProviderVisitRecord[]> {
    if (isMockApi) {
      await mockDelay(200)
      return []
    }
    const { data } = await apiClient.get<ProviderVisitRecord[]>('/sp/visits', {
      params: patientId ? { patientId } : undefined,
    })
    return data
  },

  async getInvoices(mode: UserMode = 'existing'): Promise<SPInvoice[]> {
    if (isMockApi) {
      await mockDelay(200)
      return mode === 'new' ? [] : MOCK_SP_INVOICES
    }
    const { data } = await apiClient.get<SPInvoice[]>('/sp/invoices')
    return data
  },

  async getNextInvoiceReference(mode: UserMode = 'existing'): Promise<{ reference: string }> {
    if (isMockApi) {
      await mockDelay(100)
      return { reference: generateRef('INV') }
    }
    if (mode === 'new') {
      return { reference: generateRef('INV') }
    }
    const { data } = await apiClient.get<{ reference: string }>('/sp/invoices/next-reference')
    return data
  },

  async getInvoice(id: string, mode: UserMode = 'existing'): Promise<SPInvoice | null> {
    if (isMockApi) {
      await mockDelay(200)
      if (mode === 'new') return null
      return MOCK_SP_INVOICES.find(i => i.id === id) ?? null
    }
    const { data } = await apiClient.get<SPInvoice>(`/sp/invoices/${id}`)
    return data
  },

  async getInvoiceAttachment(id: string, mode: UserMode = 'existing'): Promise<InvoiceAttachment | null> {
    if (isMockApi) {
      await mockDelay(200)
      if (mode === 'new') return null
      const invoice = MOCK_SP_INVOICES.find(item => item.id === id)
      const url = invoice?.attachmentBlobUrl ?? invoice?.attachmentMetadata?.dataUrl
      if (!url) return null
      return {
        url,
        fileName: invoice?.attachment ?? `${id}.pdf`,
        mimeType: url.startsWith('data:image/') ? 'image/png' : 'application/pdf',
        sizeBytes: invoice?.attachmentMetadata?.sizeBytes ?? 0,
        displaySize: invoice?.attachmentMetadata?.displaySize ?? '',
      }
    }

    try {
      const { data } = await apiClient.get<InvoiceAttachment>(`/sp/invoices/${id}/attachment`, {
        timeout: 120_000,
      })
      return data
    } catch {
      return null
    }
  },

  async createInvoice(payload: UpsertSPInvoicePayload): Promise<SPInvoice> {
    if (isMockApi) {
      await mockDelay(400)
      const attachmentBlobUrl = payload.attachmentBlobUrl ?? payload.attachment?.dataUrl
      const inv: SPInvoice = {
        id: payload.invoiceNumber,
        appointmentId: payload.appointmentId,
        isPrescription: !!payload.prescriptionRequestId,
        patient: 'Sarah Johnson',
        patientId: 'P001',
        phone: '+263 77 123 4567',
        email: 'sarah@example.com',
        services: payload.lineItems?.length
          ? payload.lineItems.map(item => ({ name: item.name, amount: item.amount }))
          : payload.services.map((name, index, list) => {
              const base = Number((payload.amount / Math.max(list.length, 1)).toFixed(2))
              return {
                name,
                amount: index === 0
                  ? Number((payload.amount - base * (list.length - 1)).toFixed(2))
                  : base,
              }
            }),
        issueDate: new Date().toISOString(),
        amount: payload.amount,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        attachment: payload.attachment?.originalName ?? `${payload.invoiceNumber}.pdf`,
        attachmentBlobUrl,
        attachmentMetadata: payload.attachment
          ? { ...payload.attachment, dataUrl: payload.attachment.dataUrl ?? attachmentBlobUrl }
          : undefined,
        diagnosis: payload.diagnosis ?? '',
        treatment: payload.treatment ?? '',
        followUp: payload.followUp ?? '',
        internalNote: payload.internalNote ?? '',
      }
      MOCK_SP_INVOICES.unshift(inv)

      if (payload.prescriptionRequestId) {
        const { updateMockPrescriptionRequest } = await import('@/mock/prescription.mock')
        const { MOCK_NOTIFICATIONS } = await import('@/mock/patient.mock')
        updateMockPrescriptionRequest(payload.prescriptionRequestId, {
          invoiceId: inv.id,
          invoiceStatus: 'pending_auth',
        })
        MOCK_NOTIFICATIONS.unshift({
          id: `N-RX-INV-${Date.now()}`,
          type: 'invoice',
          title: 'Invoice Ready for Payment',
          body: `Your medication invoice from the pharmacy is ready. Review and approve preparation to proceed.`,
          time: new Date().toISOString(),
          read: false,
          screen: `/app/invoices/${inv.id}`,
        })
      }

      return inv
    }

    const sanitized = prepareInvoicePayload(payload)
    const { data } = await apiClient.post<SPInvoice>('/sp/invoices', sanitized, {
      timeout: INVOICE_UPLOAD_TIMEOUT_MS,
    })
    return data
  },

  async updateInvoice(id: string, payload: UpsertSPInvoicePayload): Promise<SPInvoice> {
    if (isMockApi) {
      await mockDelay(400)
      const attachmentBlobUrl = payload.attachmentBlobUrl ?? payload.attachment?.dataUrl
      const existingIdx = MOCK_SP_INVOICES.findIndex(i => i.id === id)
      const inv: SPInvoice = {
        id: payload.invoiceNumber,
        appointmentId: payload.appointmentId,
        isPrescription: !!payload.prescriptionRequestId || MOCK_SP_INVOICES[existingIdx]?.isPrescription,
        patient: 'Sarah Johnson',
        patientId: 'P001',
        phone: '+263 77 123 4567',
        email: 'sarah@example.com',
        services: payload.lineItems?.length
          ? payload.lineItems.map(item => ({ name: item.name, amount: item.amount }))
          : payload.services.map((name, index, list) => {
              const base = Number((payload.amount / Math.max(list.length, 1)).toFixed(2))
              return {
                name,
                amount: index === 0
                  ? Number((payload.amount - base * (list.length - 1)).toFixed(2))
                  : base,
              }
            }),
        issueDate: new Date().toISOString(),
        amount: payload.amount,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        attachment: payload.attachment?.originalName ?? `${payload.invoiceNumber}.pdf`,
        attachmentBlobUrl,
        attachmentMetadata: payload.attachment
          ? { ...payload.attachment, dataUrl: payload.attachment.dataUrl ?? attachmentBlobUrl }
          : undefined,
        diagnosis: payload.diagnosis ?? '',
        treatment: payload.treatment ?? '',
        followUp: payload.followUp ?? '',
        internalNote: payload.internalNote ?? '',
      }
      if (existingIdx !== -1) {
        MOCK_SP_INVOICES[existingIdx] = inv
      } else {
        MOCK_SP_INVOICES.unshift(inv)
      }
      return inv
    }

    const sanitized = prepareInvoicePayload(payload)
    const { data } = await apiClient.patch<SPInvoice>(`/sp/invoices/${id}`, sanitized, {
      timeout: INVOICE_UPLOAD_TIMEOUT_MS,
    })
    return data
  },

  async getPayments(mode: UserMode = 'existing'): Promise<Payment[]> {
    if (isMockApi) {
      await mockDelay(200)
      if (mode === 'new') return []
      return MOCK_SP_INVOICES.filter(
        invoice => invoice.status === 'authorized' || invoice.status === 'paid',
      ).map(invoice => ({
        id: invoice.paymentRef ?? `PAY-${invoice.id}`,
        patient: invoice.patient,
        amount: invoice.walletAmountPaid ?? invoice.amount,
        date: invoice.paidAt ?? invoice.adminApprovedAt ?? invoice.submittedAt,
        status: 'authorized' as const,
        ref: invoice.paymentRef ?? invoice.id,
        invoiceId: invoice.id,
        isPrescription: invoice.isPrescription,
      }))
    }
    const { data } = await apiClient.get<Payment[]>('/sp/payments')
    return data
  },

  async getNotifications(mode: UserMode = 'existing'): Promise<Notification[]> {
    if (isMockApi) {
      await mockDelay(200)
      return mode === 'new' ? MOCK_SP_NEW_NOTIFICATIONS : MOCK_SP_NOTIFICATIONS
    }
    const { data } = await apiClient.get<Notification[]>('/sp/notifications')
    return data
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    const { data } = await apiClient.post<{ success: boolean }>(`/sp/notifications/${id}/read`)
    return data
  },

  async getProfile(mode: UserMode = 'existing'): Promise<ProviderProfileResponse> {
    if (isMockApi) {
      await mockDelay(200)
      return buildMockProfile(mode)
    }
    const { data } = await apiClient.get<ProviderProfileResponse>('/sp/profile')
    return data
  },

  async updateProfile(payload: UpdateProviderProfilePayload): Promise<ProviderProfileResponse> {
    if (isMockApi) {
      await mockDelay(250)
      return {
        ...buildMockProfile(),
        ...payload,
      }
    }
    const { data } = await apiClient.patch<ProviderProfileResponse>('/sp/profile', payload)
    return data
  },

  async getSettings(mode: UserMode = 'existing'): Promise<ProviderSettingsResponse> {
    if (isMockApi) {
      await mockDelay(250)
      return buildMockSettings(mode)
    }
    const { data } = await apiClient.get<ProviderSettingsResponse>('/sp/settings')
    return data
  },

  async updateNotificationPreferences(
    payload: ProviderNotificationPreferences,
  ): Promise<ProviderNotificationPreferences> {
    if (isMockApi) {
      await mockDelay(250)
      return payload
    }
    const { data } = await apiClient.patch<ProviderNotificationPreferences>(
      '/sp/settings/notifications',
      payload,
    )
    return data
  },

  async changePassword(
    payload: ChangeProviderPasswordPayload,
  ): Promise<ProviderPasswordChangeResponse> {
    if (isMockApi) {
      await mockDelay(250)
      return { message: 'Password updated successfully.' }
    }
    const { data } = await apiClient.patch<ProviderPasswordChangeResponse>(
      '/sp/settings/security/password',
      payload,
    )
    return data
  },

  async getSessions(mode: UserMode = 'existing'): Promise<ProviderSessionInfo[]> {
    if (isMockApi) {
      await mockDelay(200)
      return buildMockSettings(mode).sessions
    }
    const { data } = await apiClient.get<ProviderSessionInfo[]>('/sp/settings/sessions')
    return data
  },

  async revokeSession(sessionId: string): Promise<ProviderSessionRevokeResponse> {
    if (isMockApi) {
      await mockDelay(200)
      return { message: 'Session revoked successfully.' }
    }
    const { data } = await apiClient.post<ProviderSessionRevokeResponse>(
      `/sp/settings/sessions/${sessionId}/revoke`,
    )
    return data
  },

  async getPayoutAccounts(mode: UserMode = 'existing'): Promise<ProviderPayoutAccount[]> {
    if (isMockApi) {
      await mockDelay(200)
      return buildMockSettings(mode).payoutAccounts
    }
    const { data } = await apiClient.get<ProviderPayoutAccount[]>('/sp/payout-accounts')
    return data
  },

  async createPayoutAccount(
    payload: UpsertProviderPayoutAccountPayload,
  ): Promise<ProviderPayoutAccount> {
    if (isMockApi) {
      await mockDelay(200)
      return {
        id: `mock-payout-${Date.now()}`,
        ...payload,
        isDefault: payload.isDefault ?? false,
        status: 'active',
      }
    }
    const { data } = await apiClient.post<ProviderPayoutAccount>('/sp/payout-accounts', payload)
    return data
  },

  async updatePayoutAccount(
    payoutAccountId: string,
    payload: UpsertProviderPayoutAccountPayload,
  ): Promise<ProviderPayoutAccount> {
    if (isMockApi) {
      await mockDelay(200)
      return {
        id: payoutAccountId,
        ...payload,
        isDefault: payload.isDefault ?? false,
        status: 'active',
      }
    }
    const { data } = await apiClient.patch<ProviderPayoutAccount>(
      `/sp/payout-accounts/${payoutAccountId}`,
      payload,
    )
    return data
  },

  async setDefaultPayoutAccount(payoutAccountId: string): Promise<ProviderPayoutAccount> {
    if (isMockApi) {
      await mockDelay(200)
      return {
        ...buildMockSettings().payoutAccounts[0],
        id: payoutAccountId,
        isDefault: true,
      }
    }
    const { data } = await apiClient.post<ProviderPayoutAccount>(
      `/sp/payout-accounts/${payoutAccountId}/set-default`,
    )
    return data
  },

  async deletePayoutAccount(
    payoutAccountId: string,
  ): Promise<DeleteProviderPayoutAccountResponse> {
    if (isMockApi) {
      await mockDelay(200)
      return { message: 'Payout account removed successfully.' }
    }
    const { data } = await apiClient.delete<DeleteProviderPayoutAccountResponse>(
      `/sp/payout-accounts/${payoutAccountId}`,
    )
    return data
  },

  async getPrescriptionRequests(_mode: UserMode = 'existing'): Promise<PrescriptionRequest[]> {
    if (isMockApi) {
      await mockDelay(200)
      const { getMockPrescriptionRequests } = await import('@/mock/prescription.mock')
      return getMockPrescriptionRequests()
    }

    const { data } = await apiClient.get<PrescriptionRequest[]>('/sp/prescription-requests')
    return data
  },

  async getPrescriptionRequest(id: string, _mode: UserMode = 'existing'): Promise<PrescriptionRequest> {
    if (isMockApi) {
      await mockDelay(200)
      const { getMockPrescriptionRequest } = await import('@/mock/prescription.mock')
      const request = getMockPrescriptionRequest(id)
      if (!request) throw new Error('Prescription request not found')
      return request
    }

    const { data } = await apiClient.get<PrescriptionRequest>(`/sp/prescription-requests/${id}`)
    return data
  },

  async quotePrescriptionRequest(
    id: string,
    payload: QuotePrescriptionRequestPayload,
    _mode: UserMode = 'existing',
  ): Promise<PrescriptionRequest> {
    if (isMockApi) {
      await mockDelay(300)
      const { updateMockPrescriptionRequest } = await import('@/mock/prescription.mock')
      const updated = updateMockPrescriptionRequest(id, {
        status: 'quoted',
        quotedItems: payload.items,
        quotedAmount: payload.amount,
        deliveryFee: payload.deliveryFee,
        pharmacyNotes: payload.pharmacyNotes,
        quotedAt: new Date().toISOString(),
      })
      if (!updated) throw new Error('Prescription request not found')

      const { MOCK_NOTIFICATIONS } = await import('@/mock/patient.mock')
      MOCK_NOTIFICATIONS.unshift({
        id: `N-RX-QUOTE-${Date.now()}`,
        type: 'prescription',
        title: 'Quote Ready',
        body: `${updated.provider ?? 'Your pharmacy'} sent pricing for your prescription. Review and accept or decline the quote to continue.`,
        time: new Date().toISOString(),
        read: false,
        screen: `/app/prescriptions/${updated.id}`,
      })

      return updated
    }

    const { data } = await apiClient.patch<PrescriptionRequest>(
      `/sp/prescription-requests/${id}/quote`,
      payload,
    )
    return data
  },

  async rejectPrescriptionRequest(
    id: string,
    payload: import('@/types/prescription.types').RejectPrescriptionRequestPayload,
    _mode: UserMode = 'existing',
  ): Promise<PrescriptionRequest> {
    if (isMockApi) {
      await mockDelay(300)
      const { updateMockPrescriptionRequest } = await import('@/mock/prescription.mock')
      const updated = updateMockPrescriptionRequest(id, {
        status: 'rejected',
        declinedAt: new Date().toISOString(),
        declineReason: payload.reason,
      })
      if (!updated) throw new Error('Prescription request not found')
      return updated
    }

    const { data } = await apiClient.patch<PrescriptionRequest>(
      `/sp/prescription-requests/${id}/reject`,
      payload,
    )
    return data
  },

  async markPrescriptionReady(id: string, _mode: UserMode = 'existing'): Promise<PrescriptionRequest> {
    if (isMockApi) {
      await mockDelay(250)
      const { updateMockPrescriptionRequest } = await import('@/mock/prescription.mock')
      const updated = updateMockPrescriptionRequest(id, {
        status: 'ready',
        readyAt: new Date().toISOString(),
      })
      if (!updated) throw new Error('Prescription request not found')
      return updated
    }

    const { data } = await apiClient.patch<PrescriptionRequest>(
      `/sp/prescription-requests/${id}/ready`,
    )
    return data
  },

  async fulfillPrescriptionRequest(
    id: string,
    _mode: UserMode = 'existing',
  ): Promise<PrescriptionRequest> {
    if (isMockApi) {
      await mockDelay(350)
      const { updateMockPrescriptionRequest } = await import('@/mock/prescription.mock')
      // Match backend: fulfill does not create an invoice — SP uploads it next.
      const updated = updateMockPrescriptionRequest(id, {
        status: 'fulfilled',
        fulfilledAt: new Date().toISOString(),
        invoiceId: undefined,
        invoiceStatus: undefined,
      })
      if (!updated) throw new Error('Prescription request not found')
      return updated
    }

    const { data } = await apiClient.patch<PrescriptionRequest>(
      `/sp/prescription-requests/${id}/fulfill`,
    )
    return data
  },
}
