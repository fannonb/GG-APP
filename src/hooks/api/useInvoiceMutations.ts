import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { patientService } from '@/api/services/patient.service'
import { invoicesService } from '@/api/services/invoices.service'
import type {
  AuthorizePaymentPayload,
  CreateAppointmentPayload,
  SetupPaymentPinPayload,
} from '@/api/types'
import { useAuthStore } from '@/store/auth.store'
import { useUserStore } from '@/store/user.store'

export function useAuthorizePaymentMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)
  const spMode = useAuthStore(s => s.spMode)

  return useMutation({
    mutationFn: (payload: AuthorizePaymentPayload) =>
      invoicesService.authorizePayment(payload),
    onSuccess: (_, payload) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.invoice(payload.invoiceId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.invoices(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.transactions(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.notifications(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.dashboard(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.profile(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: ['patient', 'credit'],
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.dashboard(spMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.invoices(spMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.payments(spMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.notifications(spMode),
      })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.notifications,
      })
    },
  })
}

export function useCreateAppointmentMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: (payload: CreateAppointmentPayload) =>
      patientService.createAppointment(payload, userMode),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.appointments(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.dashboard(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.notifications(userMode),
      })
    },
  })
}

export function useSetupPaymentPinMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)
  const completeOnboardingStep = useAuthStore(s => s.completeOnboardingStep)

  return useMutation({
    mutationFn: (payload: SetupPaymentPinPayload) =>
      patientService.setupPaymentPin(payload),
    onSuccess: () => {
      completeOnboardingStep(3)
      useUserStore.setState(state => ({
        user: {
          ...state.user,
          hasPaymentPin: true,
        },
      }))
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.profile(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.dashboard(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.notifications(userMode),
      })
    },
  })
}

export function useRejectInvoiceMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)
  const spMode = useAuthStore(s => s.spMode)

  return useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason: string }) =>
      invoicesService.rejectInvoice(invoiceId, reason),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.invoice(variables.invoiceId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.invoices(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.dashboard(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.dashboard(spMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.invoices(spMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.notifications(spMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.invoice(variables.invoiceId),
      })
    },
  })
}
