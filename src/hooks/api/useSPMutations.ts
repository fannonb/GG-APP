import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { spService } from '@/api/services/sp.service'
import type {
  ChangeProviderPasswordPayload,
  CreateProviderVisitPayload,
  ProviderNotificationPreferences,
  RescheduleSPAppointmentPayload,
  UpdateSPAppointmentStatusPayload,
  UpdateProviderProfilePayload,
  UpsertProviderPayoutAccountPayload,
  UpsertSPInvoicePayload,
} from '@/api/types'
import { useAuthStore } from '@/store/auth.store'

function useSPInvalidate() {
  const queryClient = useQueryClient()
  const spMode = useAuthStore(s => s.spMode)

  const invalidateCore = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.sp.dashboard(spMode) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.sp.appointments(spMode) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.sp.prescriptionRequests(spMode) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.sp.patients(spMode) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.sp.invoices(spMode) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.sp.payments(spMode) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.sp.notifications(spMode) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.sp.settings(spMode) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.sp.payoutAccounts(spMode) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.sp.sessions(spMode) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.sp.profile(spMode) })
    void queryClient.invalidateQueries({ queryKey: ['patient', 'providers'] })
    void queryClient.invalidateQueries({ queryKey: queryKeys.patient.dashboard(useAuthStore.getState().userMode) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.patient.appointments(useAuthStore.getState().userMode) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.patient.notifications(useAuthStore.getState().userMode) })
  }

  return { queryClient, spMode, invalidateCore }
}

export function useUpdateSPAppointmentStatusMutation() {
  const { queryClient, invalidateCore } = useSPInvalidate()
  const patientMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateSPAppointmentStatusPayload
    }) => spService.updateAppointmentStatus(id, payload),
    onSuccess: appointment => {
      invalidateCore()
      void queryClient.invalidateQueries({ queryKey: queryKeys.sp.appointment(appointment.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.dashboard(patientMode) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.appointments(patientMode) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.notifications(patientMode) })
    },
  })
}

export function useRescheduleSPAppointmentMutation() {
  const { queryClient, invalidateCore } = useSPInvalidate()
  const patientMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: RescheduleSPAppointmentPayload
    }) => spService.rescheduleAppointment(id, payload),
    onSuccess: appointment => {
      invalidateCore()
      void queryClient.invalidateQueries({ queryKey: queryKeys.sp.appointment(appointment.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.dashboard(patientMode) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.appointments(patientMode) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.notifications(patientMode) })
    },
  })
}

export function useCreateSPInvoiceMutation() {
  const { queryClient, invalidateCore } = useSPInvalidate()
  const patientMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: (payload: UpsertSPInvoicePayload) => spService.createInvoice(payload),
    onSuccess: invoice => {
      invalidateCore()
      void queryClient.invalidateQueries({ queryKey: queryKeys.sp.invoice(invoice.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sp.invoiceAttachment(invoice.id) })
      if (invoice.appointmentId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.sp.appointment(invoice.appointmentId) })
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.dashboard(patientMode) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.appointments(patientMode) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.invoices(patientMode) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.notifications(patientMode) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.prescriptionRequests(patientMode) })
    },
  })
}

export function useUpdateSPInvoiceMutation() {
  const { queryClient, invalidateCore } = useSPInvalidate()
  const patientMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpsertSPInvoicePayload }) =>
      spService.updateInvoice(id, payload),
    onSuccess: invoice => {
      invalidateCore()
      void queryClient.invalidateQueries({ queryKey: queryKeys.sp.invoice(invoice.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sp.invoiceAttachment(invoice.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.invoice(invoice.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.invoiceAttachment(invoice.id) })
      if (invoice.appointmentId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.sp.appointment(invoice.appointmentId) })
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.dashboard(patientMode) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.appointments(patientMode) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.invoices(patientMode) })
    },
  })
}

export function useCreateSPVisitMutation() {
  const { queryClient, invalidateCore } = useSPInvalidate()
  const patientMode = useAuthStore(s => s.userMode)
  return useMutation({
    mutationFn: (payload: CreateProviderVisitPayload) => spService.createVisit(payload),
    onSuccess: (_visit, payload) => {
      invalidateCore()
      if (payload.appointmentId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.sp.appointment(payload.appointmentId) })
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.dashboard(patientMode) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.appointments(patientMode) })
    },
  })
}

export function useUpdateSPProfileMutation() {
  const { invalidateCore } = useSPInvalidate()
  return useMutation({
    mutationFn: (payload: UpdateProviderProfilePayload) => spService.updateProfile(payload),
    onSuccess: () => invalidateCore(),
  })
}

export function useUpdateSPNotificationPrefsMutation() {
  const { invalidateCore } = useSPInvalidate()
  return useMutation({
    mutationFn: (payload: ProviderNotificationPreferences) =>
      spService.updateNotificationPreferences(payload),
    onSuccess: () => invalidateCore(),
  })
}

export function useChangeSPPasswordMutation() {
  return useMutation({
    mutationFn: (payload: ChangeProviderPasswordPayload) => spService.changePassword(payload),
  })
}

export function useCreateSPPayoutAccountMutation() {
  const { invalidateCore } = useSPInvalidate()
  return useMutation({
    mutationFn: (payload: UpsertProviderPayoutAccountPayload) =>
      spService.createPayoutAccount(payload),
    onSuccess: () => invalidateCore(),
  })
}

export function useUpdateSPPayoutAccountMutation() {
  const { invalidateCore } = useSPInvalidate()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpsertProviderPayoutAccountPayload
    }) => spService.updatePayoutAccount(id, payload),
    onSuccess: () => invalidateCore(),
  })
}

export function useSetDefaultSPPayoutAccountMutation() {
  const { invalidateCore } = useSPInvalidate()
  return useMutation({
    mutationFn: (id: string) => spService.setDefaultPayoutAccount(id),
    onSuccess: () => invalidateCore(),
  })
}

export function useDeleteSPPayoutAccountMutation() {
  const { invalidateCore } = useSPInvalidate()
  return useMutation({
    mutationFn: (id: string) => spService.deletePayoutAccount(id),
    onSuccess: () => invalidateCore(),
  })
}

export function useRevokeSPSessionMutation() {
  const { invalidateCore } = useSPInvalidate()
  return useMutation({
    mutationFn: (id: string) => spService.revokeSession(id),
    onSuccess: () => invalidateCore(),
  })
}

export function useMarkSPNotificationReadMutation() {
  const queryClient = useQueryClient()
  const spMode = useAuthStore(s => s.spMode)

  return useMutation({
    mutationFn: (id: string) => spService.markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sp.notifications(spMode) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sp.dashboard(spMode) })
    },
  })
}

export function useQuotePrescriptionRequestMutation() {
  const { queryClient, spMode, invalidateCore } = useSPInvalidate()
  const patientMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: import('@/types/prescription.types').QuotePrescriptionRequestPayload
    }) => spService.quotePrescriptionRequest(id, payload, spMode),
    onSuccess: request => {
      queryClient.setQueryData(queryKeys.sp.prescriptionRequest(request.id), request)
      invalidateCore()
      void queryClient.invalidateQueries({ queryKey: queryKeys.sp.prescriptionRequest(request.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.notifications(patientMode) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.prescriptionRequests(patientMode) })
    },
  })
}

export function useRejectPrescriptionRequestMutation() {
  const { queryClient, spMode, invalidateCore } = useSPInvalidate()
  const patientMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: import('@/types/prescription.types').RejectPrescriptionRequestPayload
    }) => spService.rejectPrescriptionRequest(id, payload, spMode),
    onSuccess: request => {
      invalidateCore()
      void queryClient.invalidateQueries({ queryKey: queryKeys.sp.prescriptionRequest(request.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.notifications(patientMode) })
    },
  })
}

export function useMarkPrescriptionReadyMutation() {
  const { queryClient, spMode, invalidateCore } = useSPInvalidate()
  const patientMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: (id: string) => spService.markPrescriptionReady(id, spMode),
    onSuccess: request => {
      invalidateCore()
      void queryClient.invalidateQueries({ queryKey: queryKeys.sp.prescriptionRequest(request.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.notifications(patientMode) })
    },
  })
}

export function useFulfillPrescriptionRequestMutation() {
  const { queryClient, spMode, invalidateCore } = useSPInvalidate()
  const patientMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: (id: string) => spService.fulfillPrescriptionRequest(id, spMode),
    onSuccess: request => {
      invalidateCore()
      void queryClient.invalidateQueries({ queryKey: queryKeys.sp.prescriptionRequest(request.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.notifications(patientMode) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.patient.invoices(patientMode) })
    },
  })
}
